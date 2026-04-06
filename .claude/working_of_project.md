The Big Picture
Think of the app in two halves that talk to each other:

Browser (React) ←──── HTTP/JSON ────→ Node.js Server ←──→ SQLite File
The browser shows the diagram canvas. The server stores and retrieves data. They communicate via a REST API.

1. The Database — How Data is Stored
   The database has 3 tables in a file called deeparch.db:

Project — A container. Just has a name.

Node — This is the most important table. Every block you see on the canvas is a Node. The key field is parentId:

Node: "Backend Servers" (parentId = null) ← lives at Root level
Node: "SIT Environment" (parentId = "Backend Servers ID") ← lives INSIDE Backend Servers
Node: "Auth Service" (parentId = "SIT ID") ← lives INSIDE SIT
This is how drill-down works at the data level — nodes point to their parent. When you double-click "Backend Servers", the app asks: "give me all nodes whose parentId = Backend Servers' ID".

Edge — An arrow connecting two nodes. It also has a parentId which means "this arrow is visible when you're looking inside that parent".

2. The Backend — 4 Layers
   Every request goes through 4 layers before touching the database:

Request → Route → Service → Repository → Prisma → DB
Layer 1: Route (e.g. routes/nodes.ts)

Just receives the HTTP request and calls the service
Example: GET /projects/abc/nodes?parentId=xyz → calls service.getByParent()
Layer 2: Service (e.g. services/nodeService.ts)

Contains business logic and validation
Example: Before creating a node, it checks "does the parent actually exist?"
Throws AppError(404, "not found") if something is wrong — the error handler converts this to a proper JSON response
Layer 3: Repository Interface (e.g. repositories/interfaces/INodeRepository.ts)

Just a TypeScript contract defining what methods exist
The service only talks to this interface, NOT to Prisma directly
This is why swapping the database later (e.g. to PostgreSQL or MongoDB) only requires writing a new Repository class — the Service code doesn't change at all
Layer 4: Prisma Repository (e.g. repositories/prisma/PrismaNodeRepository.ts)

The actual Prisma database queries live here
One important thing: metadata is stored as a JSON string in SQLite (because SQLite doesn't have a native JSON column type). The repository parses/serializes it: JSON.parse(row.metadata) when reading, JSON.stringify(metadata) when writing.
The \_count: { children: true } tells Prisma to also count how many child nodes each node has — this is the childCount badge you see on drillable nodes. 3. The Frontend — 3 Layers

Component → Zustand Store → API Client → Backend
Layer 1: The Store (Zustand)
The store is the brain of the frontend. It's split into 4 "slices" that are merged into one:

useStore = NavigationSlice + CanvasSlice + SearchSlice + MetadataSlice
NavigationSlice — Knows where you are in the hierarchy:

currentParentId = which node are you currently inside (null = root)
breadcrumbs = the trail: [Root, Backend Servers, SIT Environment]
navigateInto(nodeId) → adds to breadcrumbs, changes currentParentId, then calls loadLevel
navigateToLevel(2) → click a breadcrumb item to jump back up
CanvasSlice — Knows what's on screen:

nodes[] and edges[] = the React Flow data (what gets drawn)
loadLevel(projectId, parentId) = the core function — fetches nodes+edges for a given level from the API, converts them, and sets them in state
onNodesChange = React Flow calls this when you drag a node. It tracks pending position updates for the auto-save
SearchSlice — Handles search:

search(projectId, query) calls the API, gets results with their full path
navigateToResult(result) = sets breadcrumbs from the result's path and calls loadLevel
MetadataSlice — Handles the right-side panel:

selectNode(id) = opens the detail panel with that node's data
updateMetadata / updateNodeInfo = saves changes to the backend immediately
Layer 2: The API Client (src/api/)
Thin wrappers around fetch. Example:

// nodes.ts
getByParent: (projectId, parentId) =>
api.get(`/projects/${projectId}/nodes?parentId=${parentId}`)
The Vite dev server proxies /api calls to localhost:3001, so the frontend never needs to know the backend's address.

Layer 3: Components
App.tsx — Just two routes:

/ → ProjectListPage
/project/:id → EditorPage
EditorPage.tsx — The main page. On load it calls loadLevel(projectId, null) to load the root level. It wraps everything in ReactFlowProvider (required by React Flow).

Canvas.tsx — Wraps React Flow. The key event handlers:

onNodeDoubleClick → calls navigateInto(node.id) → drills down
onNodeClick → calls selectNode(node.id) → opens detail panel
onConnect → user draws an arrow → calls addEdge
onNodesChange → called on every drag frame by React Flow → store tracks positions
ArchNode.tsx — The custom node component. It reads data.nodeType to pick an icon (Server, Database, etc.) and a border color. Shows the childCount badge if the node contains sub-nodes.

4. The Complete Drill-Down Flow
   Here's exactly what happens when you double-click "Backend Servers":

1. User double-clicks "Backend Servers" on canvas
   ↓
1. Canvas.tsx: onNodeDoubleClick fires
   ↓
1. NavigationSlice: navigateInto("backend-servers-id", "Backend Servers")
   - breadcrumbs becomes: [Root, Backend Servers]
   - currentParentId becomes: "backend-servers-id"
     ↓
1. CanvasSlice: loadLevel(projectId, "backend-servers-id")
   ↓
1. API call: GET /api/projects/abc/nodes?parentId=backend-servers-id
   GET /api/projects/abc/edges?parentId=backend-servers-id
   ↓
1. Backend: Route → Service → Repository
   SQL: SELECT \* FROM Node WHERE projectId = 'abc' AND parentId = 'backend-servers-id'
   ↓
1. Returns: [SIT Environment, UAT Environment, Production]
   ↓
1. transforms.ts: dbNodeToFlowNode() converts DB format → React Flow format
   (maps positionX/Y → position: {x, y}, sets type: "archNode", etc.)
   ↓
1. Store: set({ nodes: [SIT, UAT, Prod], edges: [...] })
   ↓
1. React Flow re-renders with the new nodes
1. BreadcrumbNav re-renders: "Root > Backend Servers"
   To go back, you click "Root" in the breadcrumb:

navigateToLevel(0) → sets currentParentId = null → loadLevel(projectId, null) → loads root nodes again 5. Auto-Save
When you drag a node, React Flow fires onNodesChange dozens of times per second with position updates. Saving on every frame would spam the server. So:

Each position change is stored in pendingPositionUpdates (a Map: nodeId → {x, y})
useAutoSave hook watches this map with a 1-second debounce
After 1 second of no dragging, it sends one PATCH /nodes/batch request with all moved positions together
Summary in One Sentence Per Layer
Layer What it does
SQLite Stores nodes with parentId to create the tree hierarchy
Repository Translates between Prisma rows and TypeScript objects
Service Validates business rules before touching the DB
Route Receives HTTP requests and returns JSON responses
API Client Calls the backend with fetch
Zustand Store Holds the current level's nodes/edges and all UI state
Canvas Renders React Flow with the store's nodes/edges
ArchNode Draws each block with the right icon, color, and child count badge
