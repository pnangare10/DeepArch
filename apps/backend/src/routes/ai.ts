import { Router } from 'express';
import Anthropic from '@anthropic-ai/sdk';
import { authMiddleware } from '../middleware/authMiddleware.js';
import { getMemberRole } from '../services/memberService.js';
import { AppError } from '../middleware/errorHandler.js';
import { PrismaNodeRepository } from '../repositories/prisma/PrismaNodeRepository.js';
import { PrismaEdgeRepository } from '../repositories/prisma/PrismaEdgeRepository.js';
import { computeLayout } from '../services/layoutEngine.js';
import { broadcast } from '../socket/index.js';
import type { AIGenerateRequest, AIArchitectureSchema } from '@deeparch/shared';
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
    if (prompt.length > 2000) throw new AppError(400, 'Prompt must be 2000 characters or fewer');

    const parentId = body.parentId ?? null;

    // Set up SSE
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    const send = (event: object) => {
      res.write(`data: ${JSON.stringify(event)}\n\n`);
    };

    send({ type: 'status', message: 'Generating architecture with AI...' });

    const validNodeTypes = Object.values(NODE_TYPES).join(' | ');

    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

    let rawContent = '';
    try {
      const response = await client.messages.create({
        model: 'claude-sonnet-4-6',
        max_tokens: 4096,
        system: `You are an architecture diagram generator. Given a description, produce a JSON object representing the architecture.
Return ONLY valid JSON — no markdown fences, no explanation text, just the raw JSON object.`,
        messages: [
          {
            role: 'user',
            content: `Generate an architecture diagram for: ${prompt}

Return JSON with this exact shape:
{
  "nodes": [
    { "tempId": "n1", "name": "string", "nodeType": "${validNodeTypes}", "description": "string", "layer": 0 }
  ],
  "edges": [
    { "sourceId": "n1", "targetId": "n2", "label": "optional string" }
  ]
}

Rules:
- layer starts at 0 for the leftmost/first tier, increment for each downstream tier
- tempId must be unique strings like "n1", "n2", "n3"
- edges reference tempId values (not names)
- max 20 nodes, max 30 edges
- nodeType must be exactly one of: ${validNodeTypes}
- keep names short (1-4 words)
- description is optional but helpful (1 sentence max)`,
          },
        ],
      });

      rawContent =
        response.content[0].type === 'text' ? response.content[0].text : '';
    } catch (err: any) {
      send({ type: 'error', message: `AI request failed: ${err.message ?? 'Unknown error'}` });
      res.end();
      return;
    }

    // Parse JSON
    let schema: AIArchitectureSchema;
    try {
      // Strip markdown fences if model adds them despite instructions
      const cleaned = rawContent.replace(/^```[a-z]*\n?/i, '').replace(/\n?```$/i, '').trim();
      schema = JSON.parse(cleaned);
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

    // Compute layout positions
    const positions = computeLayout(schema.nodes);

    // Create nodes in DB
    const tempIdToRealId = new Map<string, string>();
    for (const nodeDraft of schema.nodes) {
      const pos = positions.get(nodeDraft.tempId) ?? { x: 100, y: 100 };
      const created = await nodeRepo.create(projectId, {
        name: nodeDraft.name,
        nodeType: nodeDraft.nodeType,
        description: nodeDraft.description ?? '',
        parentId,
        positionX: pos.x,
        positionY: pos.y,
        width: 200,
        height: 80,
        metadata: {},
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
      if (!sourceId || !targetId) continue;
      if (sourceId === targetId) continue;
      try {
        const created = await edgeRepo.create(projectId, {
          sourceId,
          targetId,
          parentId,
          label: edgeDraft.label,
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
