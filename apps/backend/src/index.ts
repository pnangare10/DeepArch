import 'dotenv/config';
import { createServer } from 'http';
import express from 'express';
import cors from 'cors';
import { projectRoutes } from './routes/projects.js';
import { nodeRoutes } from './routes/nodes.js';
import { edgeRoutes } from './routes/edges.js';
import { searchRoutes } from './routes/search.js';
import authRoutes from './routes/auth.js';
import membersRouter from './routes/members.js';
import commentsRouter from './routes/comments.js';
import aiRouter from './routes/ai.js';
import usersRouter from './routes/users.js';
import { errorHandler } from './middleware/errorHandler.js';
import { initSocket, setIo } from './socket/index.js';

const app = express();
const PORT = process.env.PORT || 3001;

const allowedOrigins = (process.env.CORS_ORIGIN || 'http://localhost:5173').split(',');
app.use(cors({ origin: allowedOrigins, credentials: true }));
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/projects', nodeRoutes);
app.use('/api/projects', edgeRoutes);
app.use('/api/projects', searchRoutes);
app.use('/api/projects/:projectId/members', membersRouter);
app.use('/api/projects/:projectId', commentsRouter);
app.use('/api/projects', aiRouter);
app.use('/api/users', usersRouter);

// Health check
app.get('/api/health', async (_req, res) => {
  try {
    const { default: prisma } = await import('./utils/db.js');
    await prisma.$queryRawUnsafe('SELECT 1');
    res.json({ status: 'ok', db: 'connected' });
  } catch (e: any) {
    res.json({ status: 'ok', db: `error: ${e.message}` });
  }
});

// Error handler
app.use(errorHandler);

const httpServer = createServer(app);
const socketIo = initSocket(httpServer);
setIo(socketIo);

httpServer.listen(PORT, () => {
  console.log(`DeepArch backend running on http://localhost:${PORT}`);
});
