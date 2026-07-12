import { Router } from 'express';

const router = Router();

// Placeholder for environmental routes
router.get('/', (req, res) => {
  res.json({ success: true, message: 'Environmental API placeholder' });
});

export default router;
