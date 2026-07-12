import { Router } from 'express';
import { z } from 'zod';
import prisma from '../lib/prisma';
import { validate } from '../middleware/validate';
import { requireAuth, requireRole, AuthRequest } from '../middleware/auth';
import { ScoringEngine } from '../services/ScoringEngine';
import { ForecastEngine } from '../services/ForecastEngine';

const router = Router();

// Zod validation schemas
const createFactorSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  scope: z.enum(['SCOPE1', 'SCOPE2', 'SCOPE3']),
  factorValue: z.number().positive('Factor value must be a positive number'),
  unit: z.string().min(1, 'Unit is required'),
  sourceType: z.string().min(1, 'Source type is required'),
  description: z.string().optional().nullable(),
});

const updateFactorSchema = z.object({
  name: z.string().min(2).optional(),
  scope: z.enum(['SCOPE1', 'SCOPE2', 'SCOPE3']).optional(),
  factorValue: z.number().positive().optional(),
  unit: z.string().min(1).optional(),
  sourceType: z.string().min(1).optional(),
  description: z.string().optional().nullable(),
  status: z.enum(['ACTIVE', 'INACTIVE']).optional(),
});

const createTransactionSchema = z.object({
  departmentId: z.string().uuid('Invalid department ID'),
  emissionFactorId: z.string().uuid('Invalid emission factor ID'),
  quantity: z.number().positive('Quantity must be a positive number'),
  sourceType: z.string().min(1, 'Source type is required'),
  date: z.string().transform((val) => new Date(val)),
  notes: z.string().optional().nullable(),
  productId: z.string().uuid('Invalid product ID').optional().nullable(),
});

const createGoalSchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters'),
  departmentId: z.string().uuid('Invalid department ID'),
  targetCo2: z.number().positive('Target CO2 must be a positive number'),
  deadline: z.string().transform((val) => new Date(val)),
});

const updateGoalSchema = z.object({
  title: z.string().min(3).optional(),
  targetCo2: z.number().positive().optional(),
  currentCo2: z.number().nonnegative().optional(),
  deadline: z.string().transform((val) => new Date(val)).optional(),
});

// ─────────────────────────────────────────
// EMISSION FACTORS
// ─────────────────────────────────────────

// GET /api/environmental/emission-factors
router.get('/emission-factors', requireAuth, async (req, res) => {
  try {
    const factors = await prisma.emissionFactor.findMany({
      orderBy: [
        { scope: 'asc' },
        { name: 'asc' }
      ]
    });
    return res.json({ success: true, data: factors });
  } catch (error) {
    console.error('[Environmental] Error fetching factors:', error);
    return res.status(500).json({ success: false, error: 'Failed to fetch emission factors' });
  }
});

// POST /api/environmental/emission-factors (Admin/Manager only)
router.post('/emission-factors', requireAuth, requireRole('ADMIN', 'MANAGER'), validate(createFactorSchema), async (req, res) => {
  const { name, scope, factorValue, unit, sourceType, description } = req.body;

  try {
    const factor = await prisma.emissionFactor.create({
      data: {
        name,
        scope,
        factorValue,
        unit,
        sourceType,
        description: description || null,
        status: 'ACTIVE',
      },
    });
    return res.status(201).json({ success: true, data: factor });
  } catch (error) {
    console.error('[Environmental] Error creating factor:', error);
    return res.status(500).json({ success: false, error: 'Failed to create emission factor' });
  }
});

// PATCH /api/environmental/emission-factors/:id (Admin/Manager only)
router.patch('/emission-factors/:id', requireAuth, requireRole('ADMIN', 'MANAGER'), validate(updateFactorSchema), async (req, res) => {
  const { id } = req.params;
  const data = req.body;

  try {
    const factor = await prisma.emissionFactor.update({
      where: { id },
      data,
    });
    return res.json({ success: true, data: factor });
  } catch (error) {
    console.error('[Environmental] Error updating factor:', error);
    return res.status(500).json({ success: false, error: 'Failed to update emission factor' });
  }
});

// DELETE /api/environmental/emission-factors/:id (Admin only - soft delete)
router.delete('/emission-factors/:id', requireAuth, requireRole('ADMIN'), async (req, res) => {
  const { id } = req.params;

  try {
    const factor = await prisma.emissionFactor.update({
      where: { id },
      data: { status: 'INACTIVE' },
    });
    return res.json({ success: true, data: factor });
  } catch (error) {
    console.error('[Environmental] Error deleting factor:', error);
    return res.status(500).json({ success: false, error: 'Failed to delete emission factor' });
  }
});

// ─────────────────────────────────────────
// CARBON TRANSACTIONS
// ─────────────────────────────────────────

// GET /api/environmental/carbon-transactions
router.get('/carbon-transactions', requireAuth, async (req, res) => {
  const { departmentId, startDate, endDate, scope } = req.query;

  try {
    const where: any = {};
    if (departmentId) {
      where.departmentId = departmentId as string;
    }
    if (scope) {
      where.scope = scope as any;
    }
    if (startDate || endDate) {
      where.date = {};
      if (startDate) where.date.gte = new Date(startDate as string);
      if (endDate) where.date.lte = new Date(endDate as string);
    }

    const transactions = await prisma.carbonTransaction.findMany({
      where,
      include: {
        department: { select: { name: true } },
        emissionFactor: { select: { name: true, factorValue: true } },
      },
      orderBy: { date: 'desc' },
    });

    return res.json({ success: true, data: transactions });
  } catch (error) {
    console.error('[Environmental] Error fetching carbon transactions:', error);
    return res.status(500).json({ success: false, error: 'Failed to fetch carbon transactions' });
  }
});

// POST /api/environmental/carbon-transactions
router.post('/carbon-transactions', requireAuth, validate(createTransactionSchema), async (req: AuthRequest, res) => {
  const { departmentId, emissionFactorId, quantity, sourceType, date, notes, productId } = req.body;
  const userId = req.user?.id;

  try {
    // Fetch emission factor to auto-calculate CO2 and get scope
    const factor = await prisma.emissionFactor.findUnique({
      where: { id: emissionFactorId },
    });

    if (!factor) {
      return res.status(404).json({ success: false, error: 'Emission factor not found' });
    }

    const co2Kg = quantity * Number(factor.factorValue);

    const transaction = await prisma.carbonTransaction.create({
      data: {
        departmentId,
        emissionFactorId,
        scope: factor.scope,
        quantity,
        co2Kg,
        sourceType,
        date,
        isAuto: false,
        notes: notes || null,
        createdById: userId || null,
        productId: productId || null,
      },
    });

    // Update goals current progress automatically if any goals match
    const activeGoals = await prisma.environmentalGoal.findMany({
      where: { departmentId, status: { in: ['ACTIVE', 'ON_TRACK', 'AT_RISK'] } },
    });

    for (const goal of activeGoals) {
      const updatedCo2 = Number(goal.currentCo2) + co2Kg;
      
      // Compute status based on target
      const target = Number(goal.targetCo2);
      const progressPercent = (updatedCo2 / target) * 100;
      
      let status: any = 'ACTIVE';
      if (progressPercent >= 100) {
        status = 'COMPLETED';
      } else if (progressPercent >= 80) {
        status = 'AT_RISK';
      } else {
        status = 'ON_TRACK';
      }

      await prisma.environmentalGoal.update({
        where: { id: goal.id },
        data: { currentCo2: updatedCo2, status },
      });
    }

    // Recalculate department ESG scores in background
    ScoringEngine.recalculateAndEmit(departmentId);

    return res.status(201).json({ success: true, data: transaction });
  } catch (error) {
    console.error('[Environmental] Error creating transaction:', error);
    return res.status(500).json({ success: false, error: 'Failed to create carbon transaction' });
  }
});

// GET /api/environmental/carbon-transactions/trend (12 Months)
router.get('/carbon-transactions/trend', requireAuth, async (req, res) => {
  try {
    const rawTxs = await prisma.carbonTransaction.findMany({
      select: {
        date: true,
        co2Kg: true,
        scope: true,
      },
    });

    // Group by month in memory (database-agnostic formatting)
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const trendMap = new Map<string, { month: string; total: number; scope1: number; scope2: number; scope3: number }>();

    rawTxs.forEach((tx) => {
      const date = new Date(tx.date);
      const label = `${monthNames[date.getMonth()]} ${date.getFullYear()}`;
      
      if (!trendMap.has(label)) {
        trendMap.set(label, { month: label, total: 0, scope1: 0, scope2: 0, scope3: 0 });
      }

      const entry = trendMap.get(label)!;
      const co2 = Number(tx.co2Kg);
      entry.total += co2;
      
      if (tx.scope === 'SCOPE1') entry.scope1 += co2;
      else if (tx.scope === 'SCOPE2') entry.scope2 += co2;
      else if (tx.scope === 'SCOPE3') entry.scope3 += co2;
    });

    const trend = Array.from(trendMap.values())
      .sort((a, b) => {
        const dateA = new Date(a.month);
        const dateB = new Date(b.month);
        return dateA.getTime() - dateB.getTime();
      });

    return res.json({ success: true, data: trend });
  } catch (error) {
    console.error('[Environmental] Error getting emissions trend:', error);
    return res.status(500).json({ success: false, error: 'Failed to calculate emissions trend' });
  }
});

// GET /api/environmental/carbon-transactions/forecast
router.get('/carbon-transactions/forecast', requireAuth, async (req, res) => {
  try {
    const rawTxs = await prisma.carbonTransaction.findMany({
      select: {
        date: true,
        co2Kg: true,
      },
    });

    // Group by month in memory (database-agnostic formatting)
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const trendMap = new Map<string, { month: string; total: number }>();

    rawTxs.forEach((tx) => {
      const date = new Date(tx.date);
      const label = `${monthNames[date.getMonth()]} ${date.getFullYear()}`;
      
      if (!trendMap.has(label)) {
        trendMap.set(label, { month: label, total: 0 });
      }

      const entry = trendMap.get(label)!;
      entry.total += Number(tx.co2Kg);
    });

    const historicalTrend = Array.from(trendMap.values())
      .sort((a, b) => {
        const dateA = new Date(a.month);
        const dateB = new Date(b.month);
        return dateA.getTime() - dateB.getTime();
      });

    // 1. Generate forecast using simple linear regression
    const forecastData = ForecastEngine.generateForecast(historicalTrend);

    // 2. Detect anomalies in history
    const anomalies = ForecastEngine.detectAnomalies(historicalTrend);

    // 3. Query department goals to generate recommendations based on target deviation
    const departments = await prisma.department.findMany({
      where: { status: 'ACTIVE' },
      include: {
        environmentalGoals: {
          where: { status: { in: ['ACTIVE', 'ON_TRACK', 'AT_RISK'] } },
          select: { currentCo2: true, targetCo2: true }
        }
      }
    });

    const departmentGoalData = departments.map((d) => {
      let currentCo2 = 0;
      let targetCo2 = 0;
      d.environmentalGoals.forEach((g) => {
        currentCo2 += Number(g.currentCo2);
        targetCo2 += Number(g.targetCo2);
      });

      return {
        departmentName: d.name,
        departmentCode: d.code,
        currentCo2,
        targetCo2,
      };
    });

    const recommendations = ForecastEngine.generateRecommendations(departmentGoalData);

    return res.json({
      success: true,
      data: {
        forecast: forecastData,
        anomalies,
        recommendations,
      }
    });
  } catch (error) {
    console.error('[Environmental] Error calculating forecast:', error);
    return res.status(500).json({ success: false, error: 'Failed to calculate emissions forecast' });
  }
});

// GET /api/environmental/carbon-transactions/scope-breakdown (Current Month)
router.get('/carbon-transactions/scope-breakdown', requireAuth, async (req, res) => {
  try {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const currentMonthTxs = await prisma.carbonTransaction.findMany({
      where: {
        date: { gte: startOfMonth },
      },
      select: {
        co2Kg: true,
        scope: true,
      },
    });

    let scope1 = 0;
    let scope2 = 0;
    let scope3 = 0;
    let total = 0;

    currentMonthTxs.forEach((tx) => {
      const co2 = Number(tx.co2Kg);
      total += co2;
      if (tx.scope === 'SCOPE1') scope1 += co2;
      else if (tx.scope === 'SCOPE2') scope2 += co2;
      else if (tx.scope === 'SCOPE3') scope3 += co2;
    });

    return res.json({
      success: true,
      data: {
        SCOPE1: scope1,
        SCOPE2: scope2,
        SCOPE3: scope3,
        total,
      },
    });
  } catch (error) {
    console.error('[Environmental] Error getting scope breakdown:', error);
    return res.status(500).json({ success: false, error: 'Failed to calculate scope breakdown' });
  }
});

// ─────────────────────────────────────────
// ENVIRONMENTAL GOALS
// ─────────────────────────────────────────

// GET /api/environmental/goals
router.get('/goals', requireAuth, async (req, res) => {
  const { departmentId } = req.query;

  try {
    const where: any = {};
    if (departmentId) {
      where.departmentId = departmentId as string;
    }

    const goals = await prisma.environmentalGoal.findMany({
      where,
      include: {
        department: { select: { name: true } },
      },
    });

    const parsedGoals = goals.map((goal) => {
      const target = Number(goal.targetCo2);
      const current = Number(goal.currentCo2);
      const progressPercent = target > 0 ? Math.min(100, (current / target) * 100) : 0;
      return {
        ...goal,
        progressPercent,
      };
    });

    return res.json({ success: true, data: parsedGoals });
  } catch (error) {
    console.error('[Environmental] Error fetching goals:', error);
    return res.status(500).json({ success: false, error: 'Failed to fetch goals' });
  }
});

// POST /api/environmental/goals (Admin/Manager only)
router.post('/goals', requireAuth, requireRole('ADMIN', 'MANAGER'), validate(createGoalSchema), async (req, res) => {
  const { title, departmentId, targetCo2, deadline } = req.body;

  try {
    const goal = await prisma.environmentalGoal.create({
      data: {
        title,
        departmentId,
        targetCo2,
        currentCo2: 0,
        deadline,
        status: 'ACTIVE',
      },
    });

    // Trigger score recalculation
    ScoringEngine.recalculateAndEmit(departmentId);

    return res.status(201).json({ success: true, data: goal });
  } catch (error) {
    console.error('[Environmental] Error creating goal:', error);
    return res.status(500).json({ success: false, error: 'Failed to create environmental goal' });
  }
});

// PATCH /api/environmental/goals/:id
router.patch('/goals/:id', requireAuth, requireRole('ADMIN', 'MANAGER'), validate(updateGoalSchema), async (req, res) => {
  const { id } = req.params;
  const data = req.body;

  try {
    // Get existing goal
    const goal = await prisma.environmentalGoal.findUnique({ where: { id } });
    if (!goal) {
      return res.status(404).json({ success: false, error: 'Environmental goal not found' });
    }

    const updatedCurrent = data.currentCo2 !== undefined ? data.currentCo2 : Number(goal.currentCo2);
    const updatedTarget = data.targetCo2 !== undefined ? data.targetCo2 : Number(goal.targetCo2);
    const progressPercent = updatedTarget > 0 ? (updatedCurrent / updatedTarget) * 100 : 0;

    let status: any = 'ACTIVE';
    if (progressPercent >= 100) {
      status = 'COMPLETED';
    } else if (progressPercent >= 80) {
      status = 'AT_RISK';
    } else if (progressPercent > 0) {
      status = 'ON_TRACK';
    }

    const updatedGoal = await prisma.environmentalGoal.update({
      where: { id },
      data: {
        title: data.title,
        targetCo2: data.targetCo2,
        currentCo2: data.currentCo2,
        deadline: data.deadline,
        status,
      },
    });

    // Trigger score recalculation
    ScoringEngine.recalculateAndEmit(updatedGoal.departmentId);

    return res.json({ success: true, data: updatedGoal });
  } catch (error) {
    console.error('[Environmental] Error updating goal:', error);
    return res.status(500).json({ success: false, error: 'Failed to update environmental goal' });
  }
});

// DELETE /api/environmental/goals/:id (Admin only - hard delete)
router.delete('/goals/:id', requireAuth, requireRole('ADMIN'), async (req, res) => {
  const { id } = req.params;

  try {
    const goal = await prisma.environmentalGoal.findUnique({ where: { id } });
    if (!goal) {
      return res.status(404).json({ success: false, error: 'Environmental goal not found' });
    }

    await prisma.environmentalGoal.delete({ where: { id } });

    // Trigger score recalculation
    ScoringEngine.recalculateAndEmit(goal.departmentId);

    return res.json({ success: true, message: 'Goal deleted successfully' });
  } catch (error) {
    console.error('[Environmental] Error deleting goal:', error);
    return res.status(500).json({ success: false, error: 'Failed to delete environmental goal' });
  }
});

export default router;
