import { Router } from 'express';
import { ProjectService } from '../services/projectService.js';
import { PrismaProjectRepository } from '../repositories/prisma/PrismaProjectRepository.js';
import { authMiddleware } from '../middleware/authMiddleware.js';

const router = Router();
const service = new ProjectService(new PrismaProjectRepository());

router.use(authMiddleware);

router.post('/import', async (req, res, next) => {
  try {
    const project = await service.importProject(req.body, req.user!.userId);
    res.status(201).json(project);
  } catch (err) {
    next(err);
  }
});

router.get('/', async (req, res, next) => {
  try {
    const projects = await service.getAll(req.user!.userId);
    res.json(projects);
  } catch (err) {
    next(err);
  }
});

router.post('/', async (req, res, next) => {
  try {
    const project = await service.create(req.body, req.user!.userId);
    res.status(201).json(project);
  } catch (err) {
    next(err);
  }
});

router.get('/:projectId/export', async (req, res, next) => {
  try {
    const data = await service.exportProject(req.params.projectId, req.user!.userId);
    res.setHeader('Content-Disposition', `attachment; filename="deeparch-export.json"`);
    res.json(data);
  } catch (err) {
    next(err);
  }
});

router.get('/:projectId', async (req, res, next) => {
  try {
    const project = await service.getById(req.params.projectId, req.user!.userId);
    res.json(project);
  } catch (err) {
    next(err);
  }
});

router.patch('/:projectId', async (req, res, next) => {
  try {
    const project = await service.update(req.params.projectId, req.body, req.user!.userId);
    res.json(project);
  } catch (err) {
    next(err);
  }
});

router.delete('/:projectId', async (req, res, next) => {
  try {
    await service.delete(req.params.projectId, req.user!.userId);
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});

export { router as projectRoutes };
