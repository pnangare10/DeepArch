# DeepArch Implementation Plan

## Context

DeepArch is an interactive, multi-level architecture visualization platform -- "Google Maps for Software Architecture." Users create hierarchical diagrams where each block can be drilled into to reveal deeper sub-architectures. The repo is greenfield (zero code). This plan covers the MVP (Phase 1) and outlines future phases.

---

## Tech Stack (Confirmed)

| Layer | Technology |
|-------|-----------|
| Frontend | React 18 + TypeScript + Vite |
| Canvas | React Flow (xyflow) |
| State | Zustand (slice pattern) -- minimal boilerplate, selective re-renders, ~1KB |
| UI | Tailwind CSS + shadcn/ui |
| Backend | Node.js + Express + TypeScript |
| ORM | Prisma (type-safe queries, auto-generated types, migration management) |
| Database | SQLite (local-first MVP, zero setup -- just a file) |
| DB Abstraction | Repository pattern (easy DB swap later) |
| Monorepo | npm workspaces |

### Why Zustand over alternatives?
- **vs Redux**: 3x less boilerplate, no dispatch ceremony, no Provider wrapper
- **vs Context API**: Context re-renders ALL consumers on any change -- terrible for canvas with 100+ nodes being dragged
- **vs Jotai**: Atomic model harder to reason about for 4 interconnected slices
- Zustand integrates natively with React Flow docs/examples

### Why SQL over MongoDB?

| Criteria | SQL (SQLite/PostgreSQL) | MongoDB |
|----------|------------------------|---------|
| Referential integrity | Built-in FK constraints. Delete node -> children auto-cascade. Can't create orphan edges. | None. Must manually cascade. One bug = corrupted data forever. |
| Tree queries | `WHERE parentId = X` with index = O(log n) | Same query but no FK enforcement |
| ACID transactions | Yes (batch updates are atomic) | Limited |
| Setup (MVP) | SQLite = zero setup (just a file) | Needs MongoDB server or Atlas account |
| Flexible metadata | JSON column on node row | Native (BSON) -- slight advantage |
| Scale path | SQLite -> PostgreSQL (managed: Supabase, Neon, RDS) | Atlas -> sharding |
| Document size | No practical limit per row | 16MB limit per document |

**Decision**: SQL wins for DeepArch because tree structures with parent-child relationships and edges referencing valid nodes need referential integrity. The database enforces data consistency rules that MongoDB would require us to code manually.

### What is Prisma?
Prisma is an ORM (Object-Relational Mapper). Instead of writing raw SQL strings, you write type-safe TypeScript:
```
// Instead of: db.query('SELECT * FROM Node WHERE parentId = ?', [id])
// You write:  prisma.node.findMany({ where: { parentId: id } })
```
Benefits: compile-time type checking, auto-generated types from schema, handles DB migrations, prevents SQL injection, works with SQLite + PostgreSQL + MySQL.

### Database Setup
**SQLite requires NO separate setup.** Prisma creates a `deeparch.db` file automatically when you run the first migration. No server, no installation, no configuration. For Phase 3 (multi-user), we migrate to PostgreSQL which needs a managed service.

---

## Architecture: Repository Pattern for DB Abstraction

```
Route -> Service -> Repository -> Prisma -> Database
```

Each entity (Node, Edge, Project) gets a repository interface:
```typescript
// repository/INodeRepository.ts
interface INodeRepository {
  findByParent(projectId: string, parentId: string | null): Promise<Node[]>
  create(data: CreateNodeDTO): Promise<Node>
  update(id: string, data: UpdateNodeDTO): Promise<Node>
  delete(id: string): Promise<void>
  batchUpdatePositions(updates: PositionUpdate[]): Promise<void>
}

// repository/prisma/PrismaNodeRepository.ts
class PrismaNodeRepository implements INodeRepository {
  // Uses Prisma client under the hood
}
```

**Why**: Services never know which DB is used. To swap to MongoDB later, create `MongoNodeRepository implements INodeRepository` and change one import. Zero changes to routes or services.

---

## Architecture Approach: Hybrid Relational + JSON

**Chosen**: Relational tables for nodes/edges (adjacency list via `parentId`) + JSON column for metadata.

**Why not pure JSON blob per diagram?** No partial updates, search requires parsing, scales poorly, no referential integrity, future multi-user merge conflicts.

**Why not pure relational with separate metadata table?** N+1 queries for custom fields. JSON column avoids this while keeping tree queries efficient.

**Why hybrid wins**: Structured queries for tree traversal (`WHERE parentId = X`), cascade deletes via FK, flexible schema for user-defined metadata, migrates cleanly to PostgreSQL later.

---

## Data Model (Prisma Schema)

```
Project: id, name, description, timestamps
  |-- has many Nodes, Edges

Node: id, projectId, parentId?, name, description, nodeType, positionX, positionY, metadata (JSON), style (JSON)
  |-- self-relation via parentId (adjacency list)
  |-- parentId = null means root level
  |-- onDelete: Cascade (children + edges deleted with parent)

Edge: id, projectId, sourceId, targetId, parentId?, label, edgeType, metadata (JSON)
  |-- parentId = the level context (edges connect siblings within same parent)

Indexes: (projectId, parentId) on both Node and Edge -- the hot query path
```

### How Drill-Down Works

1. User double-clicks Node A at root level
2. Backend query: `SELECT * FROM Node WHERE projectId = ? AND parentId = 'A'`
3. Backend query: `SELECT * FROM Edge WHERE projectId = ? AND parentId = 'A'`
4. Frontend swaps React Flow nodes/edges arrays -- no full tree in memory
5. Breadcrumb appends: `Root > Node A`

---

## API Design

```
GET/POST       /api/projects
GET/PATCH/DEL  /api/projects/:id

GET/POST       /api/projects/:id/nodes?parentId=<id|null>
PATCH/DEL      /api/projects/:id/nodes/:nodeId
PATCH          /api/projects/:id/nodes/batch          (bulk position updates)

GET/POST       /api/projects/:id/edges?parentId=<id|null>
PATCH/DEL      /api/projects/:id/edges/:edgeId

GET            /api/projects/:id/search?q=<query>     (cross-level, returns path)
GET            /api/projects/:id/export                (full JSON export)
POST           /api/projects/import                    (JSON import)
```

Key detail: GET nodes includes computed `childCount` per node so the frontend shows a drill-down indicator without extra queries.

---

## Frontend Architecture

### Component Tree
```
App
+-- ProjectListPage               (list/create/delete projects)
+-- EditorPage
    +-- TopBar (title, breadcrumbs, search, save status)
    +-- CanvasArea
    |   +-- ReactFlowCanvas       (custom ArchNode + ArchEdge)
    |   +-- CanvasToolbar         (add node, zoom controls)
    +-- DetailPanel (right sidebar, slides in on node click)
    |   +-- NodeInfoSection       (name, description, type)
    |   +-- MetadataEditor        (dynamic key-value fields)
    |   +-- LinksSection          (URLs attached to node)
    +-- SearchResultsOverlay      (dropdown from search bar)
```

### Zustand Store Slices
- **NavigationSlice**: currentParentId, breadcrumbs, navigateInto/Up/ToLevel
- **CanvasSlice**: nodes, edges, loadLevel, CRUD operations, React Flow change handlers
- **SearchSlice**: query, results, search(), navigateToResult()
- **MetadataSlice**: selectedNodeId, isDetailOpen, updateMetadata

### Drill-Down UX Flow
1. Double-click node -> `navigateInto(nodeId)`
2. Store calls API for children nodes + edges
3. Transforms to React Flow format, swaps into store
4. React Flow re-renders, calls `fitView()`
5. Breadcrumb updated

---

## Project Structure

```
deeparch/
+-- package.json                    (workspace root)
+-- tsconfig.base.json
+-- .gitignore, .env
|
+-- packages/
|   +-- shared/                     (shared TypeScript types & constants)
|       +-- src/types/              (Project, Node, Edge, Search DTOs)
|       +-- src/constants.ts        (NODE_TYPES, EDGE_TYPES)
|
+-- apps/
    +-- backend/
    |   +-- prisma/schema.prisma
    |   +-- src/
    |       +-- index.ts            (Express app)
    |       +-- routes/             (projects, nodes, edges, search)
    |       +-- services/           (business logic)
    |       +-- repositories/       (DB abstraction layer)
    |       |   +-- interfaces/     (INodeRepository, IEdgeRepository, IProjectRepository)
    |       |   +-- prisma/         (PrismaNodeRepository, etc.)
    |       +-- middleware/         (errorHandler, validation)
    |       +-- utils/              (pathBuilder, db client)
    |
    +-- frontend/
        +-- src/
            +-- api/                (fetch client, API modules)
            +-- store/              (Zustand slices)
            +-- components/
            |   +-- canvas/         (Canvas, ArchNode, ArchEdge, Toolbar)
            |   +-- navigation/     (BreadcrumbNav, SearchBar)
            |   +-- metadata/       (NodeInfo, MetadataEditor, Links)
            |   +-- layout/         (TopBar, DetailPanel)
            |   +-- project/        (ProjectList, ProjectCard)
            |   +-- ui/             (shadcn/ui components)
            +-- hooks/              (useDebounce, useAutoSave, useKeyboardShortcuts)
            +-- lib/                (transforms, utils)
            +-- pages/              (ProjectListPage, EditorPage)
```

---

## Edge Cases

| Case | Handling |
|------|---------|
| Delete node with children | Cascade delete (Prisma FK). Confirmation dialog shows child count. |
| Move node between levels | **Phase 2.** MVP: nodes stay at their creation level. |
| Circular drill-down | Structurally impossible with adjacency list (single parentId). |
| 100+ levels deep | Each level loads independently. SQLite recursive CTE limit = 1000. Breadcrumb UI truncates visually. |
| 1000+ nodes at one level | React Flow handles ~1000-2000 nodes. Acceptable for MVP; pagination in Phase 2. |
| Undo/Redo | **Phase 2.** Command pattern with undo stack. |
| Save during navigation | Debounced auto-save. In-flight saves cancel if level changes. |
| Search performance | LIKE query + recursive CTE for path. Fine for MVP scale; add FTS index in Phase 2. |

---

## Phased Roadmap

### Phase 1: MVP
- Core canvas (drag, drop, connect, drill-down)
- Metadata panel (name, description, custom fields, links)
- Save/Load (auto-save, project list)
- Search + breadcrumb navigation
- Node type visual distinction (icons/colors)

### Phase 2: Polish
- Undo/Redo, copy/paste nodes
- Export/Import JSON files
- Minimap, keyboard shortcuts
- Better node styling, edge labels
- Move nodes between levels

### Phase 3: Multi-User
- PostgreSQL migration, auth, user ownership
- Share projects, collaborator invite
- Real-time sync (WebSocket + CRDT)

### Phase 4: Advanced
- Role-based views
- Integrations (Terraform, K8s, AWS)
- AI architecture generation
- Comments, version history, presentation mode

---

## Execution Steps (Phase 1)

### Step 1: Initialize monorepo
- Create `deeparch/` with npm workspaces (`packages/shared`, `apps/backend`, `apps/frontend`)
- Set up `tsconfig.base.json`, `.gitignore`

### Step 2: Shared types package
- Create `packages/shared/src/types/` -- Project, Node, Edge, Search DTOs
- Create `constants.ts` -- NODE_TYPES, EDGE_TYPES, defaults
- Create repository interfaces: `INodeRepository`, `IEdgeRepository`, `IProjectRepository`

### Step 3: Backend setup
- Install Express, Prisma, cors, TypeScript tooling, nodemon
- Create Prisma schema (Project, Node, Edge with self-relation)
- Run initial migration (auto-creates SQLite file -- no separate DB setup needed)
- Create Prisma client singleton

### Step 4: Repository layer
- Create `repositories/interfaces/` -- `INodeRepository`, `IEdgeRepository`, `IProjectRepository`
- Create `repositories/prisma/` -- Prisma implementations of each interface
- Services depend on interfaces, not on Prisma directly

### Step 5: Backend CRUD routes
- `routes/projects.ts` -- CRUD with node count
- `routes/nodes.ts` -- CRUD filtered by parentId, batch position update, computed childCount
- `routes/edges.ts` -- CRUD filtered by parentId, validate source/target share parent
- `middleware/errorHandler.ts` -- consistent JSON errors

### Step 6: Search endpoint
- `services/searchService.ts` -- LIKE query on name/description
- Recursive CTE to build ancestor breadcrumb path per result

### Step 7: Frontend setup
- Vite + React + TypeScript scaffold
- Install React Flow, Zustand, React Router, Tailwind, shadcn/ui
- Configure Vite proxy to backend, create API client modules

### Step 8: Zustand store
- `navigationSlice.ts` -- breadcrumb state machine
- `canvasSlice.ts` -- nodes/edges, loadLevel, CRUD operations
- `searchSlice.ts` -- debounced search, navigate to result
- `metadataSlice.ts` -- selected node, detail panel state
- `lib/transforms.ts` -- DB model <-> React Flow model conversion

### Step 9: React Flow canvas
- `ArchNode.tsx` -- custom node with name, type icon, drill-down indicator badge
- `ArchEdge.tsx` -- custom edge with optional label
- `Canvas.tsx` -- React Flow wrapper wiring all handlers (double-click, click, connect, drag)
- `CanvasToolbar.tsx` -- add node button, zoom controls

### Step 10: Navigation UI
- `BreadcrumbNav.tsx` -- clickable breadcrumbs, truncation for deep levels
- `SearchBar.tsx` -- debounced input, results dropdown with full path, click-to-navigate

### Step 11: Metadata detail panel
- `NodeInfoSection.tsx` -- editable name, description, type
- `MetadataEditor.tsx` -- dynamic key-value editor (add/edit/delete fields)
- `LinksSection.tsx` -- URL list with add/delete
- `DetailPanel.tsx` -- right sidebar container

### Step 12: Project list page
- `ProjectListPage.tsx` -- project cards with name, node count, last updated
- `EditorPage.tsx` -- loads project, calls loadLevel on mount
- React Router: `/` -> list, `/project/:id` -> editor

### Step 13: Auto-save
- `useAutoSave.ts` -- debounced batch position updates (1s)
- Immediate save for add/delete/update operations
- Save status indicator in TopBar

### Step 14: Integration testing & polish
- Full flow test: create -> add nodes -> connect -> drill down -> metadata -> search -> navigate back
- Edge case testing: delete with children, empty levels, no search results
- Loading states, error toasts, skeleton loaders
- Seed script with sample 3-level project

### Step 15: Dev & debug tooling
- **Dev script**: `concurrently` runs backend (`tsx watch`) + frontend (`vite`) -- one command starts everything
- **Debug scripts with nodemon**:
  - Backend: `nodemon --exec tsx src/index.ts --watch src --ext ts` (auto-restart on file changes, debugger-friendly)
  - Frontend: Vite's built-in HMR (hot module replacement) handles this
  - Root: `"debug": "concurrently \"npm run debug -w apps/backend\" \"npm run dev -w apps/frontend\""`
- **VS Code launch.json**: Debug configs for attaching to backend (Node.js inspector) and frontend (Chrome DevTools)
- Build scripts for production

---

## Critical Files

1. `apps/backend/prisma/schema.prisma` -- data model foundation
2. `apps/backend/src/repositories/interfaces/` -- DB abstraction contracts
3. `apps/frontend/src/store/canvasSlice.ts` -- central canvas state
4. `apps/frontend/src/components/canvas/Canvas.tsx` -- React Flow wrapper, core UX
5. `apps/frontend/src/store/navigationSlice.ts` -- drill-down/breadcrumb state machine
6. `apps/backend/src/services/searchService.ts` -- cross-level search with path building

---

## Verification Plan

1. **Backend**: curl/Postman test all API endpoints with sample data
2. **Frontend canvas**: Create 3+ nodes, connect them, verify drag/zoom/pan
3. **Drill-down**: Create nested nodes, double-click to navigate in, breadcrumb to navigate back
4. **Metadata**: Select node, add custom fields and links, verify persistence after reload
5. **Search**: Create nodes at different levels, search by name, verify path display and click-to-navigate
6. **Delete cascade**: Delete a node with children, verify all descendants removed
7. **Save/Load**: Create a project, refresh browser, verify everything persists
8. **Seed demo**: Run seed script, open the demo project, explore all levels

---

## Confidence Score: 8.5 / 10

**High confidence because**: React Flow is purpose-built for this; adjacency list is a proven pattern; SQLite + Prisma eliminates infra complexity; repository pattern future-proofs DB choice; scope is well-defined.

**Not 10/10 because**: React Flow custom node UX may need iteration; cross-level search performance needs monitoring at scale; auto-save coordination during rapid navigation requires careful handling.
