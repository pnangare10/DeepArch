import { Server as HttpServer } from 'http';
import { Server as SocketServer, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { getMemberRole } from '../services/memberService.js';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret';

interface SocketUser {
  userId: string;
  email: string;
  name: string;
}

declare module 'socket.io' {
  interface Socket {
    user?: SocketUser;
  }
}

// Assign a stable color per user (deterministic from userId)
function userColor(userId: string): string {
  const colors = [
    '#ef4444', '#f97316', '#eab308', '#22c55e',
    '#06b6d4', '#3b82f6', '#8b5cf6', '#ec4899',
  ];
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = (hash * 31 + userId.charCodeAt(i)) & 0xffffffff;
  }
  return colors[Math.abs(hash) % colors.length];
}

export function initSocket(httpServer: HttpServer): SocketServer {
  const io = new SocketServer(httpServer, {
    cors: { origin: 'http://localhost:5173', methods: ['GET', 'POST'], credentials: true },
  });

  // JWT auth middleware for WebSocket handshake
  io.use(async (socket, next) => {
    const token = socket.handshake.auth?.token as string | undefined;
    if (!token) return next(new Error('Unauthorized'));
    try {
      const payload = jwt.verify(token, JWT_SECRET) as { userId: string; email: string; name?: string };
      socket.user = { userId: payload.userId, email: payload.email, name: payload.name ?? payload.email };
      next();
    } catch {
      next(new Error('Invalid or expired token'));
    }
  });

  io.on('connection', (socket: Socket) => {
    const user = socket.user!;

    // Client joins a project room
    socket.on('join', async ({ projectId }: { projectId: string }) => {
      const role = await getMemberRole(projectId, user.userId).catch(() => null);
      if (!role) {
        socket.emit('error', { message: 'Access denied' });
        return;
      }
      await socket.join(`project:${projectId}`);
      // Broadcast presence to others in the room
      socket.to(`project:${projectId}`).emit('user:joined', {
        userId: user.userId,
        name: user.name,
        color: userColor(user.userId),
      });
    });

    socket.on('leave', ({ projectId }: { projectId: string }) => {
      socket.leave(`project:${projectId}`);
      socket.to(`project:${projectId}`).emit('user:left', { userId: user.userId });
    });

    socket.on('cursor:move', ({ projectId, x, y, parentId }: { projectId: string; x: number; y: number; parentId: string | null }) => {
      socket.to(`project:${projectId}`).emit('cursor:moved', {
        userId: user.userId,
        userName: user.name,
        color: userColor(user.userId),
        x,
        y,
        parentId,
      });
    });

    socket.on('disconnecting', () => {
      for (const room of socket.rooms) {
        if (room.startsWith('project:')) {
          socket.to(room).emit('user:left', { userId: user.userId });
        }
      }
    });
  });

  return io;
}

// Helper to broadcast a node/edge/comment event from REST handlers
export let io: SocketServer | null = null;

export function setIo(instance: SocketServer): void {
  io = instance;
}

export function broadcast(projectId: string, event: string, data: unknown, exceptSocketId?: string): void {
  if (!io) return;
  const room = io.to(`project:${projectId}`);
  if (exceptSocketId) {
    io.to(`project:${projectId}`).except(exceptSocketId).emit(event, data);
  } else {
    room.emit(event, data);
  }
}
