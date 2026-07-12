import { Router } from 'express';
import { z } from 'zod';
import multer from 'multer';
import * as path from 'path';
import * as fs from 'fs';
import prisma from '../lib/prisma';
import { validate } from '../middleware/validate';
import { requireAuth, requireRole, AuthRequest } from '../middleware/auth';
import { BadgeAwardEngine } from '../services/BadgeAwardEngine';
import { ScoringEngine } from '../services/ScoringEngine';
import { createNotification } from '../services/NotificationService';
import { emitToAll, emitToUser } from '../socket/eventBus';

const router = Router();

// Configure Multer for local proof file uploads
const uploadDir = process.env.UPLOAD_DIR || './uploads';
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req: any, file: any, cb: any) => {
    cb(null, uploadDir);
  },
  filename: (req: any, file: any, cb: any) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req: any, file: any, cb: any) => {
    const filetypes = /jpeg|jpg|png|pdf/;
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = filetypes.test(file.mimetype);
    if (mimetype && extname) {
      return cb(null, true);
    }
    cb(new Error('Only images (jpg/jpeg/png) or PDF files are allowed'));
  },
});

// Validation Schemas
const createActivitySchema = z.object({
  title: z.string().min(2, 'Title must be at least 2 characters'),
  categoryId: z.string().uuid(),
  description: z.string().min(5, 'Description must be at least 5 characters'),
  evidenceRequired: z.boolean().optional(),
  maxParticipants: z.number().int().positive().optional().nullable(),
  xpReward: z.number().int().nonnegative('XP reward must be positive'),
  deadline: z.string().transform((val) => new Date(val)).optional().nullable(),
});

// ─────────────────────────────────────────
// CSR ACTIVITIES
// ─────────────────────────────────────────

router.get('/activities', requireAuth, async (req, res) => {
  try {
    const activities = await prisma.csrActivity.findMany({
      include: {
        category: true,
        participations: {
          include: {
            employee: { select: { id: true, name: true, email: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
    return res.json({ success: true, data: activities });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/activities', requireAuth, requireRole('ADMIN', 'MANAGER'), validate(createActivitySchema), async (req: AuthRequest, res) => {
  const { title, categoryId, description, evidenceRequired, maxParticipants, xpReward, deadline } = req.body;

  try {
    const activity = await prisma.csrActivity.create({
      data: {
        title,
        categoryId,
        description,
        evidenceRequired: evidenceRequired || false,
        maxParticipants: maxParticipants || null,
        xpReward: xpReward || 50,
        deadline,
        status: 'ACTIVE',
        createdById: req.user!.id,
      },
    });
    return res.status(201).json({ success: true, data: activity });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// ─────────────────────────────────────────
// JOIN drive / PARTICIPATION
// ─────────────────────────────────────────

router.post('/activities/:id/join', requireAuth, upload.single('proof'), async (req: AuthRequest, res) => {
  const activityId = req.params.id;
  const userId = req.user!.id;
  const { notes } = req.body;
  const file = req.file;

  try {
    const activity = await prisma.csrActivity.findUnique({
      where: { id: activityId },
    });
    if (!activity) {
      return res.status(404).json({ success: false, error: 'CSR activity not found' });
    }

    if (activity.status !== 'ACTIVE') {
      return res.status(400).json({ success: false, error: 'Activity is not active' });
    }

    if (activity.evidenceRequired && !file) {
      return res.status(400).json({ success: false, error: 'Evidence file proof is required for this activity' });
    }

    // Check if user already joined
    const existing = await prisma.employeeParticipation.findFirst({
      where: { activityId, employeeId: userId },
    });
    if (existing) {
      return res.status(400).json({ success: false, error: 'You have already requested to join or completed this activity' });
    }

    // Create participation
    const participation = await prisma.employeeParticipation.create({
      data: {
        activityId,
        employeeId: userId,
        proofUrl: file ? `/uploads/${file.filename}` : null,
        notes: notes || null,
        approvalStatus: 'PENDING',
      },
      include: {
        activity: true,
      },
    });

    // Notify administrators/managers
    await createNotification({
      userId: activity.createdById || userId, // Fallback if no creator
      type: 'POLICY_REMINDER', // general category alert
      title: 'New CSR Join Request',
      message: `Employee requested approval for: "${activity.title}".`,
      refType: 'EmployeeParticipation',
      refId: participation.id,
    });

    return res.status(201).json({ success: true, data: participation });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// Managers pending list
router.get('/participations/pending', requireAuth, requireRole('ADMIN', 'MANAGER'), async (req, res) => {
  try {
    const pendings = await prisma.employeeParticipation.findMany({
      where: { approvalStatus: 'PENDING' },
      include: {
        activity: true,
        employee: {
          select: {
            id: true,
            name: true,
            email: true,
            department: { select: { id: true, name: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
    return res.json({ success: true, data: pendings });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// Approve Participation
router.patch('/participations/:id/approve', requireAuth, requireRole('ADMIN', 'MANAGER'), async (req: AuthRequest, res) => {
  const { id } = req.params;

  try {
    const part = await prisma.employeeParticipation.findUnique({
      where: { id },
      include: { activity: true, employee: true },
    });
    if (!part) {
      return res.status(404).json({ success: false, error: 'Participation log not found' });
    }
    if (part.approvalStatus !== 'PENDING') {
      return res.status(400).json({ success: false, error: 'Participation already processed' });
    }

    const updated = await prisma.$transaction(async (tx) => {
      const xpAward = Number(part.activity.xpReward);
      const p = await tx.employeeParticipation.update({
        where: { id },
        data: { 
          approvalStatus: 'APPROVED',
          pointsEarned: xpAward,
          completionDate: new Date()
        },
      });
      const user = await tx.user.update({
        where: { id: part.employeeId },
        data: {
          xp: { increment: xpAward },
          pointsBalance: { increment: xpAward },
        },
      });

      // 3. Create Notification
      await createNotification({
        userId: part.employeeId,
        type: 'CSR_APPROVED',
        title: 'CSR Participation Approved!',
        message: `Your participation in "${part.activity.title}" was approved. +${xpAward} XP / Points added.`,
        refType: 'CsrActivity',
        refId: part.activityId,
      });

      return { p, user };
    });

    // 4. Trigger Badge Award Engine
    await BadgeAwardEngine.checkAndAwardBadges(part.employeeId);

    // 5. Recalculate Department & Org ESG Scores
    if (part.employee.departmentId) {
      await ScoringEngine.recalculateAndEmit(part.employee.departmentId);
    }

    // 6. Broadcast event
    emitToUser(part.employeeId, 'user:update', updated.user);
    emitToAll('activity:feed', {
      type: 'CSR_COMPLETED',
      message: `${part.employee.name} completed the CSR activity: "${part.activity.title}"!`,
      timestamp: new Date(),
    });

    return res.json({ success: true, data: updated.p });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// Reject Participation
router.patch('/participations/:id/reject', requireAuth, requireRole('ADMIN', 'MANAGER'), async (req: AuthRequest, res) => {
  const { id } = req.params;
  const { notes } = req.body;

  try {
    const part = await prisma.employeeParticipation.findUnique({
      where: { id },
      include: { activity: true },
    });
    if (!part) {
      return res.status(404).json({ success: false, error: 'Participation log not found' });
    }
    if (part.approvalStatus !== 'PENDING') {
      return res.status(400).json({ success: false, error: 'Participation already processed' });
    }

    const updated = await prisma.employeeParticipation.update({
      where: { id },
      data: {
        approvalStatus: 'REJECTED',
        notes: notes || 'Rejected by manager',
      },
    });

    // Create Notification
    await createNotification({
      userId: part.employeeId,
      type: 'CSR_REJECTED',
      title: 'CSR Request Rejected',
      message: `Your request for "${part.activity.title}" was rejected: ${notes || 'Proof insufficient.'}`,
      refType: 'CsrActivity',
      refId: part.activityId,
    });

    return res.json({ success: true, data: updated });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
