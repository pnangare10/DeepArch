import { Router } from 'express';
import { SearchService } from '../services/searchService.js';
import { PrismaNodeRepository } from '../repositories/prisma/PrismaNodeRepository.js';

const router = Router();
const service = new SearchService(new PrismaNodeRepository());

router.get('/:projectId/search', async (req, res, next) => {
  try {
    const query = req.query.q as string;
    if (!query) {
      res.json([]);
      return;
    }
    const results = await service.search(req.params.projectId, query);
    res.json(results);
  } catch (err) {
    next(err);
  }
});

export { router as searchRoutes };
