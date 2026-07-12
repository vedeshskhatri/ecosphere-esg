import { Router, Response } from 'express';
import { z } from 'zod';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import prisma from '../lib/prisma';
import { requireAuth, requireRole, AuthRequest } from '../middleware/auth';
import { emitToAll, emitToUser } from '../socket/eventBus';
import { checkAndAwardBadges } from '../services/BadgeAwardEngine';
import ScoringEngine from '../services/ScoringEngine';

const router = Router();

// Configure multer storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = './uploads';
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  }
});

const upload = multer({ storage });

// Zod Validation Schemas
const createActivitySchema = z.object({
  title: z.string({ required_error: 'Title is required' }).min(1, 'Title cannot be empty'),
  categoryId: z.string({ required_error: 'Category ID is required' }),
  description: z.string({ required_error: 'Description is required' }).min(1, 'Description cannot be empty'),
  evidenceRequired: z.boolean().default(false),
  maxParticipants: z.number().int().positive().optional().nullable(),
  xpReward: z.number().int().nonnegative().default(50),
  deadline: z.string().optional().nullable(),
});

const updateActivitySchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().min(1).optional(),
  status: z.enum(['DRAFT', 'ACTIVE', 'COMPLETED', 'ARCHIVED']).optional(),
  xpReward: z.number().int().nonnegative().optional(),
  deadline: z.string().optional().nullable(),
});

// Helper to clean up uploaded files on error
const cleanupUploadedFile = (req: AuthRequest) => {
  if (req.file) {
    try {
      fs.unlinkSync(req.file.path);
    } catch (err) {
      console.error('[Social] Failed to clean up uploaded file:', err);
    }
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// ROUTES
// ─────────────────────────────────────────────────────────────────────────────

// GET / - Query all CSR Activities
router.get('/', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const statusParam = req.query.status as string;
    const where: any = {};

    if (statusParam) {
      const validStatuses = ['DRAFT', 'ACTIVE', 'COMPLETED', 'ARCHIVED'];
      if (!validStatuses.includes(statusParam)) {
        return res.status(400).json({ success: false, error: 'Invalid status parameter' });
      }
      where.status = statusParam;
    }

    const rawActivities = await prisma.csrActivity.findMany({
      where,
      include: {
        category: {
          select: { name: true }
        },
        participations: {
          select: {
            employeeId: true,
            approvalStatus: true
          }
        }
      }
    });

    const activities = rawActivities.map(act => {
      const { participations, ...rest } = act;
      const currentUserParticipation = participations.find(p => p.employeeId === req.user?.id);
      const joinStatus = currentUserParticipation ? currentUserParticipation.approvalStatus : null;

      return {
        ...rest,
        participantsCount: participations.length,
        joinStatus
      };
    });

    return res.json({ success: true, data: activities });
  } catch (error: any) {
    console.error('[Social] Error fetching activities:', error);
    return res.status(500).json({ success: false, error: error.message || 'Failed to fetch CSR activities' });
  }
});

// POST / - Create a CSR Activity
router.post('/', requireAuth, requireRole('ADMIN', 'MANAGER'), async (req: AuthRequest, res: Response) => {
  try {
    const parsed = createActivitySchema.parse(req.body);

    if (!req.user) {
      return res.status(401).json({ success: false, error: 'Unauthorized: Missing user information' });
    }

    const activity = await prisma.csrActivity.create({
      data: {
        title: parsed.title,
        categoryId: parsed.categoryId,
        description: parsed.description,
        evidenceRequired: parsed.evidenceRequired,
        maxParticipants: parsed.maxParticipants ?? null,
        xpReward: parsed.xpReward,
        deadline: parsed.deadline ? new Date(parsed.deadline) : null,
        status: 'DRAFT',
        createdById: req.user.id
      }
    });

    return res.status(201).json({ success: true, data: activity });
  } catch (error: any) {
    console.error('[Social] Error creating activity:', error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ success: false, error: error.errors[0]?.message || 'Validation failed' });
    }
    return res.status(500).json({ success: false, error: error.message || 'Failed to create CSR activity' });
  }
});

// PATCH /:id - Update a CSR Activity
router.patch('/:id', requireAuth, requireRole('ADMIN', 'MANAGER'), async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const parsed = updateActivitySchema.parse(req.body);

    const updateData: any = {};
    if (parsed.title !== undefined) updateData.title = parsed.title;
    if (parsed.description !== undefined) updateData.description = parsed.description;
    if (parsed.status !== undefined) updateData.status = parsed.status;
    if (parsed.xpReward !== undefined) updateData.xpReward = parsed.xpReward;
    if (parsed.deadline !== undefined) {
      updateData.deadline = parsed.deadline ? new Date(parsed.deadline) : null;
    }

    const updatedActivity = await prisma.csrActivity.update({
      where: { id },
      data: updateData
    });

    return res.json({ success: true, data: updatedActivity });
  } catch (error: any) {
    console.error('[Social] Error updating activity:', error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ success: false, error: error.errors[0]?.message || 'Validation failed' });
    }
    return res.status(500).json({ success: false, error: error.message || 'Failed to update CSR activity' });
  }
});

// POST /:id/join - Join a CSR Activity
router.post('/:id/join', requireAuth, upload.single('proof'), async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    if (!req.user) {
      cleanupUploadedFile(req);
      return res.status(401).json({ success: false, error: 'Unauthorized: Missing user information' });
    }

    const activity = await prisma.csrActivity.findUnique({
      where: { id }
    });

    if (!activity) {
      cleanupUploadedFile(req);
      return res.status(404).json({ success: false, error: 'Activity not found' });
    }

    if (activity.status !== 'ACTIVE') {
      cleanupUploadedFile(req);
      return res.status(400).json({ success: false, error: 'Activity is not active' });
    }

    // Check ESG Settings
    const esgSettings = await prisma.esgSettings.findFirst();
    const settingsEvidenceRequired = esgSettings ? esgSettings.evidenceRequired : true;
    const isEvidenceRequired = activity.evidenceRequired || settingsEvidenceRequired;

    if (isEvidenceRequired && !req.file) {
      return res.status(400).json({ success: false, error: 'Proof file required' });
    }

    // Check if the user has already joined
    const existingParticipation = await prisma.employeeParticipation.findUnique({
      where: {
        employeeId_activityId: {
          employeeId: req.user.id,
          activityId: id
        }
      }
    });

    if (existingParticipation) {
      cleanupUploadedFile(req);
      return res.status(400).json({ success: false, error: 'You have already joined this activity' });
    }

    const participation = await prisma.employeeParticipation.create({
      data: {
        employeeId: req.user.id,
        activityId: id,
        approvalStatus: 'PENDING',
        proofUrl: req.file ? req.file.filename : null
      }
    });

    return res.status(201).json({ success: true, data: participation });
  } catch (error: any) {
    cleanupUploadedFile(req);
    console.error('[Social] Error joining activity:', error);
    return res.status(500).json({ success: false, error: error.message || 'Failed to join activity' });
  }
});

// GET /participations - Get all pending participations
router.get('/participations', requireAuth, requireRole('ADMIN', 'MANAGER'), async (req: AuthRequest, res: Response) => {
  try {
    const participations = await prisma.employeeParticipation.findMany({
      where: {
        approvalStatus: 'PENDING'
      },
      include: {
        employee: {
          select: { name: true }
        },
        activity: {
          select: { title: true }
        }
      }
    });

    const data = participations.map(p => ({
      id: p.id,
      employeeId: p.employeeId,
      employeeName: p.employee?.name || '',
      activityId: p.activityId,
      activityTitle: p.activity?.title || '',
      proofUrl: p.proofUrl,
      approvalStatus: p.approvalStatus,
      pointsEarned: p.pointsEarned,
      createdAt: p.createdAt
    }));

    return res.json({ success: true, data });
  } catch (error: any) {
    console.error('[Social] Error fetching pending participations:', error);
    return res.status(500).json({ success: false, error: error.message || 'Failed to fetch pending participations' });
  }
});

// PATCH /participations/:id/approve - Approve participation
router.patch('/participations/:id/approve', requireAuth, requireRole('ADMIN', 'MANAGER'), async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const participation = await prisma.employeeParticipation.findUnique({
      where: { id },
      include: {
        activity: true,
        employee: true
      }
    });

    if (!participation) {
      return res.status(404).json({ success: false, error: 'Participation not found' });
    }

    if (participation.approvalStatus !== 'PENDING') {
      return res.status(400).json({ success: false, error: 'Participation is not pending approval' });
    }

    const xpReward = participation.activity.xpReward;
    const employeeId = participation.employeeId;
    const activityTitle = participation.activity.title;
    const employeeName = participation.employee.name;

    const updatedParticipation = await prisma.$transaction(async (tx) => {
      const p = await tx.employeeParticipation.update({
        where: { id },
        data: {
          approvalStatus: 'APPROVED',
          completionDate: new Date(),
          pointsEarned: xpReward
        }
      });

      await tx.user.update({
        where: { id: employeeId },
        data: {
          xp: { increment: xpReward },
          pointsBalance: { increment: xpReward }
        }
      });

      const title = 'CSR Activity Approved';
      const message = `Your participation in ${activityTitle} has been approved!`;

      await tx.notification.create({
        data: {
          userId: employeeId,
          type: 'CSR_APPROVED',
          title,
          message
        }
      });

      return p;
    });

    const title = 'CSR Activity Approved';
    const message = `Your participation in ${activityTitle} has been approved!`;

    // Realtime events
    emitToUser(employeeId, 'notification:new', { title, message, type: 'CSR_APPROVED', xpAwarded: xpReward, activityTitle });
    emitToAll('activity:feed', { type: 'CSR_APPROVED', employeeName, activityTitle });

    // Check and award badges (async, non-blocking side-effect)
    checkAndAwardBadges(employeeId);

    // Recalculate scores upon approval
    if (participation.employee.departmentId) {
      await ScoringEngine.recalculateAndEmit(participation.employee.departmentId);
    }

    return res.json({ success: true, data: updatedParticipation });
  } catch (error: any) {
    console.error('[Social] Error approving participation:', error);
    return res.status(500).json({ success: false, error: error.message || 'Failed to approve participation' });
  }
});

// PATCH /participations/:id/reject - Reject participation
router.patch('/participations/:id/reject', requireAuth, requireRole('ADMIN', 'MANAGER'), async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const participation = await prisma.employeeParticipation.findUnique({
      where: { id },
      include: {
        activity: true
      }
    });

    if (!participation) {
      return res.status(404).json({ success: false, error: 'Participation not found' });
    }

    if (participation.approvalStatus !== 'PENDING') {
      return res.status(400).json({ success: false, error: 'Participation is not pending approval' });
    }

    const employeeId = participation.employeeId;
    const activityTitle = participation.activity.title;

    const updatedParticipation = await prisma.$transaction(async (tx) => {
      const p = await tx.employeeParticipation.update({
        where: { id },
        data: {
          approvalStatus: 'REJECTED'
        }
      });

      const title = 'Participation Rejected';
      const message = `Your participation in ${activityTitle} was not approved.`;

      await tx.notification.create({
        data: {
          userId: employeeId,
          type: 'CSR_REJECTED',
          title,
          message
        }
      });

      return p;
    });

    const title = 'Participation Rejected';
    const message = `Your participation in ${activityTitle} was not approved.`;

    emitToUser(employeeId, 'notification:new', { title, message });

    return res.json({ success: true, data: updatedParticipation });
  } catch (error: any) {
    console.error('[Social] Error rejecting participation:', error);
    return res.status(500).json({ success: false, error: error.message || 'Failed to reject participation' });
  }
});

export default router;
