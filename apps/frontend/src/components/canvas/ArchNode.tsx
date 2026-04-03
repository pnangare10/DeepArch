import { memo, useRef, useState } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import {
  Server,
  Database,
  Globe,
  Box,
  Layers,
  Radio,
  Shield,
  Monitor,
  Cloud,
} from 'lucide-react';

const NODE_TYPE_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  default: Box,
  service: Server,
  database: Database,
  queue: Radio,
  gateway: Shield,
  'load-balancer': Globe,
  frontend: Monitor,
  environment: Cloud,
  infrastructure: Layers,
};

const NODE_TYPE_COLORS: Record<string, string> = {
  default: 'border-slate-300 bg-white',
  service: 'border-blue-400 bg-blue-50',
  database: 'border-green-400 bg-green-50',
  queue: 'border-orange-400 bg-orange-50',
  gateway: 'border-purple-400 bg-purple-50',
  'load-balancer': 'border-cyan-400 bg-cyan-50',
  frontend: 'border-pink-400 bg-pink-50',
  environment: 'border-indigo-400 bg-indigo-50',
  infrastructure: 'border-amber-400 bg-amber-50',
};

const HOVER_ZONE = 16;

// Visual dot rendered inside each handle — zero-size handle means React Flow
// measures the connection point exactly at the node border.
// The dot itself handles hover events (pointerEvents: all) since the handle is zero-size.
function HandleDot({
  visible,
  filled,
  onEnter,
  onLeave,
}: {
  visible: boolean;
  filled: boolean;
  onEnter: () => void;
  onLeave: () => void;
}) {
  return (
    <span
      onMouseEnter={onEnter}
      onMouseLeave={onLeave}
      style={{
        position: 'absolute',
        width: 10,
        height: 10,
        borderRadius: '50%',
        background: filled ? '#475569' : 'transparent',
        border: visible ? '2px solid #475569' : 'none',
        opacity: visible ? 1 : 0,
        transition: 'opacity 0.15s, background 0.1s',
        transform: 'translate(-50%, -50%)',
        zIndex: 10,
        cursor: 'crosshair',
        pointerEvents: visible ? 'all' : 'none',
      }}
    />
  );
}

function ArchNodeComponent({ data, selected }: NodeProps) {
  const [hovered, setHovered] = useState(false);
  const [dotHovered, setDotHovered] = useState<string | null>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  const handleMouseLeave = (e: React.MouseEvent) => {
    // Only hide dots if mouse is leaving to completely outside the node wrapper
    // (not just moving onto a handle, which is a sibling inside the same wrapper)
    if (wrapperRef.current?.contains(e.relatedTarget as Node)) return;
    setHovered(false);
  };

  const nodeType = (data.nodeType as string) || 'default';
  const Icon = NODE_TYPE_ICONS[nodeType] || Box;
  const colorClass = NODE_TYPE_COLORS[nodeType] || NODE_TYPE_COLORS.default;
  const childCount = (data.childCount as number) ?? 0;
  const name = data.name as string;
  const description = data.description as string | null;

  // Zero-size handle: React Flow reads getBoundingClientRect() center as exactly the node border.
  // The visual dot is rendered via HandleDot (pointerEvents: none) so it doesn't affect measurement.
  const handleStyle: React.CSSProperties = {
    width: 0,
    height: 0,
    minWidth: 0,
    minHeight: 0,
    background: 'transparent',
    border: 'none',
    cursor: 'crosshair',
  };

  return (
    <div
      ref={wrapperRef}
      style={{ position: 'relative', display: 'inline-block' }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={handleMouseLeave}
    >
      {/* Expanded hover zone */}
      <div
        style={{ position: 'absolute', inset: -HOVER_ZONE }}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={handleMouseLeave}
      />

      {/* Handles — zero-size so React Flow measures connection point at exact node border.
          Mouse events on the Handle won't fire (no area), so HandleDot owns hover detection. */}
      <Handle type="source" position={Position.Top}    id="top"    style={handleStyle}>
        <HandleDot visible={hovered} filled={dotHovered === 'top'}
          onEnter={() => setDotHovered('top')}    onLeave={() => setDotHovered(null)} />
      </Handle>
      <Handle type="source" position={Position.Bottom} id="bottom" style={handleStyle}>
        <HandleDot visible={hovered} filled={dotHovered === 'bottom'}
          onEnter={() => setDotHovered('bottom')} onLeave={() => setDotHovered(null)} />
      </Handle>
      <Handle type="source" position={Position.Left}   id="left"   style={handleStyle}>
        <HandleDot visible={hovered} filled={dotHovered === 'left'}
          onEnter={() => setDotHovered('left')}   onLeave={() => setDotHovered(null)} />
      </Handle>
      <Handle type="source" position={Position.Right}  id="right"  style={handleStyle}>
        <HandleDot visible={hovered} filled={dotHovered === 'right'}
          onEnter={() => setDotHovered('right')}  onLeave={() => setDotHovered(null)} />
      </Handle>

      {/* Card */}
      <div
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={handleMouseLeave}
        className={`
          px-4 py-3 rounded-lg border-2 shadow-sm min-w-[140px] max-w-[220px]
          transition-shadow duration-150
          ${colorClass}
          ${selected ? 'ring-2 ring-blue-500 shadow-md' : hovered ? 'shadow-md' : ''}
        `}
      >
        <div className="flex items-center gap-2">
          <Icon className="w-4 h-4 text-slate-600 flex-shrink-0" />
          <span className="font-medium text-sm text-slate-800 truncate">{name}</span>
          {childCount > 0 && (
            <span
              className="ml-auto flex-shrink-0 bg-slate-200 text-slate-600 text-xs font-medium px-1.5 py-0.5 rounded-full"
              title={`Contains ${childCount} sub-node${childCount !== 1 ? 's' : ''} (double-click to drill down)`}
            >
              {childCount}
            </span>
          )}
        </div>
        {description && (
          <p className="text-xs text-slate-500 mt-1 line-clamp-2">{description}</p>
        )}
      </div>
    </div>
  );
}

export const ArchNode = memo(ArchNodeComponent);
