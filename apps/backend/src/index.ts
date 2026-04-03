import express from 'express';
import cors from 'cors';
import { projectRoutes } from './routes/projects.js';
import { nodeRoutes } from './routes/nodes.js';
import { edgeRoutes } from './routes/edges.js';
import { searchRoutes } from './routes/search.js';
import { errorHandler } from './middleware/errorHandler.js';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Routes
app.use('/api/projects', projectRoutes);
app.use('/api/projects', nodeRoutes);
app.use('/api/projects', edgeRoutes);
app.use('/api/projects', searchRoutes);

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok' });
});

// Error handler
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`DeepArch backend running on http://localhost:${PORT}`);
});
