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

const NODE_TYPE_COLORS: Record<string, { border: string; bg: string; text: string; icon: string }> = {
  default: { border: 'border-border', bg: 'bg-card', text: 'text-card-foreground', icon: 'text-muted-foreground' },
  service: { border: 'border-blue-400', bg: 'bg-blue-100 dark:bg-blue-900/30', text: 'text-foreground', icon: 'text-blue-600 dark:text-blue-400' },
  database: { border: 'border-green-400', bg: 'bg-green-100 dark:bg-green-900/30', text: 'text-foreground', icon: 'text-green-600 dark:text-green-400' },
  queue: { border: 'border-orange-400', bg: 'bg-orange-100 dark:bg-orange-900/30', text: 'text-foreground', icon: 'text-orange-600 dark:text-orange-400' },
  gateway: { border: 'border-purple-400', bg: 'bg-purple-100 dark:bg-purple-900/30', text: 'text-foreground', icon: 'text-purple-600 dark:text-purple-400' },
  'load-balancer': { border: 'border-cyan-400', bg: 'bg-cyan-100 dark:bg-cyan-900/30', text: 'text-foreground', icon: 'text-cyan-600 dark:text-cyan-400' },
  frontend: { border: 'border-pink-400', bg: 'bg-pink-100 dark:bg-pink-900/30', text: 'text-foreground', icon: 'text-pink-600 dark:text-pink-400' },
  environment: { border: 'border-indigo-400', bg: 'bg-indigo-100 dark:bg-indigo-900/30', text: 'text-foreground', icon: 'text-indigo-600 dark:text-indigo-400' },
  infrastructure: { border: 'border-amber-400', bg: 'bg-amber-100 dark:bg-amber-900/30', text: 'text-foreground', icon: 'text-amber-600 dark:text-amber-400' },
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
        background: filled ? 'hsl(var(--primary))' : 'transparent',
        border: visible ? '2px solid hsl(var(--primary))' : 'none',
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
    const related = e.relatedTarget;
    if (related instanceof Node && wrapperRef.current?.contains(related)) return;
    setHovered(false);
  };

  const nodeType = (data.nodeType as string) || 'default';
  const Icon = NODE_TYPE_ICONS[nodeType] || Box;
  const colors = NODE_TYPE_COLORS[nodeType] || NODE_TYPE_COLORS.default;
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
          ${colors.border} ${colors.bg}
          ${selected ? 'ring-2 ring-blue-500 shadow-md' : hovered ? 'shadow-md' : ''}
        `}
      >
        <div className="flex items-center gap-2">
          <Icon className={`w-4 h-4 ${colors.icon} flex-shrink-0`} />
          <span className={`font-medium text-sm ${colors.text} truncate`}>{name}</span>
          {childCount > 0 && (
            <span
              className="ml-auto flex-shrink-0 bg-muted text-muted-foreground text-xs font-medium px-1.5 py-0.5 rounded-full"
              title={`Contains ${childCount} sub-node${childCount !== 1 ? 's' : ''} (double-click to drill down)`}
            >
              {childCount}
            </span>
          )}
        </div>
        {description && (
          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{description}</p>
        )}
      </div>
    </div>
  );
}

export const ArchNode = memo(ArchNodeComponent);
