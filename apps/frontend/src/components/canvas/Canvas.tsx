import {
  Background,
  ConnectionMode,
  Controls,
  MiniMap,
  ReactFlow,
  useReactFlow,
  type Connection,
  type EdgeMouseHandler,
  type Edge as FlowEdge,
  type NodeMouseHandler,
  type OnConnect,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { useCallback, useEffect, useRef } from "react";
import { useStore } from "../../store";
import { ArchEdge } from "./ArchEdge";
import { ArchNode } from "./ArchNode";
import { CanvasToolbar } from "./CanvasToolbar";
import { ContextMenu } from "./ContextMenu";

const nodeTypes = { archNode: ArchNode };
const edgeTypes = { archEdge: ArchEdge };

interface CanvasProps {
  projectId: string;
}

function CanvasInner({ projectId }: CanvasProps) {
  const nodes = useStore((s) => s.nodes);
  const edges = useStore((s) => s.edges);
  const isLoading = useStore((s) => s.isLoading);
  const onNodesChange = useStore((s) => s.onNodesChange);
  const onEdgesChange = useStore((s) => s.onEdgesChange);
  const addEdge = useStore((s) => s.addEdge);
  const navigateInto = useStore((s) => s.navigateInto);
  const selectNode = useStore((s) => s.selectNode);
  const contextMenu = useStore((s) => s.contextMenu);
  const setContextMenu = useStore((s) => s.setContextMenu);
  const undo = useStore((s) => s.undo);

  const { screenToFlowPosition } = useReactFlow();
  const entryExitConnections = useStore((s) => s.entryExitConnections);

  // Global Ctrl+Z listener (fires even when canvas doesn't have keyboard focus)
  const undoRef = useRef(undo);
  undoRef.current = undo;
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "z" && !e.shiftKey) {
        // Only fire if not inside an input/textarea
        const tag = (e.target as HTMLElement).tagName;
        if (tag === "INPUT" || tag === "TEXTAREA") return;
        e.preventDefault();
        undoRef.current();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);
  const entries = entryExitConnections.filter((c) => c.direction === "in");
  const exits = entryExitConnections.filter((c) => c.direction === "out");

  const onConnect: OnConnect = useCallback(
    (connection: Connection) => addEdge(projectId, connection),
    [projectId, addEdge],
  );

  // Prevent self-connections and same-side connections (e.g. top→top).
  // Handle IDs are like "top-src", "top-tgt", "left-src", "left-tgt", etc.
  // Extract the side prefix to compare.
  const isValidConnection = useCallback((connection: Connection | FlowEdge) => {
    if (connection.source === connection.target) return false;
    // Block same-side connections (e.g. top→top)
    if (connection.sourceHandle && connection.targetHandle &&
        connection.sourceHandle === connection.targetHandle) return false;
    return true;
  }, []);

  const onNodeDoubleClick: NodeMouseHandler = useCallback(
    (_event, node) => {
      navigateInto(node.id, node.data?.name as string);
    },
    [navigateInto],
  );

  const onNodeClick: NodeMouseHandler = useCallback(
    (_event, node) => {
      selectNode(node.id);
    },
    [selectNode],
  );

  const onPaneClick = useCallback(() => {
    selectNode(null);
    setContextMenu(null);
  }, [selectNode, setContextMenu]);

  const onNodeContextMenu: NodeMouseHandler = useCallback(
    (event, node) => {
      event.preventDefault();
      setContextMenu({
        type: "node",
        id: node.id,
        name: node.data?.name as string,
        x: event.clientX,
        y: event.clientY,
      });
    },
    [setContextMenu],
  );

  const onEdgeContextMenu: EdgeMouseHandler = useCallback(
    (event, edge) => {
      event.preventDefault();
      setContextMenu({
        type: "edge",
        id: edge.id,
        label: (edge.label as string | null) ?? null,
        x: event.clientX,
        y: event.clientY,
      });
    },
    [setContextMenu],
  );

  const onPaneContextMenu = useCallback(
    (event: MouseEvent | React.MouseEvent) => {
      event.preventDefault();
      const flowPos = screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });
      setContextMenu({
        type: "pane",
        x: event.clientX,
        y: event.clientY,
        canvasX: flowPos.x,
        canvasY: flowPos.y,
      });
    },
    [setContextMenu, screenToFlowPosition],
  );

  const onKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      if (event.key === "Escape") setContextMenu(null);
      if ((event.ctrlKey || event.metaKey) && event.key === "z") {
        event.preventDefault();
        undo();
      }
    },
    [setContextMenu, undo],
  );

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-slate-50">
        <div className="text-slate-400 text-sm">Loading...</div>
      </div>
    );
  }

  return (
    <div className="flex-1 relative" onKeyDown={onKeyDown}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeDoubleClick={onNodeDoubleClick}
        onNodeClick={onNodeClick}
        onPaneClick={onPaneClick}
        onNodeContextMenu={onNodeContextMenu}
        onEdgeContextMenu={onEdgeContextMenu}
        onPaneContextMenu={onPaneContextMenu}
        connectionMode={ConnectionMode.Loose}
        isValidConnection={isValidConnection}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        deleteKeyCode="Delete"
        multiSelectionKeyCode="Shift"
        defaultEdgeOptions={{
          type: "archEdge",
          animated: false,
        }}
      >
        <Background gap={20} size={1} color="#e2e8f0" />
        <Controls showInteractive={false} />
        <MiniMap
          nodeColor={(node) => {
            const colors: Record<string, string> = {
              service: "#3b82f6",
              database: "#22c55e",
              queue: "#f97316",
              gateway: "#a855f7",
              "load-balancer": "#06b6d4",
              frontend: "#ec4899",
              environment: "#6366f1",
              infrastructure: "#f59e0b",
              default: "#94a3b8",
            };
            return (
              colors[(node.data?.nodeType as string) ?? "default"] ?? "#94a3b8"
            );
          }}
          className="!rounded-lg !border !border-slate-200"
        />
        <CanvasToolbar />
      </ReactFlow>

      {nodes.length === 0 && !isLoading && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="text-center text-slate-400">
            <p className="text-lg font-medium mb-1">Empty level</p>
            <p className="text-sm">
              Right-click to add a node, or use the + button
            </p>
          </div>
        </div>
      )}

      {/* Entry connections strip — top */}
      {entries.length > 0 && (
        <div className="absolute top-2 left-1/2 -translate-x-1/2 z-10 pointer-events-none">
          <div className="flex items-center gap-2 bg-white/90 border border-slate-200 rounded-full px-3 py-1 shadow-sm">
            <span className="text-xs text-slate-400 font-medium">
              Inputs from:
            </span>
            {entries.map((c) => (
              <span
                key={c.nodeId}
                className="text-xs font-medium text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200"
              >
                ↓ {c.nodeName}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Exit connections strip — bottom */}
      {exits.length > 0 && (
        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 z-10 pointer-events-none">
          <div className="flex items-center gap-2 bg-white/90 border border-slate-200 rounded-full px-3 py-1 shadow-sm">
            <span className="text-xs text-slate-400 font-medium">
              Outputs to:
            </span>
            {exits.map((c) => (
              <span
                key={c.nodeId}
                className="text-xs font-medium text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200"
              >
                ↑ {c.nodeName}
              </span>
            ))}
          </div>
        </div>
      )}

      {contextMenu && (
        <ContextMenu
          menu={contextMenu}
          projectId={projectId}
          onClose={() => setContextMenu(null)}
        />
      )}
    </div>
  );
}

export function Canvas({ projectId }: CanvasProps) {
  return <CanvasInner projectId={projectId} />;
}
