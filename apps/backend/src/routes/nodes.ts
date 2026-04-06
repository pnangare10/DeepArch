import { Router } from 'express';
import { NodeService } from '../services/nodeService.js';
import { PrismaNodeRepository } from '../repositories/prisma/PrismaNodeRepository.js';
import { authMiddleware } from '../middleware/authMiddleware.js';
import { getMemberRole } from '../services/memberService.js';
import { AppError } from '../middleware/errorHandler.js';

const router = Router();
const service = new NodeService(new PrismaNodeRepository());

router.use(authMiddleware);

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

// GET single node — includes drill-in access check based on node metadata roles
router.get('/:projectId/nodes/:nodeId', async (req, res, next) => {
  try {
    const node = await service.getById(req.params.nodeId);
    const userRole = await getMemberRole(req.params.projectId, req.user!.userId);
    if (!userRole) return next(new AppError(403, 'You do not have access to this project'));

    if (userRole !== 'owner') {
      const meta = (node.metadata as unknown) as Record<string, unknown> ?? {};
      const accessInclude = (meta.accessInclude as string[] | undefined) ?? [];
      const accessExclude = (meta.accessExclude as string[] | undefined) ?? [];

      let blocked = false;
      if (accessInclude.length > 0) {
        blocked = !accessInclude.includes(userRole);
      } else if (accessExclude.length > 0) {
        blocked = accessExclude.includes(userRole);
      }

      if (blocked) {
        const requiredRoles = accessInclude.length > 0 ? accessInclude : [];
        return res.status(403).json({
          error: `This block requires [${requiredRoles.join(', ')}] access.`,
          blockedRoles: requiredRoles,
          accessInclude,
          accessExclude,
        });
      }
    }

    res.json(node);
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
