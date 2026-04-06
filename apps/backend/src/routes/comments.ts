import { Router } from 'express';
import { authMiddleware } from '../middleware/authMiddleware.js';
import * as commentService from '../services/commentService.js';

const router = Router({ mergeParams: true });

router.use(authMiddleware);

// GET /api/projects/:projectId/nodes/:nodeId/comments
router.get('/nodes/:nodeId/comments', async (req, res, next) => {
  try {
    const params = req.params as { projectId: string; nodeId: string };
    const comments = await commentService.listComments(
      params.projectId,
      params.nodeId,
      req.user!.userId,
    );
    res.json(comments.map((c) => ({
      id: c.id,
      nodeId: c.nodeId,
      projectId: c.projectId,
      userId: c.userId,
      text: c.text,
      createdAt: c.createdAt.toISOString(),
      updatedAt: c.updatedAt.toISOString(),
      user: c.user,
    })));
  } catch (err) {
    next(err);
  }
});

// POST /api/projects/:projectId/nodes/:nodeId/comments
router.post('/nodes/:nodeId/comments', async (req, res, next) => {
  try {
    const params = req.params as { projectId: string; nodeId: string };
    const { text } = req.body as { text: string };
    const comment = await commentService.createComment(
      params.projectId,
      params.nodeId,
      req.user!.userId,
      text,
    );
    res.status(201).json({
      id: comment.id,
      nodeId: comment.nodeId,
      projectId: comment.projectId,
      userId: comment.userId,
      text: comment.text,
      createdAt: comment.createdAt.toISOString(),
      updatedAt: comment.updatedAt.toISOString(),
      user: comment.user,
    });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/projects/:projectId/comments/:commentId
router.patch('/comments/:commentId', async (req, res, next) => {
  try {
    const params = req.params as { projectId: string; commentId: string };
    const { text } = req.body as { text: string };
    const comment = await commentService.updateComment(
      params.projectId,
      params.commentId,
      req.user!.userId,
      text,
    );
    res.json({
      id: comment.id,
      nodeId: comment.nodeId,
      projectId: comment.projectId,
      userId: comment.userId,
      text: comment.text,
      createdAt: comment.createdAt.toISOString(),
      updatedAt: comment.updatedAt.toISOString(),
      user: comment.user,
    });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/projects/:projectId/comments/:commentId
router.delete('/comments/:commentId', async (req, res, next) => {
  try {
    const params = req.params as { projectId: string; commentId: string };
    await commentService.deleteComment(
      params.projectId,
      params.commentId,
      req.user!.userId,
    );
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});

export default router;
