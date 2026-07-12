import prisma from '../lib/prisma';

export class NudgeEngine {
  /**
   * Evaluates business rules against the database and populates the Nudge table.
   * Clears out old, non-dismissed nudges and generates fresh ones.
   */
  static async evaluateNudges(): Promise<void> {
    try {
      // Clear non-dismissed nudges to keep recommendations fresh
      await prisma.nudge.deleteMany({ where: { isDismissed: false } });

      const now = new Date();

      // Rule 1: No carbon transactions in the last 7 days for active departments
      const departments = await prisma.department.findMany({ where: { status: 'ACTIVE' } });
      const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

      for (const dept of departments) {
        const recentTxCount = await prisma.carbonTransaction.count({
          where: {
            departmentId: dept.id,
            date: { gte: sevenDaysAgo },
          },
        });

        if (recentTxCount === 0) {
          await prisma.nudge.create({
            data: {
              departmentId: dept.id,
              type: 'CARBON_MISSING',
              message: `🌿 ${dept.name} department has not logged any carbon transactions in the last 7 days. Keep tracking your impact!`,
            },
          });
        }
      }

      // Rule 2: No CSR activities in the last 14 days for a department
      const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
      for (const dept of departments) {
        const recentCsrCount = await prisma.employeeParticipation.count({
          where: {
            employee: { departmentId: dept.id },
            approvalStatus: 'APPROVED',
            completionDate: { gte: fourteenDaysAgo },
          },
        });

        if (recentCsrCount === 0) {
          await prisma.nudge.create({
            data: {
              departmentId: dept.id,
              type: 'CSR_MISSING',
              message: `🤝 No employee CSR activities completed in ${dept.name} recently. Consider joining the active Tree Planting drive!`,
            },
          });
        }
      }

      // Rule 3: Compliance issues overdue
      const overdueIssuesCount = await prisma.complianceIssue.count({
        where: {
          status: { in: ['OPEN', 'IN_PROGRESS'] },
          dueDate: { lt: now },
        },
      });

      if (overdueIssuesCount > 0) {
        await prisma.nudge.create({
          data: {
            type: 'COMPLIANCE_WARNING',
            message: `⚠️ WARNING: There are ${overdueIssuesCount} compliance issues currently overdue. The quarterly audit is approaching!`,
          },
        });
      }

      // Rule 4: Close to Badge Unlock
      const activeEmployees = await prisma.user.findMany({
        where: { role: 'EMPLOYEE', status: 'ACTIVE' },
        include: { badgeAwards: true },
      });

      const badges = await prisma.badge.findMany({
        where: { unlockRuleType: 'XP_THRESHOLD' },
      });

      for (const emp of activeEmployees) {
        const earnedBadgeIds = new Set(emp.badgeAwards.map((a) => a.badgeId));
        
        for (const badge of badges) {
          if (!earnedBadgeIds.has(badge.id)) {
            const xpDiff = badge.unlockRuleValue - emp.xp;
            if (xpDiff > 0 && xpDiff <= 50) {
              await prisma.nudge.create({
                data: {
                  type: 'XP_BOOST',
                  message: `🔥 ${emp.name} is only ${xpDiff} XP away from unlocking the "${badge.name}" badge (${badge.icon})! Complete a challenge to push them over.`,
                },
              });
            }
          }
        }
      }

      console.log('[NudgeEngine] Behavioral nudges evaluated and generated successfully.');
    } catch (error) {
      console.error('[NudgeEngine] Error evaluating nudges:', error);
    }
  }
}
export default NudgeEngine;
