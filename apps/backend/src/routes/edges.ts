import { Router } from 'express';
import { EdgeService } from '../services/edgeService.js';
import { PrismaEdgeRepository } from '../repositories/prisma/PrismaEdgeRepository.js';
import { PrismaNodeRepository } from '../repositories/prisma/PrismaNodeRepository.js';

const router = Router();
const service = new EdgeService(new PrismaEdgeRepository(), new PrismaNodeRepository());

router.get('/:projectId/edges', async (req, res, next) => {
  try {
    const parentId = req.query.parentId as string | undefined;
    const edges = await service.getByParent(
      req.params.projectId,
      parentId === 'null' || parentId === undefined ? null : parentId,
    );
    res.json(edges);
  } catch (err) {
    next(err);
  }
});

router.post('/:projectId/edges', async (req, res, next) => {
  try {
    const edge = await service.create(req.params.projectId, req.body);
    res.status(201).json(edge);
  } catch (err) {
    next(err);
  }
});

router.patch('/:projectId/edges/:edgeId', async (req, res, next) => {
  try {
    const edge = await service.update(req.params.edgeId, req.body);
    res.json(edge);
  } catch (err) {
    next(err);
  }
});

router.delete('/:projectId/edges/:edgeId', async (req, res, next) => {
  try {
    await service.delete(req.params.edgeId);
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});

export { router as edgeRoutes };
