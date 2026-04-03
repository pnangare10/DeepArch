import { Router } from 'express';
import { ProjectService } from '../services/projectService.js';
import { PrismaProjectRepository } from '../repositories/prisma/PrismaProjectRepository.js';

const router = Router();
const service = new ProjectService(new PrismaProjectRepository());

router.post('/import', async (req, res, next) => {
  try {
    const project = await service.importProject(req.body);
    res.status(201).json(project);
  } catch (err) {
    next(err);
  }
});

router.get('/', async (_req, res, next) => {
  try {
    const projects = await service.getAll();
    res.json(projects);
  } catch (err) {
    next(err);
  }
});

router.post('/', async (req, res, next) => {
  try {
    const project = await service.create(req.body);
    res.status(201).json(project);
  } catch (err) {
    next(err);
  }
});

router.get('/:projectId/export', async (req, res, next) => {
  try {
    const data = await service.exportProject(req.params.projectId);
    res.setHeader('Content-Disposition', `attachment; filename="deeparch-export.json"`);
    res.json(data);
  } catch (err) {
    next(err);
  }
});

router.get('/:projectId', async (req, res, next) => {
  try {
    const project = await service.getById(req.params.projectId);
    res.json(project);
  } catch (err) {
    next(err);
  }
});

router.patch('/:projectId', async (req, res, next) => {
  try {
    const project = await service.update(req.params.projectId, req.body);
    res.json(project);
  } catch (err) {
    next(err);
  }
});

router.delete('/:projectId', async (req, res, next) => {
  try {
    await service.delete(req.params.projectId);
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});

export { router as projectRoutes };
