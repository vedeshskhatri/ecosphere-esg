import { Router } from 'express';
import { z } from 'zod';
import prisma from '../lib/prisma';
import { validate } from '../middleware/validate';
import { requireAuth, requireRole } from '../middleware/auth';
import { emitToAll } from '../socket/eventBus';

const router = Router();

const createDeptSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  code: z.string().min(2, 'Code must be at least 2 characters'),
  headId: z.string().uuid().optional().nullable(),
  parentId: z.string().uuid().optional().nullable(),
});

const updateDeptSchema = z.object({
  name: z.string().min(2).optional(),
  code: z.string().min(2).optional(),
  headId: z.string().uuid().optional().nullable(),
  parentId: z.string().uuid().optional().nullable(),
  status: z.enum(['ACTIVE', 'INACTIVE']).optional(),
});

const createCategorySchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  type: z.enum(['CSR_ACTIVITY', 'CHALLENGE']),
});

const updateEsgConfigSchema = z.object({
  envWeight: z.number().min(0).max(100).optional(),
  socialWeight: z.number().min(0).max(100).optional(),
  govWeight: z.number().min(0).max(100).optional(),
  autoBadgeAward: z.boolean().optional(),
  evidenceRequired: z.boolean().optional(),
  autoEmissionCalc: z.boolean().optional(),
  emailAlerts: z.boolean().optional(),
}).refine(data => {
  // If weights are updated, they must sum to 100
  const env = data.envWeight !== undefined ? data.envWeight : null;
  const soc = data.socialWeight !== undefined ? data.socialWeight : null;
  const gov = data.govWeight !== undefined ? data.govWeight : null;
  
  // Only check if all three are provided or we are checking a full update
  if (env !== null && soc !== null && gov !== null) {
    return env + soc + gov === 100;
  }
  return true;
}, {
  message: 'ESG weights (Environmental, Social, Governance) must sum up to 100%',
  path: ['envWeight']
});

// ─────────────────────────────────────────
// DEPARTMENTS
// ─────────────────────────────────────────

// GET /api/settings/departments - List all
router.get('/departments', requireAuth, async (req, res) => {
  try {
    const depts = await prisma.department.findMany({
      include: {
        head: { select: { name: true } },
        parent: { select: { name: true } },
      },
      orderBy: { name: 'asc' },
    });
    return res.json({ success: true, data: depts });
  } catch (error) {
    console.error('[Settings] Error fetching departments:', error);
    return res.status(500).json({ success: false, error: 'Failed to fetch departments' });
  }
});

// POST /api/settings/departments - Create (Admin only)
router.post('/departments', requireAuth, requireRole('ADMIN'), validate(createDeptSchema), async (req, res) => {
  const { name, code, headId, parentId } = req.body;

  try {
    const existing = await prisma.department.findUnique({ where: { code } });
    if (existing) {
      return res.status(400).json({ success: false, error: 'Department code already exists' });
    }

    const dept = await prisma.department.create({
      data: {
        name,
        code,
        headId: headId || null,
        parentId: parentId || null,
        status: 'ACTIVE',
      },
    });

    return res.status(201).json({ success: true, data: dept });
  } catch (error) {
    console.error('[Settings] Error creating department:', error);
    return res.status(500).json({ success: false, error: 'Failed to create department' });
  }
});

// PATCH /api/settings/departments/:id - Update (Admin only)
router.patch('/departments/:id', requireAuth, requireRole('ADMIN'), validate(updateDeptSchema), async (req, res) => {
  const { id } = req.params;
  const data = req.body;

  try {
    const dept = await prisma.department.update({
      where: { id },
      data,
    });
    return res.json({ success: true, data: dept });
  } catch (error) {
    console.error('[Settings] Error updating department:', error);
    return res.status(500).json({ success: false, error: 'Failed to update department' });
  }
});

// DELETE /api/settings/departments/:id - Soft delete (Admin only)
router.delete('/departments/:id', requireAuth, requireRole('ADMIN'), async (req, res) => {
  const { id } = req.params;

  try {
    const dept = await prisma.department.update({
      where: { id },
      data: { status: 'INACTIVE' },
    });
    return res.json({ success: true, data: dept });
  } catch (error) {
    console.error('[Settings] Error deleting department:', error);
    return res.status(500).json({ success: false, error: 'Failed to delete department' });
  }
});

// ─────────────────────────────────────────
// CATEGORIES
// ─────────────────────────────────────────

// GET /api/settings/categories - List all
router.get('/categories', requireAuth, async (req, res) => {
  try {
    const categories = await prisma.category.findMany({
      orderBy: { name: 'asc' },
    });
    return res.json({ success: true, data: categories });
  } catch (error) {
    console.error('[Settings] Error fetching categories:', error);
    return res.status(500).json({ success: false, error: 'Failed to fetch categories' });
  }
});

// POST /api/settings/categories - Create (Admin only)
router.post('/categories', requireAuth, requireRole('ADMIN'), validate(createCategorySchema), async (req, res) => {
  const { name, type } = req.body;

  try {
    const cat = await prisma.category.create({
      data: {
        name,
        type,
        status: 'ACTIVE',
      },
    });
    return res.status(201).json({ success: true, data: cat });
  } catch (error) {
    console.error('[Settings] Error creating category:', error);
    return res.status(500).json({ success: false, error: 'Failed to create category' });
  }
});

// ─────────────────────────────────────────
// ESG CONFIGURATION
// ─────────────────────────────────────────

// GET /api/settings/esg-config - Get ESG configuration
router.get('/esg-config', requireAuth, async (req, res) => {
  try {
    let config = await prisma.esgSettings.findFirst();
    if (!config) {
      config = await prisma.esgSettings.create({
        data: {
          envWeight: 40,
          socialWeight: 30,
          govWeight: 30,
          autoBadgeAward: true,
          evidenceRequired: true,
          autoEmissionCalc: false,
          emailAlerts: false,
        },
      });
    }
    return res.json({ success: true, data: config });
  } catch (error) {
    console.error('[Settings] Error fetching ESG config:', error);
    return res.status(500).json({ success: false, error: 'Failed to fetch ESG config' });
  }
});

// PATCH /api/settings/esg-config - Update ESG configuration (Admin only)
router.patch('/esg-config', requireAuth, requireRole('ADMIN'), validate(updateEsgConfigSchema), async (req, res) => {
  const data = req.body;

  try {
    let config = await prisma.esgSettings.findFirst();
    
    if (!config) {
      config = await prisma.esgSettings.create({
        data: {
          envWeight: data.envWeight !== undefined ? data.envWeight : 40,
          socialWeight: data.socialWeight !== undefined ? data.socialWeight : 30,
          govWeight: data.govWeight !== undefined ? data.govWeight : 30,
          autoBadgeAward: data.autoBadgeAward !== undefined ? data.autoBadgeAward : true,
          evidenceRequired: data.evidenceRequired !== undefined ? data.evidenceRequired : true,
          autoEmissionCalc: data.autoEmissionCalc !== undefined ? data.autoEmissionCalc : false,
          emailAlerts: data.emailAlerts !== undefined ? data.emailAlerts : false,
        },
      });
    } else {
      config = await prisma.esgSettings.update({
        where: { id: config.id },
        data,
      });
    }

    emitToAll('settings:updated', config);

    return res.json({ success: true, data: config });
  } catch (error) {
    console.error('[Settings] Error updating ESG config:', error);
    return res.status(500).json({ success: false, error: 'Failed to update ESG config' });
  }
});

export default router;
