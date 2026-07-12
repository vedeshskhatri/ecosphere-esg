import { Router } from 'express';
import { z } from 'zod';
import multer from 'multer';
import * as path from 'path';
import * as fs from 'fs';
import prisma from '../lib/prisma';
import { validate } from '../middleware/validate';
import { requireAuth, requireRole, AuthRequest } from '../middleware/auth';
import { RewardRedemptionService } from '../services/RewardRedemption';
import { BadgeAwardEngine } from '../services/BadgeAwardEngine';
import { createNotification } from '../services/NotificationService';
import { emitToAll, emitToUser } from '../socket/eventBus';

const router = Router();

// Configure Multer for challenge proof uploads
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
    cb(null, 'challenge-' + file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
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
const createChallengeSchema = z.object({
  title: z.string().min(2, 'Title must be at least 2 characters'),
  categoryId: z.string().uuid(),
  description: z.string().min(5, 'Description must be at least 5 characters'),
  xp: z.number().int().positive('XP reward must be positive'),
  difficulty: z.enum(['EASY', 'MEDIUM', 'HARD']),
  evidenceRequired: z.boolean().optional(),
  deadline: z.string().transform((val) => new Date(val)).optional().nullable(),
});

const updateChallengeStatusSchema = z.object({
  status: z.enum(['DRAFT', 'ACTIVE', 'COMPLETED']),
});

const updateProgressSchema = z.object({
  progress: z.preprocess(
    (val) => Number(val),
    z.number().int().min(0).max(100)
  ),
  notes: z.string().optional().nullable(),
});

const redeemRewardSchema = z.object({
  rewardId: z.string().uuid(),
});

// ─────────────────────────────────────────
// CHALLENGES
// ─────────────────────────────────────────

router.get('/challenges', requireAuth, async (req, res) => {
  try {
    const challenges = await prisma.challenge.findMany({
      include: {
        category: true,
        participations: {
          include: {
            employee: { select: { id: true, name: true, email: true, departmentId: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
    return res.json({ success: true, data: challenges });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/challenges', requireAuth, requireRole('ADMIN', 'MANAGER'), validate(createChallengeSchema), async (req: AuthRequest, res) => {
  const { title, categoryId, description, xp, difficulty, evidenceRequired, deadline } = req.body;
  try {
    const challenge = await prisma.challenge.create({
      data: {
        title,
        categoryId,
        description,
        xp,
        difficulty,
        evidenceRequired: evidenceRequired || false,
        deadline,
        status: 'DRAFT',
        createdById: req.user!.id,
      },
    });
    return res.status(201).json({ success: true, data: challenge });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

router.put('/challenges/:id/status', requireAuth, requireRole('ADMIN', 'MANAGER'), validate(updateChallengeStatusSchema), async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  try {
    const challenge = await prisma.challenge.update({
      where: { id },
      data: { status },
    });
    return res.json({ success: true, data: challenge });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// ─────────────────────────────────────────
// CHALLENGE PARTICIPATIONS
// ─────────────────────────────────────────

router.post('/challenges/:id/join', requireAuth, async (req: AuthRequest, res) => {
  const challengeId = req.params.id;
  const userId = req.user!.id;

  try {
    const challenge = await prisma.challenge.findUnique({ where: { id: challengeId } });
    if (!challenge) {
      return res.status(404).json({ success: false, error: 'Challenge not found' });
    }
    if (challenge.status !== 'ACTIVE') {
      return res.status(400).json({ success: false, error: 'Challenge is not currently active' });
    }

    const existing = await prisma.challengePart.findFirst({
      where: { challengeId, employeeId: userId },
    });
    if (existing) {
      return res.status(400).json({ success: false, error: 'Already joined this challenge' });
    }

    const participation = await prisma.challengePart.create({
      data: {
        challengeId,
        employeeId: userId,
        progress: 0,
        approvalStatus: 'PENDING',
      },
    });

    return res.status(201).json({ success: true, data: participation });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/challenges/:id/progress', requireAuth, upload.single('proof'), validate(updateProgressSchema), async (req: AuthRequest, res) => {
  const challengeId = req.params.id;
  const userId = req.user!.id;
  const { progress, notes } = req.body;
  const file = req.file;

  try {
    const challenge = await prisma.challenge.findUnique({ where: { id: challengeId } });
    if (!challenge) {
      return res.status(404).json({ success: false, error: 'Challenge not found' });
    }

    let participation = await prisma.challengePart.findFirst({
      where: { challengeId, employeeId: userId },
    });

    if (!participation) {
      // Auto-join if not already joined
      participation = await prisma.challengePart.create({
        data: { challengeId, employeeId: userId, progress: 0, approvalStatus: 'PENDING' },
      });
    }

    if (participation.approvalStatus === 'APPROVED') {
      return res.status(400).json({ success: false, error: 'Challenge already marked completed and approved' });
    }

    if (challenge.evidenceRequired && progress >= 100 && !file) {
      return res.status(400).json({ success: false, error: 'Evidence file proof is required for 100% completion of this challenge' });
    }

    const isCompleteSubmit = progress >= 100;

    const updated = await prisma.challengePart.update({
      where: { id: participation.id },
      data: {
        progress,
        proofUrl: file ? `/uploads/${file.filename}` : participation.proofUrl,
        approvalStatus: isCompleteSubmit ? 'PENDING' : 'PENDING', // Keep pending for verification
      },
    });

    if (isCompleteSubmit) {
      // Notify managers
      await createNotification({
        userId: challenge.createdById || userId,
        type: 'POLICY_REMINDER', // general category alert
        title: 'Challenge Completion Awaiting Review',
        message: `Employee completed challenge: "${challenge.title}". Review proof.`,
        refType: 'ChallengePart',
        refId: updated.id,
      });
    }

    return res.json({ success: true, data: updated });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// Managers pending list
router.get('/completions/pending', requireAuth, requireRole('ADMIN', 'MANAGER'), async (req, res) => {
  try {
    const pendings = await prisma.challengePart.findMany({
      where: {
        progress: 100,
        approvalStatus: 'PENDING',
      },
      include: {
        challenge: true,
        employee: {
          select: {
            id: true,
            name: true,
            email: true,
            department: { select: { id: true, name: true } },
          },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });
    return res.json({ success: true, data: pendings });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// Approve Challenge
router.patch('/completions/:id/approve', requireAuth, requireRole('ADMIN', 'MANAGER'), async (req: AuthRequest, res) => {
  const { id } = req.params;

  try {
    const comp = await prisma.challengePart.findUnique({
      where: { id },
      include: { challenge: true, employee: true },
    });
    if (!comp) {
      return res.status(404).json({ success: false, error: 'Challenge log not found' });
    }
    if (comp.approvalStatus !== 'PENDING') {
      return res.status(400).json({ success: false, error: 'Completion already processed' });
    }

    const updated = await prisma.$transaction(async (tx) => {
      // 1. Approve completion
      const c = await tx.challengePart.update({
        where: { id },
        data: { approvalStatus: 'APPROVED' },
      });

      // 2. Add XP & points to employee
      const xpVal = Number(comp.challenge.xp);
      const user = await tx.user.update({
        where: { id: comp.employeeId },
        data: {
          xp: { increment: xpVal },
          pointsBalance: { increment: xpVal },
        },
      });

      // 3. Create Notification
      await createNotification({
        userId: comp.employeeId,
        type: 'CSR_APPROVED', // general success type
        title: 'Challenge Completion Approved!',
        message: `Your completion of "${comp.challenge.title}" was approved. +${xpVal} XP/Points.`,
        refType: 'Challenge',
        refId: comp.challengeId,
      });

      return { c, user };
    });

    // 4. Trigger Badge Award Engine
    await BadgeAwardEngine.checkAndAwardBadges(comp.employeeId);

    // 5. Broadcast websocket events
    emitToUser(comp.employeeId, 'user:update', updated.user);
    emitToAll('activity:feed', {
      type: 'CHALLENGE_COMPLETED',
      message: `${comp.employee.name} completed the challenge: "${comp.challenge.title}"!`,
      timestamp: new Date(),
    });

    return res.json({ success: true, data: updated.c });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// Reject Challenge
router.patch('/completions/:id/reject', requireAuth, requireRole('ADMIN', 'MANAGER'), async (req: AuthRequest, res) => {
  const { id } = req.params;
  const { notes } = req.body;

  try {
    const comp = await prisma.challengePart.findUnique({
      where: { id },
      include: { challenge: true },
    });
    if (!comp) {
      return res.status(404).json({ success: false, error: 'Challenge log not found' });
    }
    if (comp.approvalStatus !== 'PENDING') {
      return res.status(400).json({ success: false, error: 'Completion already processed' });
    }

    const updated = await prisma.challengePart.update({
      where: { id },
      data: {
        approvalStatus: 'REJECTED',
        progress: 0, // Reset progress to allow retry
      },
    });

    // Create Notification
    await createNotification({
      userId: comp.employeeId,
      type: 'CSR_REJECTED',
      title: 'Challenge Completion Rejected',
      message: `Your completion proof for "${comp.challenge.title}" was rejected: ${notes || 'Evidence insufficient.'}`,
      refType: 'Challenge',
      refId: comp.challengeId,
    });

    return res.json({ success: true, data: updated });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// ─────────────────────────────────────────
// REWARDS
// ─────────────────────────────────────────

router.get('/rewards', requireAuth, async (req, res) => {
  try {
    const rewards = await prisma.reward.findMany({
      orderBy: { name: 'asc' },
    });
    return res.json({ success: true, data: rewards });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/rewards/redeem', requireAuth, validate(redeemRewardSchema), async (req: AuthRequest, res) => {
  const { rewardId } = req.body;
  const userId = req.user!.id;

  try {
    const result = await RewardRedemptionService.redeemReward(userId, rewardId);
    return res.json({
      success: true,
      message: 'Redemption successful',
      data: result,
    });
  } catch (error: any) {
    return res.status(400).json({ success: false, error: error.message });
  }
});

// ─────────────────────────────────────────
// LEADERBOARD
// ─────────────────────────────────────────

router.get('/leaderboard', requireAuth, async (req, res) => {
  try {
    const leaderboard = await prisma.user.findMany({
      where: { status: 'ACTIVE' },
      select: {
        id: true,
        name: true,
        email: true,
        xp: true,
        pointsBalance: true,
        department: { select: { name: true } },
      },
      orderBy: { xp: 'desc' },
    });
    return res.json({ success: true, data: leaderboard });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
