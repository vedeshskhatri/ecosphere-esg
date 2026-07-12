import prisma from '../lib/prisma';
import { emitToAll } from '../socket/eventBus';

export interface DeptScoreResult {
  departmentId: string;
  envScore: number;
  socialScore: number;
  govScore: number;
  totalScore: number;
}

/**
 * Service to calculate department and org-wide ESG scores.
 */
export class ScoringEngine {
  /**
   * Calculates the ESG scores for a single department and upserts the result.
   */
  static async calculateDepartmentScore(departmentId: string): Promise<DeptScoreResult> {
    try {
      // 1. ENVIRONMENTAL SCORE (0-100)
      // Based on Environmental Goals progress: Average of (1 - currentCo2 / targetCo2) * 100
      const goals = await prisma.environmentalGoal.findMany({
        where: { departmentId },
      });

      let envScore = 50; // default if no goals
      if (goals.length > 0) {
        let totalEnvProgress = 0;
        for (const goal of goals) {
          const target = Number(goal.targetCo2);
          const current = Number(goal.currentCo2);
          
          if (target > 0) {
            // progress is better if current is lower than target (reduction goal)
            const progress = (1 - (current / target)) * 100;
            // clamp progress to [0, 100]
            totalEnvProgress += Math.max(0, Math.min(100, progress));
          } else {
            totalEnvProgress += 100;
          }
        }
        envScore = totalEnvProgress / goals.length;
      }

      // 2. SOCIAL SCORE (0-100)
      // CSR activities participation rate: (approved participations / employee count) * 100
      const employeeCount = await prisma.user.count({
        where: { departmentId, role: 'EMPLOYEE', status: 'ACTIVE' },
      });

      const approvedParticipations = await prisma.employeeParticipation.count({
        where: {
          approvalStatus: 'APPROVED',
          employee: { departmentId },
        },
      });

      let socialScore = 50; // default if no employees
      if (employeeCount > 0) {
        const rate = (approvedParticipations / employeeCount) * 100;
        socialScore = Math.min(100, rate);
      }

      // 3. GOVERNANCE SCORE (0-100)
      // Issues resolution (60%) + Policy acknowledgements (40%)
      const issues = await prisma.complianceIssue.findMany({
        where: {
          OR: [
            { audit: { departmentId } },
            { owner: { departmentId } },
          ],
        },
      });

      const acks = await prisma.policyAcknowledgement.findMany({
        where: {
          OR: [
            { policy: { departmentId } },
            { employee: { departmentId } },
          ],
        },
      });

      let govScore = 50; // default if no data
      
      const totalIssues = issues.length;
      const resolvedIssues = issues.filter(issue => issue.status === 'RESOLVED').length;
      
      const totalAcks = acks.length;
      const resolvedAcks = acks.filter(ack => ack.status === 'ACKNOWLEDGED').length;

      if (totalIssues > 0 && totalAcks > 0) {
        const issueScore = (resolvedIssues / totalIssues) * 100;
        const ackScore = (resolvedAcks / totalAcks) * 100;
        govScore = (issueScore * 0.6) + (ackScore * 0.4);
      } else if (totalIssues > 0) {
        govScore = (resolvedIssues / totalIssues) * 100;
      } else if (totalAcks > 0) {
        govScore = (resolvedAcks / totalAcks) * 100;
      }

      // 4. WEIGHTED TOTAL SCORE
      // Fetch weights from esg_settings
      let settings = await prisma.esgSettings.findFirst();
      if (!settings) {
        settings = {
          id: 'default',
          envWeight: 40,
          socialWeight: 30,
          govWeight: 30,
          autoBadgeAward: true,
          evidenceRequired: true,
          autoEmissionCalc: false,
          emailAlerts: false,
          updatedAt: new Date(),
        };
      }

      const totalScore =
        (envScore * settings.envWeight +
          socialScore * settings.socialWeight +
          govScore * settings.govWeight) /
        100;

      // 5. UPSERT RESULT
      await prisma.departmentScore.create({
        data: {
          departmentId,
          envScore: Math.round(envScore * 100) / 100,
          socialScore: Math.round(socialScore * 100) / 100,
          govScore: Math.round(govScore * 100) / 100,
          totalScore: Math.round(totalScore * 100) / 100,
        },
      });

      return {
        departmentId,
        envScore,
        socialScore,
        govScore,
        totalScore,
      };
    } catch (error) {
      console.error(`[ScoringEngine] Error calculating score for dept ${departmentId}:`, error);
      throw error;
    }
  }

  /**
   * Calculates the overall organization ESG score (average of latest department scores).
   */
  static async calculateOrgScore(): Promise<number> {
    try {
      const departments = await prisma.department.findMany({
        where: { status: 'ACTIVE' },
        select: { id: true },
      });

      if (departments.length === 0) return 50;

      let totalScoreSum = 0;
      let count = 0;

      for (const dept of departments) {
        const latestScore = await prisma.departmentScore.findFirst({
          where: { departmentId: dept.id },
          orderBy: { calculatedAt: 'desc' },
        });

        if (latestScore) {
          totalScoreSum += Number(latestScore.totalScore);
          count++;
        }
      }

      return count > 0 ? totalScoreSum / count : 50;
    } catch (error) {
      console.error('[ScoringEngine] Error calculating org ESG score:', error);
      return 50;
    }
  }

  /**
   * Recalculates department & org scores, updates DB, and emits live updates over Socket.IO.
   */
  static async recalculateAndEmit(departmentId: string): Promise<void> {
    try {
      const deptScores = await this.calculateDepartmentScore(departmentId);
      const orgScore = await this.calculateOrgScore();

      emitToAll('score:update', {
        departmentId,
        scores: deptScores,
        orgScore,
      });

      console.log(`[ScoringEngine] Recalculated ESG Scores - Dept ${departmentId}: ${deptScores.totalScore}, Org Total: ${orgScore}`);
    } catch (error) {
      console.error(`[ScoringEngine] Error in recalculateAndEmit for dept ${departmentId}:`, error);
    }
  }
}
export default ScoringEngine;
