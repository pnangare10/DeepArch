import { Router } from 'express';
import { authMiddleware } from '../middleware/authMiddleware.js';
import { PrismaUserRepository } from '../repositories/prisma/PrismaUserRepository.js';

const router = Router();
const userRepo = new PrismaUserRepository();

// PATCH /api/users/preferences
router.patch('/preferences', authMiddleware, async (req, res, next) => {
  try {
    const userId = req.user!.userId;
    const { themePreference } = req.body;
    await userRepo.updatePreferences(userId, { themePreference });
    res.json({ themePreference });
  } catch (err) {
    next(err);
  }
});

export default router;
