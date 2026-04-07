import {
  Background,
  ConnectionMode,
  Controls,
  MiniMap,
  ReactFlow,
  SelectionMode,
  useReactFlow,
  type Connection,
  type EdgeMouseHandler,
  type Edge as FlowEdge,
  type NodeMouseHandler,
  type OnConnect,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { useCallback, useEffect, useRef } from "react";
import { useAlignmentGuides } from "../../hooks/useAlignmentGuides";
import { useStore } from "../../store";
import { useToast } from "../ui/Toast";
import { AlignmentGuides } from "./AlignmentGuides";
import { ArchEdge } from "./ArchEdge";
import { ArchNode } from "./ArchNode";
import { CanvasToolbar } from "./CanvasToolbar";
import { ContextMenu } from "./ContextMenu";
import { PortNode } from "./PortNode";
import { RemoteCursors } from "./RemoteCursor";

const nodeTypes = { archNode: ArchNode, portNode: PortNode };
const edgeTypes = { archEdge: ArchEdge };

interface CanvasProps {
  projectId: string;
}

function CanvasInner({ projectId }: CanvasProps) {
  const toast = useToast();
  const nodes = useStore((s) => s.nodes);
  const edges = useStore((s) => s.edges);
  const isLoading = useStore((s) => s.isLoading);
  const onNodesChange = useStore((s) => s.onNodesChange);
  const onEdgesChange = useStore((s) => s.onEdgesChange);
  const addEdge = useStore((s) => s.addEdge);
  const navigateInto = useStore((s) => s.navigateInto);
  const navigateUp = useStore((s) => s.navigateUp);
  const breadcrumbs = useStore((s) => s.breadcrumbs);
  const selectNode = useStore((s) => s.selectNode);
  const contextMenu = useStore((s) => s.contextMenu);
  const setContextMenu = useStore((s) => s.setContextMenu);
  const undo = useStore((s) => s.undo);
  const copySelectedNodes = useStore((s) => s.copySelectedNodes);
  const cutNode = useStore((s) => s.cutNode);
  const pasteNodes = useStore((s) => s.pasteNodes);
  const emitCursorMove = useStore((s) => s.emitCursorMove);

  const { screenToFlowPosition } = useReactFlow();
  const { guides, onNodeDrag, onNodeDragStop, applySnapRef } =
    useAlignmentGuides(nodes);

  // Let the alignment hook snap nodes by pushing a position change through React Flow
  applySnapRef.current = useCallback(
    (nodeId: string, x: number, y: number) => {
      onNodesChange([{ type: "position", id: nodeId, position: { x, y } }]);
    },
    [onNodesChange],
  );

  // Global keyboard shortcuts (fire even when canvas doesn't have keyboard focus)
  const undoRef = useRef(undo);
  undoRef.current = undo;
  const copyRef = useRef(copySelectedNodes);
  copyRef.current = copySelectedNodes;
  const cutRef = useRef(cutNode);
  cutRef.current = cutNode;
  const pasteRef = useRef(pasteNodes);
  pasteRef.current = pasteNodes;
  const navigateUpRef = useRef(navigateUp);
  navigateUpRef.current = navigateUp;
  const navigateIntoRef = useRef(navigateInto);
  navigateIntoRef.current = navigateInto;
  const selectNodeRef = useRef(selectNode);
  selectNodeRef.current = selectNode;
  const breadcrumbsRef = useRef(breadcrumbs);
  breadcrumbsRef.current = breadcrumbs;

  useEffect(() => {
    const MOVE_STEP = 1;

    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName;
      const inInput =
        tag === "INPUT" ||
        tag === "TEXTAREA" ||
        (e.target as HTMLElement).isContentEditable;

      // Tab always cycles nodes regardless of where focus is
      if (e.key === "Tab" && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        const realNodes = useStore
          .getState()
          .nodes.filter((n) => !n.id.startsWith("__port__"));
        if (realNodes.length === 0) return;
        const currentIdx = realNodes.findIndex((n) => n.selected);
        const nextIdx = (currentIdx + 1) % realNodes.length;
        selectNodeRef.current(realNodes[nextIdx].id);
        return;
      }

      // Esc closes the detail panel (works even when focused in panel inputs)
      if (e.key === "Escape") {
        useStore.getState().closeDetail();
        selectNodeRef.current(null);
        return;
      }

      // All remaining shortcuts ignore input fields
      if (inInput) return;

      const state = useStore.getState();
      const realNodes = state.nodes.filter((n) => !n.id.startsWith("__port__"));
      const selectedNode = realNodes.find((n) => n.selected);

      // Enter → drill into selected node
      if (e.key === "Enter" && !e.ctrlKey && !e.metaKey) {
        if (selectedNode) {
          e.preventDefault();
          navigateIntoRef.current(
            selectedNode.id,
            selectedNode.data?.name as string,
          );
        }
        return;
      }

      // Backspace → navigate up (only when nothing selected)
      if (e.key === "Backspace" && !e.ctrlKey && !e.metaKey) {
        if (!selectedNode && breadcrumbsRef.current.length > 1) {
          e.preventDefault();
          navigateUpRef.current();
        }
        return;
      }

      // Arrow keys:
      // Plain arrow → traverse to nearest node in that direction
      // Shift+Arrow → move selected node by MOVE_STEP px
      if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.key)) {
        e.preventDefault();

        if (e.shiftKey && selectedNode) {
          // Move the selected node
          const dx =
            e.key === "ArrowLeft"
              ? -MOVE_STEP
              : e.key === "ArrowRight"
                ? MOVE_STEP
                : 0;
          const dy =
            e.key === "ArrowUp"
              ? -MOVE_STEP
              : e.key === "ArrowDown"
                ? MOVE_STEP
                : 0;
          state.onNodesChange([
            {
              type: "position",
              id: selectedNode.id,
              position: {
                x: selectedNode.position.x + dx,
                y: selectedNode.position.y + dy,
              },
            },
          ]);
        } else {
          // Traverse to the nearest node in the arrow direction
          if (realNodes.length === 0) return;
          const origin = selectedNode ?? realNodes[0];
          const ox = origin.position.x + (origin.width ?? 160) / 2;
          const oy = origin.position.y + (origin.height ?? 60) / 2;

          const candidates = realNodes
            .filter((n) => n.id !== origin.id)
            .filter((n) => {
              const nx = n.position.x + (n.width ?? 160) / 2;
              const ny = n.position.y + (n.height ?? 60) / 2;
              if (e.key === "ArrowRight") return nx > ox;
              if (e.key === "ArrowLeft") return nx < ox;
              if (e.key === "ArrowDown") return ny > oy;
              if (e.key === "ArrowUp") return ny < oy;
              return false;
            });

          if (candidates.length === 0) return;

          // Score by weighted distance — prioritise same-axis proximity
          const best = candidates.reduce((prev, cur) => {
            const score = (n: typeof origin) => {
              const nx = n.position.x + (n.width ?? 160) / 2;
              const ny = n.position.y + (n.height ?? 60) / 2;
              const axial = ["ArrowLeft", "ArrowRight"].includes(e.key)
                ? Math.abs(nx - ox)
                : Math.abs(ny - oy);
              const lateral = ["ArrowLeft", "ArrowRight"].includes(e.key)
                ? Math.abs(ny - oy)
                : Math.abs(nx - ox);
              return axial + lateral * 2;
            };
            return score(cur) < score(prev) ? cur : prev;
          });

          selectNodeRef.current(best.id);
        }
        return;
      }

      // Ctrl+Z undo
      if ((e.ctrlKey || e.metaKey) && e.key === "z" && !e.shiftKey) {
        e.preventDefault();
        undoRef.current();
      } else if ((e.ctrlKey || e.metaKey) && e.key === "c") {
        e.preventDefault();
        copyRef.current();
      } else if ((e.ctrlKey || e.metaKey) && e.key === "x") {
        e.preventDefault();
        if (selectedNode) cutRef.current(projectId, selectedNode.id);
      } else if ((e.ctrlKey || e.metaKey) && e.key === "v") {
        e.preventDefault();
        pasteRef.current(projectId);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [projectId]);

  // Listen for access-denied events from navigateInto (role-based node blocking)
  useEffect(() => {
    const handler = (e: Event) => {
      const message =
        (e as CustomEvent<{ message: string }>).detail?.message ??
        "Access denied";
      toast(message, "warning");
    };
    window.addEventListener("deeparch:access-denied", handler);
    return () => window.removeEventListener("deeparch:access-denied", handler);
  }, [toast]);
  const onConnect: OnConnect = useCallback(
    (connection: Connection) => {
      let conn = connection;
      // If the user dragged an arrow TO an INPUT port, flip it so it goes FROM the port instead
      if (
        conn.target?.startsWith("__port__") &&
        conn.targetHandle === "port-source"
      ) {
        conn = {
          source: conn.target,
          sourceHandle: "port-source",
          target: conn.source,
          targetHandle: conn.sourceHandle,
        };
      }
      // If the user dragged FROM an OUTPUT port, flip it so it points TO the port instead
      if (
        conn.source?.startsWith("__port__") &&
        conn.sourceHandle === "port-target"
      ) {
        conn = {
          source: conn.target,
          sourceHandle: conn.targetHandle,
          target: conn.source,
          targetHandle: "port-target",
        };
      }
      addEdge(projectId, conn);
    },
    [projectId, addEdge],
  );

  const isValidConnection = useCallback((connection: Connection | FlowEdge) => {
    if (connection.source === connection.target) return false;
    // Block same-side connections between regular nodes (e.g. top→top)
    if (
      connection.sourceHandle &&
      connection.targetHandle &&
      connection.sourceHandle === connection.targetHandle &&
      !connection.source?.startsWith("__port__") &&
      !connection.target?.startsWith("__port__")
    )
      return false;
    return true;
  }, []);

  const onNodeDoubleClick: NodeMouseHandler = useCallback(
    (_event, node) => {
      if (node.id.startsWith("__port__")) return;
      navigateInto(node.id, node.data?.name as string);
    },
    [navigateInto],
  );

  const onNodeClick: NodeMouseHandler = useCallback(
    (_event, node) => {
      if (node.id.startsWith("__port__")) return;
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
      // Port nodes are virtual — suppress context menu
      if (node.id.startsWith("__port__")) return;
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

  const onMouseMove = useCallback(
    (event: React.MouseEvent) => {
      const flowPos = screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });
      emitCursorMove(projectId, flowPos.x, flowPos.y);
    },
    [projectId, emitCursorMove, screenToFlowPosition],
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
    <div
      className="flex-1 relative"
      onKeyDown={onKeyDown}
      onMouseMove={onMouseMove}
    >
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
        selectionOnDrag
        selectionMode={SelectionMode.Partial}
        panOnDrag={[1, 2]}
        panActivationKeyCode="Space"
        onNodeDrag={onNodeDrag}
        onNodeDragStop={onNodeDragStop}
        defaultEdgeOptions={{
          type: "archEdge",
          animated: false,
        }}
      >
        <Background gap={20} size={1} color="#e2e8f0" />
        <AlignmentGuides guides={guides} />
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
        <RemoteCursors />
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
