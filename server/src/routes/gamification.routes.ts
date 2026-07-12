import { Router, Response } from 'express';
import { z } from 'zod';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import prisma from '../lib/prisma';
import { requireAuth, requireRole, AuthRequest } from '../middleware/auth';
import { emitToAll, emitToUser } from '../socket/eventBus';
import { checkAndAwardBadges } from '../services/BadgeAwardEngine';

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
const createChallengeSchema = z.object({
  title: z.string({ required_error: 'Title is required' }).min(1, 'Title cannot be empty'),
  categoryId: z.string({ required_error: 'Category ID is required' }),
  description: z.string({ required_error: 'Description is required' }).min(1, 'Description cannot be empty'),
  xp: z.number().int().nonnegative(),
  difficulty: z.enum(['EASY', 'MEDIUM', 'HARD']),
  evidenceRequired: z.boolean().default(false),
  deadline: z.string().optional().nullable()
});

// Helper to clean up uploaded files on error
const cleanupUploadedFile = (req: AuthRequest) => {
  if (req.file) {
    try {
      fs.unlinkSync(req.file.path);
    } catch (err) {
      console.error('[Gamification] Failed to clean up uploaded file:', err);
    }
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// CHALLENGES
// ─────────────────────────────────────────────────────────────────────────────

// GET /challenges - List all challenges
router.get('/challenges', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const statusParam = req.query.status as string;
    const where: any = {};

    if (statusParam) {
      const validStatuses = ['DRAFT', 'ACTIVE', 'UNDER_REVIEW', 'COMPLETED', 'ARCHIVED'];
      if (!validStatuses.includes(statusParam)) {
        return res.status(400).json({ success: false, error: 'Invalid status parameter' });
      }
      where.status = statusParam;
    }

    const rawChallenges = await prisma.challenge.findMany({
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

    const challenges = rawChallenges.map(challenge => {
      const { participations, ...rest } = challenge;
      const currentUserParticipation = participations.find(p => p.employeeId === req.user?.id);
      const joinStatus = currentUserParticipation ? currentUserParticipation.approvalStatus : null;

      return {
        ...rest,
        participantsCount: participations.length,
        joinStatus
      };
    });

    return res.json({ success: true, data: challenges });
  } catch (error: any) {
    console.error('[Gamification] Error fetching challenges:', error);
    return res.status(500).json({ success: false, error: error.message || 'Failed to fetch challenges' });
  }
});

// POST /challenges - Create a challenge
router.post('/challenges', requireAuth, requireRole('ADMIN', 'MANAGER'), async (req: AuthRequest, res: Response) => {
  try {
    const parsed = createChallengeSchema.parse(req.body);

    if (!req.user) {
      return res.status(401).json({ success: false, error: 'Unauthorized: Missing user information' });
    }

    const challenge = await prisma.challenge.create({
      data: {
        title: parsed.title,
        categoryId: parsed.categoryId,
        description: parsed.description,
        xp: parsed.xp,
        difficulty: parsed.difficulty,
        evidenceRequired: parsed.evidenceRequired,
        deadline: parsed.deadline ? new Date(parsed.deadline) : null,
        status: 'DRAFT',
        createdById: req.user.id
      }
    });

    return res.status(201).json({ success: true, data: challenge });
  } catch (error: any) {
    console.error('[Gamification] Error creating challenge:', error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ success: false, error: error.errors[0]?.message || 'Validation failed' });
    }
    return res.status(500).json({ success: false, error: error.message || 'Failed to create challenge' });
  }
});

// PATCH /challenges/:id/status - Update challenge status
router.patch('/challenges/:id/status', requireAuth, requireRole('ADMIN', 'MANAGER'), async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { status: newStatus } = req.body;

    if (!newStatus) {
      return res.status(400).json({ success: false, error: 'Status is required' });
    }

    const challenge = await prisma.challenge.findUnique({
      where: { id }
    });

    if (!challenge) {
      return res.status(404).json({ success: false, error: 'Challenge not found' });
    }

    const currentStatus = challenge.status;
    const validStatuses = ['DRAFT', 'ACTIVE', 'UNDER_REVIEW', 'COMPLETED', 'ARCHIVED'];
    if (!validStatuses.includes(newStatus)) {
      return res.status(400).json({ success: false, error: 'Invalid status value' });
    }

    let isValidTransition = false;
    if (newStatus === 'ARCHIVED') {
      isValidTransition = true;
    } else if (newStatus === 'ACTIVE') {
      isValidTransition = ['DRAFT', 'ARCHIVED', 'COMPLETED', 'UNDER_REVIEW'].includes(currentStatus);
    } else if (newStatus === 'UNDER_REVIEW') {
      isValidTransition = currentStatus === 'ACTIVE';
    } else if (newStatus === 'COMPLETED') {
      isValidTransition = ['ACTIVE', 'UNDER_REVIEW'].includes(currentStatus);
    }

    if (!isValidTransition) {
      return res.status(400).json({
        success: false,
        error: `Invalid transition from ${currentStatus} to ${newStatus}`
      });
    }

    const updatedChallenge = await prisma.challenge.update({
      where: { id },
      data: { status: newStatus }
    });

    return res.json({ success: true, data: updatedChallenge });
  } catch (error: any) {
    console.error('[Gamification] Error updating challenge status:', error);
    return res.status(500).json({ success: false, error: error.message || 'Failed to update challenge status' });
  }
});

// POST /challenges/:id/join - Join a challenge
router.post('/challenges/:id/join', requireAuth, upload.single('proof'), async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    if (!req.user) {
      cleanupUploadedFile(req);
      return res.status(401).json({ success: false, error: 'Unauthorized: Missing user information' });
    }

    const challenge = await prisma.challenge.findUnique({
      where: { id }
    });

    if (!challenge) {
      cleanupUploadedFile(req);
      return res.status(404).json({ success: false, error: 'Challenge not found' });
    }

    if (challenge.status !== 'ACTIVE') {
      cleanupUploadedFile(req);
      return res.status(400).json({ success: false, error: 'Challenge is not active' });
    }

    // Check if already joined
    const existingPart = await prisma.challengePart.findUnique({
      where: {
        challengeId_employeeId: {
          challengeId: id,
          employeeId: req.user.id
        }
      }
    });

    if (existingPart) {
      cleanupUploadedFile(req);
      return res.status(400).json({ success: false, error: 'Already joined this challenge' });
    }

    if (challenge.evidenceRequired && !req.file) {
      return res.status(400).json({ success: false, error: 'Proof file required' });
    }

    const participation = await prisma.challengePart.create({
      data: {
        challengeId: id,
        employeeId: req.user.id,
        approvalStatus: 'PENDING',
        proofUrl: req.file ? req.file.filename : null
      }
    });

    return res.status(201).json({ success: true, data: participation });
  } catch (error: any) {
    cleanupUploadedFile(req);
    console.error('[Gamification] Error joining challenge:', error);
    return res.status(500).json({ success: false, error: error.message || 'Failed to join challenge' });
  }
});

// GET /challenges/participations - Get all pending challenge participations
router.get('/challenges/participations', requireAuth, requireRole('ADMIN', 'MANAGER'), async (req: AuthRequest, res: Response) => {
  try {
    const participations = await prisma.challengePart.findMany({
      where: {
        approvalStatus: 'PENDING'
      },
      include: {
        employee: {
          select: { name: true }
        },
        challenge: {
          select: { title: true }
        }
      }
    });

    const data = participations.map(p => ({
      id: p.id,
      challengeId: p.challengeId,
      challengeTitle: p.challenge?.title || '',
      employeeId: p.employeeId,
      employeeName: p.employee?.name || '',
      proofUrl: p.proofUrl,
      approvalStatus: p.approvalStatus,
      xpAwarded: p.xpAwarded,
      createdAt: p.createdAt
    }));

    return res.json({ success: true, data });
  } catch (error: any) {
    console.error('[Gamification] Error fetching pending challenge participations:', error);
    return res.status(500).json({ success: false, error: error.message || 'Failed to fetch pending participations' });
  }
});

// PATCH /challenges/participations/:id/approve - Approve challenge participation
router.patch('/challenges/participations/:id/approve', requireAuth, requireRole('ADMIN', 'MANAGER'), async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const participation = await prisma.challengePart.findUnique({
      where: { id },
      include: {
        challenge: true,
        employee: true
      }
    });

    if (!participation) {
      return res.status(404).json({ success: false, error: 'Participation not found' });
    }

    // Allow Admin/Manager to approve regardless of previous status, only awarding points if not already approved
    const wasAlreadyApproved = participation.approvalStatus === 'APPROVED';
    const challengeXp = participation.challenge.xp;
    const employeeId = participation.employeeId;
    const challengeTitle = participation.challenge.title;
    const employeeName = participation.employee.name;

    const updatedParticipation = await prisma.$transaction(async (tx) => {
      const p = await tx.challengePart.update({
        where: { id },
        data: {
          approvalStatus: 'APPROVED',
          xpAwarded: challengeXp
        }
      });

      if (!wasAlreadyApproved) {
        await tx.user.update({
          where: { id: employeeId },
          data: {
            xp: { increment: challengeXp },
            pointsBalance: { increment: challengeXp }
          }
        });
      }

      return p;
    });

    if (!wasAlreadyApproved) {
      // Check and award badges side-effect
      checkAndAwardBadges(employeeId);

      // Create Notification
      const title = 'Challenge Approved!';
      const message = `Your submission for ${challengeTitle} has been approved!`;
      await prisma.notification.create({
        data: {
          userId: employeeId,
          type: 'CHALLENGE_APPROVED',
          title,
          message
        }
      });

      // Realtime events
      emitToUser(employeeId, 'notification:new', { title, message, type: 'CHALLENGE_APPROVED', xpAwarded: challengeXp, activityTitle: challengeTitle });
      emitToAll('leaderboard:update', {});
      emitToAll('activity:feed', { type: 'CHALLENGE_APPROVED', employeeName, challengeTitle });
    }

    return res.json({ success: true, data: updatedParticipation });
  } catch (error: any) {
    console.error('[Gamification] Error approving participation:', error);
    return res.status(500).json({ success: false, error: error.message || 'Failed to approve participation' });
  }
});

// PATCH /challenges/participations/:id/reject - Reject challenge participation
router.patch('/challenges/participations/:id/reject', requireAuth, requireRole('ADMIN', 'MANAGER'), async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const participation = await prisma.challengePart.findUnique({
      where: { id },
      include: {
        challenge: true
      }
    });

    if (!participation) {
      return res.status(404).json({ success: false, error: 'Participation not found' });
    }

    if (participation.approvalStatus !== 'PENDING') {
      return res.status(400).json({ success: false, error: 'Participation is not pending approval' });
    }

    const employeeId = participation.employeeId;
    const challengeTitle = participation.challenge.title;

    const updatedParticipation = await prisma.challengePart.update({
      where: { id },
      data: {
        approvalStatus: 'REJECTED'
      }
    });

    // Create Notification
    const title = 'Challenge Submission Rejected';
    const message = `Your submission for ${challengeTitle} was not approved.`;
    await prisma.notification.create({
      data: {
        userId: employeeId,
        type: 'CHALLENGE_REJECTED',
        title,
        message
      }
    });

    emitToUser(employeeId, 'notification:new', { title, message });

    return res.json({ success: true, data: updatedParticipation });
  } catch (error: any) {
    console.error('[Gamification] Error rejecting participation:', error);
    return res.status(500).json({ success: false, error: error.message || 'Failed to reject participation' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// LEADERBOARD
// ─────────────────────────────────────────────────────────────────────────────

// GET /leaderboard - Return leaderboard ordered by XP
router.get('/leaderboard', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const users = await prisma.user.findMany({
      orderBy: {
        xp: 'desc'
      },
      select: {
        id: true,
        name: true,
        departmentId: true,
        xp: true,
        pointsBalance: true,
        _count: {
          select: {
            badgeAwards: true
          }
        }
      }
    });

    const leaderboard = users.map(u => ({
      id: u.id,
      name: u.name,
      departmentId: u.departmentId,
      xp: u.xp,
      pointsBalance: u.pointsBalance,
      badgeCount: u._count.badgeAwards
    }));

    return res.json({ success: true, data: leaderboard });
  } catch (error: any) {
    console.error('[Gamification] Error fetching leaderboard:', error);
    return res.status(500).json({ success: false, error: error.message || 'Failed to fetch leaderboard' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// BADGES
// ─────────────────────────────────────────────────────────────────────────────

// GET /badges - List all badges, including earned status for current user
router.get('/badges', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, error: 'Unauthorized: Missing user information' });
    }

    const allBadges = await prisma.badge.findMany();
    const earnedAwards = await prisma.badgeAward.findMany({
      where: { employeeId: req.user.id },
      select: { badgeId: true }
    });

    const earnedBadgeIds = new Set(earnedAwards.map(a => a.badgeId));

    const badges = allBadges.map(b => ({
      ...b,
      earned: earnedBadgeIds.has(b.id)
    }));

    return res.json({ success: true, data: badges });
  } catch (error: any) {
    console.error('[Gamification] Error fetching badges:', error);
    return res.status(500).json({ success: false, error: error.message || 'Failed to fetch badges' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// REWARDS
// ─────────────────────────────────────────────────────────────────────────────

// GET /rewards - Get all active rewards
router.get('/rewards', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const rewards = await prisma.reward.findMany({
      where: {
        status: 'ACTIVE'
      }
    });
    return res.json({ success: true, data: rewards });
  } catch (error: any) {
    console.error('[Gamification] Error fetching rewards:', error);
    return res.status(500).json({ success: false, error: error.message || 'Failed to fetch rewards' });
  }
});

// POST /rewards/:id/redeem - Redeem a reward
router.post('/rewards/:id/redeem', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    if (!req.user) {
      return res.status(401).json({ success: false, error: 'Unauthorized: Missing user information' });
    }

    const result = await prisma.$transaction(async (tx) => {
      const reward = await tx.reward.findUnique({ where: { id } });
      if (!reward || reward.status !== 'ACTIVE') {
        throw new Error('Reward not available');
      }
      if (reward.stock <= 0) {
        throw new Error('Out of stock');
      }

      const user = await tx.user.findUnique({ where: { id: req.user!.id } });
      if (!user) {
        throw new Error('User not found');
      }
      if (user.pointsBalance < reward.pointsRequired) {
        throw new Error('Insufficient points');
      }

      // Decrement stock
      await tx.reward.update({
        where: { id },
        data: { stock: { decrement: 1 } }
      });

      // Deduct points
      const updatedUser = await tx.user.update({
        where: { id: req.user!.id },
        data: { pointsBalance: { decrement: reward.pointsRequired } }
      });

      // Create redemption record
      const redemption = await tx.rewardRedemption.create({
        data: {
          rewardId: id,
          employeeId: req.user!.id,
          pointsSpent: reward.pointsRequired,
          status: 'FULFILLED'
        }
      });

      return {
        redemption,
        newBalance: updatedUser.pointsBalance,
        rewardName: reward.name,
        pointsRequired: reward.pointsRequired
      };
    });

    // Create Notification
    const title = 'Reward Redeemed!';
    const message = `You redeemed ${result.rewardName}. ${result.pointsRequired} points deducted.`;
    await prisma.notification.create({
      data: {
        userId: req.user.id,
        type: 'REWARD_REDEEMED',
        title,
        message
      }
    });

    return res.json({
      success: true,
      data: {
        redemption: result.redemption,
        newBalance: result.newBalance
      }
    });
  } catch (error: any) {
    console.error('[Gamification] Error redeeming reward:', error);
    return res.status(400).json({ success: false, error: error.message || 'Failed to redeem reward' });
  }
});

export default router;
