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
import { errorHandler } from './middleware/errorHandler.js';
import { initSocket, setIo } from './socket/index.js';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({ origin: 'http://localhost:5173', credentials: true }));
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/projects', nodeRoutes);
app.use('/api/projects', edgeRoutes);
app.use('/api/projects', searchRoutes);
app.use('/api/projects/:projectId/members', membersRouter);
app.use('/api/projects/:projectId', commentsRouter);

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok' });
});

// Error handler
app.use(errorHandler);

const httpServer = createServer(app);
const socketIo = initSocket(httpServer);
setIo(socketIo);

httpServer.listen(PORT, () => {
  console.log(`DeepArch backend running on http://localhost:${PORT}`);
});
