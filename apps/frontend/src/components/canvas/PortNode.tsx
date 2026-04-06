import { memo } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';

const SIDE_TO_INNER_POSITION: Record<string, Position> = {
  top: Position.Bottom,
  bottom: Position.Top,
  left: Position.Right,
  right: Position.Left,
};

const DIRECTION_COLORS = {
  in: {
    border: '#93c5fd',
    bg: '#eff6ff',
    badge: '#3b82f6',
    badgeBg: '#dbeafe',
    label: '#1d4ed8',
  },
  out: {
    border: '#6ee7b7',
    bg: '#f0fdf4',
    badge: '#10b981',
    badgeBg: '#d1fae5',
    label: '#065f46',
  },
};

function PortNodeComponent({ data }: NodeProps) {
  const direction = (data.portDirection as 'in' | 'out') ?? 'in';
  const side = (data.portSide as string) ?? 'left';
  const name = (data.name as string) ?? '';

  const innerPosition = SIDE_TO_INNER_POSITION[side] ?? Position.Right;
  const colors = DIRECTION_COLORS[direction];
  const badgeLabel = direction === 'in' ? 'INPUT' : 'OUTPUT';

  // INPUT port: represents an external source feeding into this block.
  // Inside the block, arrows should originate FROM the input port → source handle.
  // OUTPUT port: represents an external consumer of this block's output.
  // Inside the block, arrows should point TO the output port → target handle.
  const handleType = direction === 'in' ? 'source' : 'target';
  const handleId = direction === 'in' ? 'port-source' : 'port-target';

  return (
    // NOTE: pointer-events must NOT be 'none' on the root — React Flow needs
    // to detect hover/mousedown on the node to initiate connections.
    // We disable drag via node props (draggable:false), not CSS.
    <div style={{ position: 'relative', opacity: 0.9 }}>
      <Handle
        type={handleType}
        position={innerPosition}
        id={handleId}
        style={{
          width: 12,
          height: 12,
          borderRadius: '50%',
          background: colors.badge,
          border: '2px solid white',
          boxShadow: `0 0 0 2px ${colors.badge}`,
        }}
      />

      <div
        style={{
          border: `2px dashed ${colors.border}`,
          background: colors.bg,
          borderRadius: 8,
          padding: '6px 12px',
          minWidth: 130,
          maxWidth: 190,
          display: 'flex',
          flexDirection: 'column',
          gap: 3,
          userSelect: 'none',
          cursor: 'default',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span
            style={{
              fontSize: 9,
              fontWeight: 700,
              letterSpacing: '0.08em',
              color: colors.label,
              background: colors.badgeBg,
              border: `1px solid ${colors.border}`,
              borderRadius: 4,
              padding: '1px 5px',
              textTransform: 'uppercase',
            }}
          >
            {badgeLabel}
          </span>
        </div>

        <span
          style={{
            fontSize: 12,
            fontWeight: 600,
            color: '#334155',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
          title={name}
        >
          {name}
        </span>

        <span style={{ fontSize: 10, color: '#94a3b8' }}>
          External connection
        </span>
      </div>
    </div>
  );
}

export const PortNode = memo(PortNodeComponent);
