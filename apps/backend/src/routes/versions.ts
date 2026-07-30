import { Router } from 'express';
import { authMiddleware } from '../middleware/authMiddleware.js';
import * as versionService from '../services/versionService.js';
import { broadcast } from '../socket/index.js';

const router = Router({ mergeParams: true });

router.use(authMiddleware);

// GET /api/projects/:projectId/versions
router.get('/', async (req, res, next) => {
  try {
    const { projectId } = req.params as { projectId: string };
    const versions = await versionService.listVersions(projectId, req.user!.userId);
    res.json(versions);
  } catch (err) {
    next(err);
  }
});

// POST /api/projects/:projectId/versions
router.post('/', async (req, res, next) => {
  try {
    const { projectId } = req.params as { projectId: string };
    const { name } = req.body as { name: string };
    const version = await versionService.createVersion(projectId, req.user!.userId, name);
    res.status(201).json(version);
  } catch (err) {
    next(err);
  }
});

// POST /api/projects/:projectId/versions/:versionId/restore
router.post('/:versionId/restore', async (req, res, next) => {
  try {
    const { projectId, versionId } = req.params as { projectId: string; versionId: string };
    const backup = await versionService.restoreVersion(projectId, versionId, req.user!.userId);
    // Everyone viewing the project must reload — the whole tree was replaced
    broadcast(projectId, 'project:restored', { projectId, versionId });
    res.json({ restored: true, backup });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/projects/:projectId/versions/:versionId
router.delete('/:versionId', async (req, res, next) => {
  try {
    const { projectId, versionId } = req.params as { projectId: string; versionId: string };
    await versionService.deleteVersion(projectId, versionId, req.user!.userId);
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});

export default router;
