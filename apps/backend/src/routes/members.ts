import { Router } from 'express';
import { authMiddleware } from '../middleware/authMiddleware.js';
import * as memberService from '../services/memberService.js';
import type { ProjectRole } from '@deeparch/shared';

const router = Router({ mergeParams: true }); // receives projectId from parent

router.use(authMiddleware);

// GET /api/projects/:projectId/members
router.get('/', async (req, res, next) => {
  try {
    const params = req.params as { projectId: string };
    const members = await memberService.listMembers(params.projectId, req.user!.userId);
    res.json(members.map((m) => ({
      id: m.id,
      userId: m.userId,
      projectId: m.projectId,
      role: m.role,
      user: m.user,
      createdAt: m.createdAt.toISOString(),
    })));
  } catch (err) {
    next(err);
  }
});

// POST /api/projects/:projectId/members  { email, role }
router.post('/', async (req, res, next) => {
  try {
    const params = req.params as { projectId: string };
    const { email, role } = req.body as { email: string; role: Exclude<ProjectRole, 'owner'> };
    const member = await memberService.inviteMember(params.projectId, req.user!.userId, email, role);
    res.status(201).json({
      id: member.id,
      userId: member.userId,
      projectId: member.projectId,
      role: member.role,
      user: member.user,
      createdAt: member.createdAt.toISOString(),
    });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/projects/:projectId/members/:userId  { role }
router.patch('/:userId', async (req, res, next) => {
  try {
    const params = req.params as { projectId: string; userId: string };
    const { role } = req.body as { role: Exclude<ProjectRole, 'owner'> };
    const member = await memberService.changeMemberRole(params.projectId, req.user!.userId, params.userId, role);
    res.json({
      id: member.id,
      userId: member.userId,
      projectId: member.projectId,
      role: member.role,
      user: member.user,
      createdAt: member.createdAt.toISOString(),
    });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/projects/:projectId/members/:userId
router.delete('/:userId', async (req, res, next) => {
  try {
    const params = req.params as { projectId: string; userId: string };
    await memberService.removeMember(params.projectId, req.user!.userId, params.userId);
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});

export default router;
