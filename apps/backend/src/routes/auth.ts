import { Router } from 'express';
import { AuthService } from '../services/authService.js';
import { PrismaUserRepository } from '../repositories/prisma/PrismaUserRepository.js';

const router = Router();
const authService = new AuthService(new PrismaUserRepository());

// POST /api/auth/register
router.post('/register', async (req, res, next) => {
  try {
    const result = await authService.register(req.body);
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
});

// POST /api/auth/login
router.post('/login', async (req, res, next) => {
  try {
    const result = await authService.login(req.body);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

export default router;
