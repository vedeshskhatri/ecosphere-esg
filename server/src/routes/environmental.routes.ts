import { Router } from 'express';
import { z } from 'zod';
import prisma from '../lib/prisma';
import { validate } from '../middleware/validate';
import { requireAuth, requireRole, AuthRequest } from '../middleware/auth';
import { ScoringEngine } from '../services/ScoringEngine';
import { emitToAll } from '../socket/eventBus';

const router = Router();

// Zod Validation Schemas
const createFactorSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  description: z.string().optional().nullable(),
  scope: z.enum(['SCOPE1', 'SCOPE2', 'SCOPE3']),
  factorValue: z.number().positive('Factor value must be positive'),
  unit: z.string().min(1, 'Unit is required'),
  sourceType: z.string().min(1, 'Source type is required'),
});

const logTransactionSchema = z.object({
  departmentId: z.string().uuid('Invalid department ID'),
  emissionFactorId: z.string().uuid('Invalid emission factor ID'),
  quantity: z.number().nonnegative('Quantity must be non-negative'),
  sourceType: z.string().min(1, 'Source type is required'),
  date: z.string().transform((val) => new Date(val)),
  notes: z.string().optional().nullable(),
});

const createGoalSchema = z.object({
  title: z.string().min(2, 'Title must be at least 2 characters'),
  departmentId: z.string().uuid('Invalid department ID'),
  targetCo2: z.number().positive('Target CO2 must be positive'),
  deadline: z.string().transform((val) => new Date(val)),
});

const updateGoalProgressSchema = z.object({
  currentCo2: z.number().nonnegative('Current CO2 must be non-negative'),
});

// ─────────────────────────────────────────
// EMISSION FACTORS
// ─────────────────────────────────────────

router.get('/emission-factors', requireAuth, async (req, res) => {
  try {
    const factors = await prisma.emissionFactor.findMany({
      orderBy: { name: 'asc' },
    });
    return res.json({ success: true, data: factors });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/emission-factors', requireAuth, requireRole('ADMIN', 'MANAGER'), validate(createFactorSchema), async (req, res) => {
  const { name, description, scope, factorValue, unit, sourceType } = req.body;
  try {
    const factor = await prisma.emissionFactor.create({
      data: { name, description, scope, factorValue, unit, sourceType, status: 'ACTIVE' },
    });
    return res.status(201).json({ success: true, data: factor });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// ─────────────────────────────────────────
// CARBON TRANSACTIONS
// ─────────────────────────────────────────

router.get('/transactions', requireAuth, async (req, res) => {
  const { departmentId, scope, startDate, endDate } = req.query;

  try {
    const filters: any = {};
    if (departmentId) filters.departmentId = departmentId as string;
    if (scope) filters.scope = scope as any;
    if (startDate || endDate) {
      filters.date = {};
      if (startDate) filters.date.gte = new Date(startDate as string);
      if (endDate) filters.date.lte = new Date(endDate as string);
    }

    const transactions = await prisma.carbonTransaction.findMany({
      where: filters,
      include: {
        department: { select: { name: true } },
        emissionFactor: true,
        createdBy: { select: { name: true, email: true } },
      },
      orderBy: { date: 'desc' },
    });

    return res.json({ success: true, data: transactions });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/transactions', requireAuth, validate(logTransactionSchema), async (req: AuthRequest, res) => {
  const { departmentId, emissionFactorId, quantity, sourceType, date, notes } = req.body;
  const userId = req.user?.id;

  try {
    const factor = await prisma.emissionFactor.findUnique({
      where: { id: emissionFactorId },
    });
    if (!factor) {
      return res.status(404).json({ success: false, error: 'Emission factor not found' });
    }

    // Calculate CO2 equivalence in kilograms
    const co2Kg = Number(factor.factorValue) * quantity;

    const transaction = await prisma.carbonTransaction.create({
      data: {
        departmentId,
        emissionFactorId,
        quantity,
        sourceType,
        date,
        notes,
        co2Kg,
        scope: factor.scope,
        createdById: userId || null,
      },
      include: {
        department: { select: { name: true } },
        emissionFactor: true,
      },
    });

    // Recalculate and emit scores
    await ScoringEngine.recalculateAndEmit(departmentId);

    // Emit to general activity feed
    emitToAll('activity:feed', {
      type: 'CARBON_LOGGED',
      message: `Logged ${co2Kg.toFixed(1)} kg CO₂ for ${transaction.department.name} from ${sourceType}`,
      timestamp: new Date(),
    });

    return res.status(201).json({ success: true, data: transaction });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// ─────────────────────────────────────────
// ENVIRONMENTAL GOALS
// ─────────────────────────────────────────

router.get('/goals', requireAuth, async (req, res) => {
  const { departmentId } = req.query;
  try {
    const filters: any = {};
    if (departmentId) filters.departmentId = departmentId as string;

    const goals = await prisma.environmentalGoal.findMany({
      where: filters,
      include: {
        department: { select: { name: true } },
      },
      orderBy: { deadline: 'asc' },
    });
    return res.json({ success: true, data: goals });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

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

    // Recalculate scores upon new goal creation
    await ScoringEngine.recalculateAndEmit(departmentId);

    return res.status(201).json({ success: true, data: goal });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

router.patch('/goals/:id', requireAuth, validate(updateGoalProgressSchema), async (req, res) => {
  const { id } = req.params;
  const { currentCo2 } = req.body;

  try {
    const goal = await prisma.environmentalGoal.findUnique({
      where: { id },
    });
    if (!goal) {
      return res.status(404).json({ success: false, error: 'Goal not found' });
    }

    const progress = (currentCo2 / Number(goal.targetCo2)) * 100;
    let status: 'ACTIVE' | 'ON_TRACK' | 'AT_RISK' | 'COMPLETED' = 'ACTIVE';

    if (progress >= 100) {
      status = 'COMPLETED';
    } else if (progress >= 80) {
      status = 'AT_RISK';
    } else {
      status = 'ON_TRACK';
    }

    const updatedGoal = await prisma.environmentalGoal.update({
      where: { id },
      data: {
        currentCo2,
        status,
      },
    });

    // Recalculate scores upon goal update
    await ScoringEngine.recalculateAndEmit(goal.departmentId);

    return res.json({ success: true, data: updatedGoal });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// ─────────────────────────────────────────
// SMART INSIGHTS
// ─────────────────────────────────────────

router.get('/insights', requireAuth, async (req, res) => {
  try {
    // Generate automated smart insights based on carbon logs
    const transactions = await prisma.carbonTransaction.findMany({
      take: 50,
      orderBy: { date: 'desc' },
      include: { department: true },
    });

    const insights = [];

    // 1. Check for recent high transactions
    const highEmissionTx = transactions.find((tx) => Number(tx.co2Kg) > 2000);
    if (highEmissionTx) {
      insights.push({
        id: 'high-emission-alert',
        message: `⚠️ Emission alert: High CO₂ spike logged for ${highEmissionTx.department.name} (${Number(highEmissionTx.co2Kg).toFixed(1)} kg) from ${highEmissionTx.sourceType}.`,
        severity: 'HIGH',
      });
    }

    // 2. Check for Scope 1 direct fleets
    const fleetEmissions = transactions
      .filter((tx) => tx.sourceType.toLowerCase().includes('fleet') || tx.sourceType.toLowerCase().includes('diesel'))
      .reduce((sum, tx) => sum + Number(tx.co2Kg), 0);

    if (fleetEmissions > 5000) {
      insights.push({
        id: 'fleet-optimization',
        message: `💡 Optimization tip: Fleet/Fuel emissions represent a significant portion of overall direct emissions. Consider transition targets.`,
        severity: 'MEDIUM',
      });
    }

    // Default stable insight
    if (insights.length === 0) {
      insights.push({
        id: 'stable-operations',
        message: `🍀 System baseline stable. No anomalous emission spikes registered this audit cycle.`,
        severity: 'LOW',
      });
    }

    return res.json({ success: true, data: insights });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
