import { Router } from 'express';
import prisma from '../lib/prisma';
import { requireAuth, AuthRequest } from '../middleware/auth';

const router = Router();

// GET /api/notifications - Fetch user notifications
router.get('/', requireAuth, async (req: AuthRequest, res) => {
  const userId = req.user!.id;

  try {
    const list = await prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
    return res.json({ success: true, data: list });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/notifications/:id/read - Mark notification as read
router.post('/:id/read', requireAuth, async (req, res) => {
  const { id } = req.params;

  try {
    const updated = await prisma.notification.update({
      where: { id },
      data: { isRead: true },
    });
    return res.json({ success: true, data: updated });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
