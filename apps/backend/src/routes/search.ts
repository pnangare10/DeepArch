import { Router, type Request, type Response, type NextFunction } from 'express';
import { SearchService } from '../services/searchService.js';
import { PrismaNodeRepository } from '../repositories/prisma/PrismaNodeRepository.js';
import { authMiddleware } from '../middleware/authMiddleware.js';

const router = Router();
const service = new SearchService(new PrismaNodeRepository());

router.use(authMiddleware);

router.get('/:projectId/search', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const query = typeof req.query.q === 'string' ? req.query.q : '';
    if (!query) {
      res.json([]);
      return;
    }
    const results = await service.search(req.params['projectId'] as string, query);
    res.json(results);
  } catch (err) {
    next(err);
  }
});

export { router as searchRoutes };
