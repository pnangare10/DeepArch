# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

DeepArch is an interactive, multi-level architecture visualization platform ("Google Maps for Software Architecture"). Users create hierarchical diagrams where each block/node can be drilled into to reveal deeper sub-architectures. Built as an npm workspaces monorepo.

## Commands

### Development
```bash
npm run dev          # Start both backend and frontend concurrently
npm run debug        # Backend with nodemon inspect + frontend dev server
```

### Backend (from root or apps/backend)
```bash
npm run dev -w apps/backend       # tsx watch with hot reload (port 3001)
npm run db:migrate -w apps/backend  # Run Prisma migrations
npm run db:generate -w apps/backend # Regenerate Prisma client
npm run db:seed -w apps/backend     # Seed sample data
npm run db:studio -w apps/backend   # Open Prisma Studio GUI
```

### Frontend (from root or apps/frontend)
```bash
npm run dev -w apps/frontend      # Vite dev server (port 5173, proxies /api to :3001)
npm run build -w apps/frontend    # TypeScript check + Vite production build
```

### Full Build
```bash
npm run build        # Builds shared → backend → frontend in sequence
```

## Architecture

### Monorepo Layout
- **`packages/shared`** (`@deeparch/shared`) — TypeScript types (DTOs), constants, shared between frontend and backend
- **`apps/backend`** (`@deeparch/backend`) — Express + Prisma REST API
- **`apps/frontend`** (`@deeparch/frontend`) — React + React Flow + Zustand SPA

### Backend: Layered Architecture with Repository Pattern
```
Routes → Services → Repositories (interfaces) → Prisma Implementations → SQLite
```

- **Routes** (`src/routes/`) — Express request handlers, delegates to services
- **Services** (`src/services/`) — Business logic, validation, error throwing via `AppError`
- **Repositories** (`src/repositories/interfaces/`) — Abstract contracts (`INodeRepository`, `IEdgeRepository`, `IProjectRepository`)
- **Prisma implementations** (`src/repositories/prisma/`) — Concrete implementations. Services depend on interfaces, not Prisma directly, so the DB can be swapped by implementing new repositories
- **Metadata is stored as JSON strings** in SQLite — parsed/serialized in repository layer, not in routes or services

### Frontend: Zustand Slice Store + React Flow
```
Pages → Components → Zustand Store (4 slices) → API Client → Backend
```

- **Store** (`src/store/`) — Single Zustand store composed of 4 slices:
  - `navigationSlice` — breadcrumb trail, current parent level, drill-down/up
  - `canvasSlice` — React Flow nodes/edges, CRUD operations, position change tracking
  - `searchSlice` — cross-level search, result navigation
  - `metadataSlice` — selected node, detail panel state, metadata editing
- **Transforms** (`src/lib/transforms.ts`) — Converts between DB models (`ArchNode`/`ArchEdge`) and React Flow node/edge format. All conversion goes through `dbNodeToFlowNode` and `dbEdgeToFlowEdge`
- **API client** (`src/api/client.ts`) — Thin fetch wrapper; endpoint modules in `src/api/`

### Data Model (Prisma/SQLite)
- **Hierarchical nodes via adjacency list**: `Node.parentId` references parent `Node.id` (null = root level)
- **Edges scoped to levels**: `Edge.parentId` = the parent context. Edges connect sibling nodes within the same level
- **Cascade deletes**: Deleting a node cascades to all children and associated edges via Prisma FK constraints
- **`childCount`**: Computed via Prisma `_count` on the children relation, returned in GET responses so the frontend shows drill-down indicators without extra queries

### Drill-Down Flow
1. User double-clicks a node on the canvas
2. `navigateInto(nodeId)` updates breadcrumbs and calls `loadLevel(projectId, nodeId)`
3. `loadLevel` fetches `GET /nodes?parentId=nodeId` and `GET /edges?parentId=nodeId`
4. Response is transformed via `dbNodeToFlowNode`/`dbEdgeToFlowEdge` and swapped into React Flow
5. Only the current level's nodes are in memory — no full tree loaded

### Key Conventions
- Node types defined in `@deeparch/shared` constants: `default`, `service`, `database`, `queue`, `gateway`, `load-balancer`, `frontend`, `environment`, `infrastructure`
- Custom React Flow node component (`ArchNode`) maps node types to Lucide icons and Tailwind color classes
- Frontend uses `@` path alias mapped to `./src/` (configured in vite.config.ts and tsconfig.json)
- Backend uses `.js` extensions in imports (ESM compatibility with tsx)
- Vite proxies `/api` requests to the backend at `localhost:3001`

## API Endpoints

All under `/api`. Nodes and edges use `?parentId=<id|null>` query param to scope to a hierarchy level.

Key non-obvious endpoint: `PATCH /projects/:id/nodes/batch` — batch position updates for drag operations (must be registered before `/:nodeId` route to avoid param collision).
