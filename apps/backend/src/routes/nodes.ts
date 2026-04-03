import { Router } from 'express';
import { NodeService } from '../services/nodeService.js';
import { PrismaNodeRepository } from '../repositories/prisma/PrismaNodeRepository.js';

const router = Router();
const service = new NodeService(new PrismaNodeRepository());

router.get('/:projectId/nodes', async (req, res, next) => {
  try {
    const parentId = req.query.parentId as string | undefined;
    const nodes = await service.getByParent(
      req.params.projectId,
      parentId === 'null' || parentId === undefined ? null : parentId,
    );
    res.json(nodes);
  } catch (err) {
    next(err);
  }
});

router.post('/:projectId/nodes', async (req, res, next) => {
  try {
    const node = await service.create(req.params.projectId, req.body);
    res.status(201).json(node);
  } catch (err) {
    next(err);
  }
});

router.patch('/:projectId/nodes/batch', async (req, res, next) => {
  try {
    await service.batchUpdatePositions(req.body);
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

router.patch('/:projectId/nodes/:nodeId', async (req, res, next) => {
  try {
    const node = await service.update(req.params.nodeId, req.body);
    res.json(node);
  } catch (err) {
    next(err);
  }
});

router.delete('/:projectId/nodes/:nodeId', async (req, res, next) => {
  try {
    const node = await service.delete(req.params.nodeId);
    res.json(node);
  } catch (err) {
    next(err);
  }
});

export { router as nodeRoutes };
