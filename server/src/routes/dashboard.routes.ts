import { Router } from 'express';
import prisma from '../lib/prisma';
import { requireAuth } from '../middleware/auth';

const router = Router();

// GET /api/dashboard - Aggregate summary statistics
router.get('/', requireAuth, async (req, res) => {
  try {
    // 1. Get total CO2 emissions
    const txAggregate = await prisma.carbonTransaction.aggregate({
      _sum: {
        co2Kg: true,
      },
    });
    const totalEmissions = Number(txAggregate._sum.co2Kg || 0);

    // 2. Count active goals
    const activeGoals = await prisma.environmentalGoal.count({
      where: { status: 'ACTIVE' },
    });

    // 3. Count pending CSR completions
    const pendingVolunteers = await prisma.employeeParticipation.count({
      where: { approvalStatus: 'PENDING' },
    });

    // 4. Count overdue compliance issues
    const overdueIssues = await prisma.complianceIssue.count({
      where: {
        isOverdue: true,
        status: { not: 'RESOLVED' },
      },
    });

    // 5. Get recent notifications
    const recentNotifications = await prisma.notification.findMany({
      take: 10,
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { name: true } },
      },
    });

    return res.json({
      success: true,
      data: {
        totalEmissionsCo2: parseFloat(totalEmissions.toFixed(1)),
        activeGoalsCount: activeGoals,
        pendingVolunteersCount: pendingVolunteers,
        overdueIssuesCount: overdueIssues,
        recentNotifications,
      },
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
