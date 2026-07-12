import { Router, Response } from 'express';
import prisma from '../lib/prisma';
import { requireAuth, AuthRequest } from '../middleware/auth';
import ScoringEngine from '../services/ScoringEngine';

const router = Router();

// GET / - Retrieve dashboard metrics
router.get('/', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const [
      scores,
      emissionsTrend,
      departmentScores,
      activityFeed,
      insights,
      impactFactors,
      stats
    ] = await Promise.all([
      // 1. ESG Scores - uses ScoringEngine to calculate org score and averages department categories
      (async () => {
        const orgScore = await ScoringEngine.calculateOrgScore();
        
        const activeDepts = await prisma.department.findMany({
          where: { status: 'ACTIVE' },
          select: { id: true }
        });

        let envSum = 0;
        let socialSum = 0;
        let govSum = 0;
        let count = 0;

        for (const dept of activeDepts) {
          const latestScore = await prisma.departmentScore.findFirst({
            where: { departmentId: dept.id },
            orderBy: { calculatedAt: 'desc' }
          });

          if (latestScore) {
            envSum += Number(latestScore.envScore);
            socialSum += Number(latestScore.socialScore);
            govSum += Number(latestScore.govScore);
            count++;
          }
        }

        return {
          total: orgScore,
          env: count > 0 ? envSum / count : 50,
          social: count > 0 ? socialSum / count : 50,
          gov: count > 0 ? govSum / count : 50
        };
      })(),

      // 2. Emissions Trend - last 12 months grouped in memory
      (async () => {
        const transactions = await prisma.carbonTransaction.findMany({
          where: {
            createdAt: {
              gte: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000)
            }
          },
          select: {
            co2Kg: true,
            createdAt: true
          }
        });

        const monthsList = [];
        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const today = new Date();
        for (let i = 11; i >= 0; i--) {
          const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
          monthsList.push({
            year: d.getFullYear(),
            monthIndex: d.getMonth(),
            monthName: monthNames[d.getMonth()]
          });
        }

        return monthsList.map(m => {
          const monthTransactions = transactions.filter(t => {
            const txDate = new Date(t.createdAt);
            return txDate.getFullYear() === m.year && txDate.getMonth() === m.monthIndex;
          });
          const totalCo2 = monthTransactions.reduce((sum, t) => sum + Number(t.co2Kg), 0);
          return {
            month: m.monthName,
            totalCo2: Math.round(totalCo2 * 100) / 100
          };
        });
      })(),

      // 3. Department Scores - returns name and score for all active departments
      (async () => {
        const departments = await prisma.department.findMany({
          where: { status: 'ACTIVE' },
          select: { id: true, name: true }
        });

        return Promise.all(
          departments.map(async dept => {
            const latestScore = await prisma.departmentScore.findFirst({
              where: { departmentId: dept.id },
              orderBy: { calculatedAt: 'desc' },
              select: { totalScore: true, envScore: true, socialScore: true, govScore: true }
            });
            return {
              departmentName: dept.name,
              score: latestScore ? Number(latestScore.totalScore) : 50,
              envScore: latestScore ? Number(latestScore.envScore) : 50,
              socialScore: latestScore ? Number(latestScore.socialScore) : 50,
              govScore: latestScore ? Number(latestScore.govScore) : 50
            };
          })
        );
      })(),

      // 4. Recent Activity Feed - recent 10 notifications including user name
      (async () => {
        const rawNotifications = await prisma.notification.findMany({
          orderBy: { createdAt: 'desc' },
          take: 10,
          include: {
            user: {
              select: { name: true }
            }
          }
        });

        return rawNotifications.map(n => ({
          id: n.id,
          userId: n.userId,
          userName: n.user?.name || '',
          type: n.type,
          title: n.title,
          message: n.message,
          isRead: n.isRead,
          refType: n.refType,
          refId: n.refId,
          createdAt: n.createdAt
        }));
      })(),

      // 5. Smart Insights - Nudge table has been verified to exist in schema with field name `isDismissed`
      prisma.nudge.findMany({
        where: { isDismissed: false },
        take: 5,
        orderBy: { createdAt: 'desc' }
      }),

      // 6. Impact Data - ConversionFactor table has been verified to exist in schema
      prisma.conversionFactor.findMany(),

      // 7. Org-wide Stats - count/sum aggregates
      (async () => {
        const totalUsers = await prisma.user.count();
        const xpAggregate = await prisma.user.aggregate({
          _sum: {
            xp: true
          }
        });
        const totalTransactions = await prisma.carbonTransaction.count();
        return {
          totalUsers,
          totalXP: xpAggregate._sum.xp || 0,
          totalTransactions
        };
      })()
    ]);

    return res.json({
      success: true,
      data: {
        scores,
        emissionsTrend,
        departmentScores,
        activityFeed,
        insights,
        impactFactors,
        stats
      }
    });
  } catch (error: any) {
    console.error('[Dashboard] Error retrieving dashboard metrics:', error);
    return res.status(500).json({ success: false, error: error.message || 'Failed to retrieve dashboard metrics' });
  }
});

export default router;
