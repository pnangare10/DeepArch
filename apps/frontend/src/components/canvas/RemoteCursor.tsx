import { useStore } from '../../store';
import { ViewportPortal } from '@xyflow/react';

export function RemoteCursors() {
  const cursors = useStore((s) => s.cursors);
  const currentParentId = useStore((s) => s.currentParentId);

  const visible = Object.values(cursors).filter(
    (c) => c.parentId === currentParentId,
  );

  if (visible.length === 0) return null;

  return (
    <ViewportPortal>
      {visible.map((cursor) => (
        <div
          key={cursor.userId}
          style={{
            position: 'absolute',
            left: cursor.x,
            top: cursor.y,
            pointerEvents: 'none',
            zIndex: 9999,
            transform: 'translate(-2px, -2px)',
          }}
        >
          {/* Cursor arrow */}
          <svg width="16" height="20" viewBox="0 0 16 20" fill="none">
            <path
              d="M0 0L0 16L4.5 12L7 18L9 17L6.5 11L12 11L0 0Z"
              fill={cursor.color}
              stroke="white"
              strokeWidth="1"
            />
          </svg>
          {/* Name label */}
          <div
            style={{ backgroundColor: cursor.color }}
            className="px-1.5 py-0.5 rounded text-white text-[10px] font-medium whitespace-nowrap ml-2 -mt-1 shadow"
          >
            {cursor.userName}
          </div>
        </div>
      ))}
    </ViewportPortal>
  );
}
