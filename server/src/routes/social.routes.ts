import { Router } from 'express';
import prisma from '../lib/prisma';
import { requireAuth } from '../middleware/auth';

const router = Router();

// GET /api/social/diversity - Retrieve diversity and parity metrics
router.get('/diversity', requireAuth, async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      where: { status: 'ACTIVE' },
      select: {
        id: true,
        name: true,
        gender: true,
        xp: true,
        pointsBalance: true,
        joinDate: true,
        department: { select: { id: true, name: true } },
      },
    });

    const totalCount = users.length;
    if (totalCount === 0) {
      return res.json({
        success: true,
        data: {
          genderDistribution: { MALE: 0, FEMALE: 0, NON_BINARY: 0 },
          averagesByGender: {},
          departmentDistribution: {},
          averageTenureMonths: 0,
        },
      });
    }

    // 1. Gender Distribution Count
    const genderCounts: Record<string, number> = { MALE: 0, FEMALE: 0, OTHER: 0 };
    let totalTenureDays = 0;
    const now = new Date();

    // 2. Gender Parity Metrics (average XP and points by gender)
    const genderMetrics: Record<string, { totalXp: number; totalPoints: number; count: number }> = {};

    // 3. Department Breakdown
    const deptDistribution: Record<string, { name: string; total: number; MALE: number; FEMALE: number; OTHER: number }> = {};

    users.forEach((user) => {
      const gender = user.gender || 'OTHER';
      
      // Gender distribution
      if (genderCounts[gender] !== undefined) {
        genderCounts[gender]++;
      } else {
        genderCounts.OTHER++;
      }

      // Parity totals
      if (!genderMetrics[gender]) {
        genderMetrics[gender] = { totalXp: 0, totalPoints: 0, count: 0 };
      }
      genderMetrics[gender].totalXp += user.xp;
      genderMetrics[gender].totalPoints += user.pointsBalance;
      genderMetrics[gender].count++;

      // Average tenure calculation
      const join = new Date(user.joinDate);
      const diffTime = Math.abs(now.getTime() - join.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      totalTenureDays += diffDays;

      // Department distributions
      if (user.department) {
        const deptId = user.department.id;
        const deptName = user.department.name;
        if (!deptDistribution[deptId]) {
          deptDistribution[deptId] = { name: deptName, total: 0, MALE: 0, FEMALE: 0, OTHER: 0 };
        }
        deptDistribution[deptId].total++;
        if (gender === 'MALE') deptDistribution[deptId].MALE++;
        else if (gender === 'FEMALE') deptDistribution[deptId].FEMALE++;
        else deptDistribution[deptId].OTHER++;
      }
    });

    // Format distributions and parity
    const averagesByGender: Record<string, { avgXp: number; avgPoints: number }> = {};
    Object.keys(genderMetrics).forEach((g) => {
      const metric = genderMetrics[g];
      averagesByGender[g] = {
        avgXp: Math.round((metric.totalXp / metric.count) * 10) / 10,
        avgPoints: Math.round((metric.totalPoints / metric.count) * 10) / 10,
      };
    });

    const averageTenureMonths = Math.round((totalTenureDays / totalCount / 30.4) * 10) / 10;

    return res.json({
      success: true,
      data: {
        totalEmployees: totalCount,
        genderDistribution: {
          MALE: genderCounts.MALE,
          FEMALE: genderCounts.FEMALE,
          OTHER: genderCounts.OTHER,
          malePercentage: Math.round((genderCounts.MALE / totalCount) * 100),
          femalePercentage: Math.round((genderCounts.FEMALE / totalCount) * 100),
          otherPercentage: Math.round((genderCounts.OTHER / totalCount) * 100),
        },
        averagesByGender,
        departmentDistribution: Object.values(deptDistribution),
        averageTenureMonths,
      },
    });
  } catch (error) {
    console.error('[Diversity] Error fetching diversity metrics:', error);
    return res.status(500).json({ success: false, error: 'Failed to retrieve diversity metrics' });
  }
});

// Placeholder for remaining CSR activity routes (Swapnil's track)
router.get('/activities', requireAuth, async (req, res) => {
  try {
    const activities = await prisma.csrActivity.findMany({
      include: {
        category: { select: { name: true } },
        _count: { select: { participations: true } },
      },
    });
    return res.json({ success: true, data: activities });
  } catch (error) {
    return res.status(500).json({ success: false, error: 'Failed to retrieve CSR activities' });
  }
});

export default router;
