import { Router } from 'express';
import { z } from 'zod';
import QRCode from 'qrcode';
import prisma from '../lib/prisma';
import { validate } from '../middleware/validate';
import { requireAuth, AuthRequest } from '../middleware/auth';
import { RewardRedemptionService } from '../services/RewardRedemption';
import { BadgeAwardEngine } from '../services/BadgeAwardEngine';

const router = Router();

const joinChallengeSchema = z.object({
  notes: z.string().optional().nullable(),
});

// ─────────────────────────────────────────
// CHALLENGES
// ─────────────────────────────────────────

// GET /api/gamification/challenges - List active challenges
router.get('/challenges', requireAuth, async (req, res) => {
  try {
    const challenges = await prisma.challenge.findMany({
      include: {
        category: { select: { name: true } },
        _count: { select: { participations: true } },
      },
      orderBy: { deadline: 'asc' },
    });
    return res.json({ success: true, data: challenges });
  } catch (error) {
    console.error('[Gamification] Error fetching challenges:', error);
    return res.status(500).json({ success: false, error: 'Failed to fetch challenges' });
  }
});

// GET /api/gamification/challenges/:id/qr - QR Code for mobile verification
router.get('/challenges/:id/qr', requireAuth, async (req, res) => {
  const { id } = req.params;
  const clientUrl = process.env.CLIENT_URL || 'http://localhost:3000';
  const joinUrl = `${clientUrl}/challenges/${id}/join`;

  try {
    // Generate base64 Data URL for the QR code image
    const qrCode = await QRCode.toDataURL(joinUrl);
    return res.json({ success: true, data: { qrCode, joinUrl } });
  } catch (error) {
    console.error('[Gamification] Error generating QR Code:', error);
    return res.status(500).json({ success: false, error: 'Failed to generate challenge QR code' });
  }
});

// POST /api/gamification/challenges/:id/join - Join challenge
router.post('/challenges/:id/join', requireAuth, validate(joinChallengeSchema), async (req: AuthRequest, res) => {
  const { id } = req.params;
  const userId = req.user?.id;
  const { notes } = req.body;

  if (!userId) {
    return res.status(401).json({ success: false, error: 'Unauthorized' });
  }

  try {
    const challenge = await prisma.challenge.findUnique({ where: { id } });
    if (!challenge) {
      return res.status(404).json({ success: false, error: 'Challenge not found' });
    }

    if (challenge.status !== 'ACTIVE') {
      return res.status(400).json({ success: false, error: 'Challenge is not currently active to join' });
    }

    // Upsert employee challenge participation
    const participation = await prisma.challengePart.upsert({
      where: {
        challengeId_employeeId: {
          challengeId: id,
          employeeId: userId,
        },
      },
      update: {},
      create: {
        challengeId: id,
        employeeId: userId,
        progress: 0,
        approvalStatus: 'PENDING',
        xpAwarded: 0,
      },
    });

    return res.json({ success: true, data: participation });
  } catch (error) {
    console.error('[Gamification] Error joining challenge:', error);
    return res.status(500).json({ success: false, error: 'Failed to join challenge' });
  }
});

// ─────────────────────────────────────────
// BADGES
// ─────────────────────────────────────────

// GET /api/gamification/badges - List badges
router.get('/badges', requireAuth, async (req, res) => {
  try {
    const badges = await prisma.badge.findMany({
      orderBy: { name: 'asc' },
    });
    return res.json({ success: true, data: badges });
  } catch (error) {
    console.error('[Gamification] Error fetching badges:', error);
    return res.status(500).json({ success: false, error: 'Failed to fetch badges' });
  }
});

// GET /api/gamification/badges/earned - Employee earned badges
router.get('/badges/earned', requireAuth, async (req: AuthRequest, res) => {
  const userId = req.user?.id;

  if (!userId) {
    return res.status(401).json({ success: false, error: 'Unauthorized' });
  }

  try {
    const awards = await prisma.badgeAward.findMany({
      where: { employeeId: userId },
      include: {
        badge: true,
      },
      orderBy: { awardedAt: 'desc' },
    });
    return res.json({ success: true, data: awards });
  } catch (error) {
    console.error('[Gamification] Error fetching earned awards:', error);
    return res.status(500).json({ success: false, error: 'Failed to fetch earned awards' });
  }
});

// ─────────────────────────────────────────
// REWARDS CATALOG & REDEMPTION
// ─────────────────────────────────────────

// GET /api/gamification/rewards - List active rewards
router.get('/rewards', requireAuth, async (req, res) => {
  try {
    const rewards = await prisma.reward.findMany({
      where: { status: 'ACTIVE' },
      orderBy: { pointsRequired: 'asc' },
    });
    return res.json({ success: true, data: rewards });
  } catch (error) {
    console.error('[Gamification] Error fetching rewards catalog:', error);
    return res.status(500).json({ success: false, error: 'Failed to fetch rewards catalog' });
  }
});

// POST /api/gamification/rewards/:id/redeem - Concurrency-safe points redemption
router.post('/rewards/:id/redeem', requireAuth, async (req: AuthRequest, res) => {
  const { id } = req.params;
  const userId = req.user?.id;

  if (!userId) {
    return res.status(401).json({ success: false, error: 'Unauthorized' });
  }

  try {
    const result = await RewardRedemptionService.redeemReward(userId, id);
    return res.json({ success: true, data: result });
  } catch (error: any) {
    console.error('[Gamification] Redemption failed:', error.message);
    return res.status(400).json({ success: false, error: error.message });
  }
});

export default router;
