import { Router } from 'express';

const router = Router();

// Placeholder for dashboard routes
router.get('/', (req, res) => {
  res.json({ success: true, message: 'Dashboard API placeholder' });
});

export default router;
