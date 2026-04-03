import {
  BaseEdge,
  EdgeLabelRenderer,
  getSmoothStepPath,
  Position,
  type EdgeProps,
} from "@xyflow/react";
import { useState } from "react";

const ARROW_LEN = 10;
const ARROW_HALF = 5;

// Move path endpoint back to where the arrow base is (outside the node border).
// Top handle: edge arrives from above → base is above the border → y - ARROW_LEN
// Bottom handle: edge arrives from below → base is below the border → y + ARROW_LEN
// Left handle: edge arrives from the left → base is left of the border → x - ARROW_LEN
// Right handle: edge arrives from the right → base is right of the border → x + ARROW_LEN
function offsetTarget(x: number, y: number, position: Position): [number, number] {
  switch (position) {
    case Position.Top:    return [x, y - ARROW_LEN];
    case Position.Bottom: return [x, y + ARROW_LEN];
    case Position.Left:   return [x - ARROW_LEN, y];
    case Position.Right:  return [x + ARROW_LEN, y];
  }
}

// Returns arrowhead polygon points with tip at (tx, ty).
// targetPosition is the side of the target node the edge connects to,
// so the arrow points inward from that side.
function arrowPoints(tx: number, ty: number, position: Position): string {
  switch (position) {
    case Position.Top:
      // edge arrives at top face → tip points downward into node
      return `${tx},${ty} ${tx - ARROW_HALF},${ty - ARROW_LEN} ${tx + ARROW_HALF},${ty - ARROW_LEN}`;
    case Position.Bottom:
      // edge arrives at bottom face → tip points upward into node
      return `${tx},${ty} ${tx - ARROW_HALF},${ty + ARROW_LEN} ${tx + ARROW_HALF},${ty + ARROW_LEN}`;
    case Position.Left:
      // edge arrives at left face → tip points rightward into node
      return `${tx},${ty} ${tx - ARROW_LEN},${ty - ARROW_HALF} ${tx - ARROW_LEN},${ty + ARROW_HALF}`;
    case Position.Right:
      // edge arrives at right face → tip points leftward into node
      return `${tx},${ty} ${tx + ARROW_LEN},${ty - ARROW_HALF} ${tx + ARROW_LEN},${ty + ARROW_HALF}`;
  }
}

export function ArchEdge({
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  label,
  style = {},
  selected,
}: EdgeProps) {
  const [isHovered, setIsHovered] = useState(false);

  const [adjTgtX, adjTgtY] = offsetTarget(targetX, targetY, targetPosition);

  const [edgePath, labelX, labelY] = getSmoothStepPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX: adjTgtX,
    targetY: adjTgtY,
    targetPosition,
    borderRadius: 12,
  });

  const strokeColor = selected ? "#3b82f6" : isHovered ? "#64748b" : "#94a3b8";
  const strokeWidth = selected ? 3 : 2;
  const shadowFilter =
    isHovered || selected
      ? "drop-shadow(0 0 5px rgba(148,163,184,0.7))"
      : undefined;

  const arrowPts = arrowPoints(targetX, targetY, targetPosition);

  return (
    <>
      {/* Invisible wide path for hover detection */}
      <path
        d={edgePath}
        fill="none"
        stroke="transparent"
        strokeWidth={20}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        style={{ cursor: "pointer" }}
      />
      <BaseEdge
        path={edgePath}
        style={{
          stroke: strokeColor,
          strokeWidth,
          filter: shadowFilter,
          transition: "stroke 0.15s, stroke-width 0.15s, filter 0.15s",
          ...style,
        }}
      />
      {/* Arrowhead drawn directly as a polygon at the target border */}
      <polygon
        points={arrowPts}
        fill={strokeColor}
        style={{ transition: "fill 0.15s" }}
      />
      {label && (
        <EdgeLabelRenderer>
          <div
            style={{
              position: "absolute",
              transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
              pointerEvents: "all",
            }}
            className={`bg-white px-2 py-0.5 rounded border text-xs shadow-sm ${
              selected
                ? "border-blue-400 text-blue-700 ring-1 ring-blue-300"
                : "border-slate-200 text-slate-600"
            }`}
          >
            {label}
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
}
