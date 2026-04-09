import { Router } from 'express';
import { authMiddleware } from '../middleware/authMiddleware.js';
import { getMemberRole } from '../services/memberService.js';
import { AppError } from '../middleware/errorHandler.js';
import { PrismaNodeRepository } from '../repositories/prisma/PrismaNodeRepository.js';
import { PrismaEdgeRepository } from '../repositories/prisma/PrismaEdgeRepository.js';
import { computeLayout } from '../services/layoutEngine.js';
import { getAIProvider, buildPrompts, parseAIResponse } from '../services/aiProvider.js';
import { broadcast } from '../socket/index.js';
import type { AIGenerateRequest } from '@deeparch/shared';
import { NODE_TYPES } from '@deeparch/shared';

const router = Router();
const nodeRepo = new PrismaNodeRepository();
const edgeRepo = new PrismaEdgeRepository();

router.use(authMiddleware);

router.post('/:projectId/ai/generate', async (req, res, next) => {
  try {
    const { projectId } = req.params;
    const userId = (req as any).user?.userId;
    const body = req.body as AIGenerateRequest;

    // Membership check
    const role = await getMemberRole(projectId, userId);
    if (!role) throw new AppError(403, 'Access denied');

    // Validate prompt
    const prompt = (body.prompt ?? '').trim();
    if (!prompt) throw new AppError(400, 'Prompt is required');
    if (prompt.length > 10000) throw new AppError(400, 'Prompt must be 10,000 characters or fewer');

    const parentId = body.parentId ?? null;

    // Set up SSE
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    const send = (event: object) => res.write(`data: ${JSON.stringify(event)}\n\n`);

    const providerName = process.env.AI_PROVIDER || 'ollama';
    send({ type: 'status', message: `Generating architecture with AI (${providerName})...` });

    const validNodeTypes = Object.values(NODE_TYPES).join(' | ');
    const { system, user } = buildPrompts(prompt, validNodeTypes);

    let rawContent = '';
    try {
      rawContent = await getAIProvider().generate(system, user);
    } catch (err: any) {
      send({ type: 'error', message: `AI request failed: ${err.message ?? 'Unknown error'}` });
      res.end();
      return;
    }

    // Parse JSON
    let schema;
    try {
      schema = parseAIResponse(rawContent);
    } catch {
      send({ type: 'error', message: 'Failed to parse AI response as JSON. Please try again.' });
      res.end();
      return;
    }

    // Validate basic shape
    if (!Array.isArray(schema.nodes) || schema.nodes.length === 0) {
      send({ type: 'error', message: 'AI returned no nodes. Please try a more specific description.' });
      res.end();
      return;
    }

    send({ type: 'status', message: `Creating ${schema.nodes.length} nodes...` });

    // Compute layout positions + smart edge handles
    const { positions, edgeHandles } = computeLayout(schema.nodes, schema.edges);

    // Create nodes in DB
    const tempIdToRealId = new Map<string, string>();
    for (const nodeDraft of schema.nodes) {
      const pos = positions.get(nodeDraft.tempId) ?? { x: 100, y: 100 };
      const isStickyNote = nodeDraft.nodeType === 'sticky-note';
      const created = await nodeRepo.create(projectId, {
        name: nodeDraft.name,
        nodeType: nodeDraft.nodeType,
        description: nodeDraft.description ?? '',
        parentId,
        positionX: pos.x,
        positionY: pos.y,
        width: isStickyNote ? 250 : 200,
        height: isStickyNote ? 150 : 80,
        metadata: {
          customFields: nodeDraft.metadata?.customFields ?? [],
          links: nodeDraft.metadata?.links ?? [],
          tags: nodeDraft.metadata?.tags ?? [],
          ...(nodeDraft.metadata?.bgColor ? { bgColor: nodeDraft.metadata.bgColor } : {}),
        },
      });
      tempIdToRealId.set(nodeDraft.tempId, created.id);
      broadcast(projectId, 'node:created', { node: created });
    }

    send({ type: 'status', message: `Creating ${schema.edges.length} connections...` });

    // Create edges in DB
    let edgeCount = 0;
    for (const edgeDraft of schema.edges) {
      const sourceId = tempIdToRealId.get(edgeDraft.sourceId);
      const targetId = tempIdToRealId.get(edgeDraft.targetId);
      if (!sourceId || !targetId || sourceId === targetId) continue;
      const handles = edgeHandles.get(`${edgeDraft.sourceId}→${edgeDraft.targetId}`);
      try {
        const created = await edgeRepo.create(projectId, {
          sourceId,
          targetId,
          parentId,
          label: edgeDraft.label,
          edgeType: edgeDraft.edgeType,
          sourceHandle: handles?.sourceHandle,
          targetHandle: handles?.targetHandle,
        });
        edgeCount++;
        broadcast(projectId, 'edge:created', { edge: created });
      } catch {
        // Skip invalid edges silently
      }
    }

    send({ type: 'done', nodeCount: schema.nodes.length, edgeCount });
    res.end();
  } catch (err) {
    next(err);
  }
});

export default router;
