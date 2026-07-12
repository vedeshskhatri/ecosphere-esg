import { Router } from 'express';
import prisma from '../lib/prisma';
import { requireAuth } from '../middleware/auth';
import { ScoringEngine } from '../services/ScoringEngine';

const router = Router();

// GET /api/dashboard - Aggregate dashboard analytics
router.get('/', requireAuth, async (req, res) => {
  try {
    // 1. Organization Scores
    const orgScores = await ScoringEngine.calculateOrgScores();

    // 2. Department Scores
    const departments = await prisma.department.findMany({
      where: { status: 'ACTIVE' },
      select: { id: true, name: true, code: true, employeeCount: true },
    });

    const departmentScores = await Promise.all(
      departments.map(async (dept) => {
        const latestScore = await prisma.departmentScore.findFirst({
          where: { departmentId: dept.id },
          orderBy: { calculatedAt: 'desc' },
        });

        return {
          id: dept.id,
          name: dept.name,
          code: dept.code,
          employeeCount: dept.employeeCount,
          envScore: latestScore ? Number(latestScore.envScore) : 50,
          socialScore: latestScore ? Number(latestScore.socialScore) : 50,
          govScore: latestScore ? Number(latestScore.govScore) : 50,
          totalScore: latestScore ? Number(latestScore.totalScore) : 50,
        };
      })
    );

    // 3. Impact Metrics (Real-World Impact Translator)
    const co2SavedRes = await prisma.carbonTransaction.aggregate({
      _sum: { co2Kg: true },
    });
    const co2SavedKg = Math.round(Number(co2SavedRes._sum.co2Kg || 0));

    // Fetch conversion factors
    const factors = await prisma.conversionFactor.findMany();
    const treesFactor = factors.find(f => f.metricType === 'TREES_PLANTED')?.value || 0.012;
    const flightsFactor = factors.find(f => f.metricType === 'FLIGHTS_AVOIDED')?.value || 0.005;

    const treesSaved = Math.round(co2SavedKg * Number(treesFactor));
    const flightsAvoided = Math.round(co2SavedKg * Number(flightsFactor));

    // Calculate CSR hours completed (approvals count * 2 hours each)
    const approvedCsrCount = await prisma.employeeParticipation.count({
      where: { approvalStatus: 'APPROVED' },
    });
    const csrHours = approvedCsrCount * 2;
    const librariesFunded = Math.round(csrHours / 50);

    // 4. Live Feed (combined recent events)
    const recentBadges = await prisma.badgeAward.findMany({
      take: 5,
      orderBy: { awardedAt: 'desc' },
      include: {
        badge: { select: { name: true, icon: true } },
        employee: { select: { name: true } },
      },
    });

    const recentRedemptions = await prisma.rewardRedemption.findMany({
      take: 5,
      orderBy: { redeemedAt: 'desc' },
      include: {
        reward: { select: { name: true } },
        employee: { select: { name: true } },
      },
    });

    const recentIssues = await prisma.complianceIssue.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      include: {
        owner: { select: { name: true } },
      },
    });

    const liveFeed: any[] = [];
    recentBadges.forEach(b => {
      liveFeed.push({
        type: 'BADGE_UNLOCKED',
        message: `${b.employee.name} unlocked badge ${b.badge.icon} ${b.badge.name}!`,
        timestamp: b.awardedAt,
      });
    });
    recentRedemptions.forEach(r => {
      liveFeed.push({
        type: 'REWARD_REDEEMED',
        message: `${r.employee.name} redeemed reward: "${r.reward.name}"`,
        timestamp: r.redeemedAt,
      });
    });
    recentIssues.forEach(i => {
      liveFeed.push({
        type: 'COMPLIANCE_ISSUE_RAISED',
        message: `New compliance issue raised and assigned to ${i.owner.name}`,
        timestamp: i.createdAt,
      });
    });

    liveFeed.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    // 5. Smart Insights (Carbon Anomalies Spikes)
    // Check Manufacturing & Logistics for current month spikes compared to previous 3 months
    const now = new Date();
    const startOfCurrentMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfThreeMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 3, 1);

    const smartInsights: { type: string; title: string; message: string; severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' }[] = [];

    for (const dept of departments) {
      // Current month emissions
      const currentMonthEmissionsRes = await prisma.carbonTransaction.aggregate({
        where: {
          departmentId: dept.id,
          date: { gte: startOfCurrentMonth },
        },
        _sum: { co2Kg: true },
      });
      const currentMonthEmissions = Number(currentMonthEmissionsRes._sum.co2Kg || 0);

      // Previous 3 months emissions
      const previousEmissionsRes = await prisma.carbonTransaction.aggregate({
        where: {
          departmentId: dept.id,
          date: {
            gte: startOfThreeMonthsAgo,
            lt: startOfCurrentMonth,
          },
        },
        _sum: { co2Kg: true },
      });
      const previousEmissionsAvg = Number(previousEmissionsRes._sum.co2Kg || 0) / 3;

      if (previousEmissionsAvg > 0) {
        const increasePercent = ((currentMonthEmissions - previousEmissionsAvg) / previousEmissionsAvg) * 100;
        if (increasePercent > 30) {
          smartInsights.push({
            type: 'SPIKE_ALERT',
            title: `Carbon Spike in ${dept.name}`,
            message: `⚠️ Unusual Activity: ${dept.name} carbon emissions are ${increasePercent.toFixed(0)}% higher than the rolling 3-month average. Check active processes!`,
            severity: 'HIGH',
          });
        }
      }
    }

    // 6. Active Behavioral Nudges
    const nudges = await prisma.nudge.findMany({
      where: { isDismissed: false },
      orderBy: { createdAt: 'desc' },
    });

    return res.json({
      success: true,
      data: {
        orgScore: orgScores,
        departmentScores,
        impactMetrics: {
          co2SavedKg,
          treesSaved,
          flightsAvoided,
          librariesFunded,
        },
        liveFeed: liveFeed.slice(0, 10),
        smartInsights,
        nudges,
      },
    });
  } catch (error) {
    console.error('[Dashboard] Error building dashboard analytics:', error);
    return res.status(500).json({ success: false, error: 'Failed to build dashboard analytics' });
  }
});

// GET /api/dashboard/department/:id/dna - Department Radar Chart DNA metrics
router.get('/department/:id/dna', requireAuth, async (req, res) => {
  const { id } = req.params;

  try {
    const dept = await prisma.department.findUnique({
      where: { id },
      include: {
        users: { where: { status: 'ACTIVE' } },
        environmentalGoals: true,
      },
    });

    if (!dept) {
      return res.status(404).json({ success: false, error: 'Department not found' });
    }

    const employeeCount = dept.users.filter(u => u.role === 'EMPLOYEE').length;

    // 1. Carbon Intensity (total CO2 / employee count)
    // Low intensity = high efficiency. Value mapped 0-100.
    const co2Res = await prisma.carbonTransaction.aggregate({
      where: { departmentId: id },
      _sum: { co2Kg: true },
    });
    const totalCo2 = Number(co2Res._sum.co2Kg || 0);
    const intensityRaw = employeeCount > 0 ? totalCo2 / employeeCount : 100;
    // Map carbon intensity: lower is better. target 1000kg per employee.
    const carbonIntensityScore = Math.max(0, Math.min(100, 100 - (intensityRaw / 3000) * 100));

    // 2. Energy Efficiency
    // Ratio of Scope 2 (indirect electricity) vs Scope 1. Let's base it on goal achievement.
    const envGoals = dept.environmentalGoals;
    let goalProgressSum = 0;
    envGoals.forEach(g => {
      const target = Number(g.targetCo2);
      const current = Number(g.currentCo2);
      if (target > 0) {
        goalProgressSum += (1 - (current / target)) * 100;
      }
    });
    const energyEfficiencyScore = envGoals.length > 0 
      ? Math.max(0, Math.min(100, goalProgressSum / envGoals.length))
      : 75; // fallback default

    // 3. CSR Participation Rate
    const approvedParts = await prisma.employeeParticipation.count({
      where: {
        approvalStatus: 'APPROVED',
        employee: { departmentId: id },
      },
    });
    const csrParticipationScore = employeeCount > 0
      ? Math.min(100, (approvedParts / employeeCount) * 100)
      : 50;

    // 4. Diversity Index
    // Split score based on female ratio. 50% split = 100 score.
    const femalesCount = dept.users.filter(u => u.gender === 'FEMALE').length;
    const totalDeptUsers = dept.users.length;
    const femaleRatio = totalDeptUsers > 0 ? femalesCount / totalDeptUsers : 0.5;
    const diversityScore = Math.round((1 - Math.abs(0.5 - femaleRatio) * 2) * 100);

    // 5. Policy Compliance %
    const totalAcks = await prisma.policyAcknowledgement.count({
      where: { employee: { departmentId: id } },
    });
    const resolvedAcks = await prisma.policyAcknowledgement.count({
      where: { employee: { departmentId: id }, status: 'ACKNOWLEDGED' },
    });
    const policyComplianceScore = totalAcks > 0 ? (resolvedAcks / totalAcks) * 100 : 80;

    // 6. Audit Score
    const totalIssues = await prisma.complianceIssue.count({
      where: { OR: [{ audit: { departmentId: id } }, { owner: { departmentId: id } }] },
    });
    const resolvedIssues = await prisma.complianceIssue.count({
      where: { 
        OR: [{ audit: { departmentId: id } }, { owner: { departmentId: id } }],
        status: 'RESOLVED',
      },
    });
    const auditScore = totalIssues > 0 ? (resolvedIssues / totalIssues) * 100 : 100;

    const dna = [
      { dimension: 'Carbon Intensity', score: Math.round(carbonIntensityScore) },
      { dimension: 'Energy Efficiency', score: Math.round(energyEfficiencyScore) },
      { dimension: 'CSR Participation', score: Math.round(csrParticipationScore) },
      { dimension: 'Diversity Index', score: Math.round(diversityScore) },
      { dimension: 'Policy Compliance', score: Math.round(policyComplianceScore) },
      { dimension: 'Audit Score', score: Math.round(auditScore) },
    ];

    return res.json({
      success: true,
      data: {
        departmentId: id,
        departmentName: dept.name,
        dna,
      },
    });
  } catch (error) {
    console.error('[Dashboard] Error compiling department DNA:', error);
    return res.status(500).json({ success: false, error: 'Failed to compile department DNA metrics' });
  }
});

export default router;
