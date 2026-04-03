import { memo } from 'react';
import { ViewportPortal } from '@xyflow/react';
import type { GuideLineSpec } from '../../hooks/useAlignmentGuides';

const EXTENT = 10000;

export const AlignmentGuides = memo(function AlignmentGuides({
  guides,
}: {
  guides: GuideLineSpec[];
}) {
  if (guides.length === 0) return null;

  return (
    <ViewportPortal>
      <svg
        style={{
          position: 'absolute',
          left: -EXTENT,
          top: -EXTENT,
          width: EXTENT * 2,
          height: EXTENT * 2,
          pointerEvents: 'none',
          overflow: 'visible',
          zIndex: 1000,
        }}
        viewBox={`${-EXTENT} ${-EXTENT} ${EXTENT * 2} ${EXTENT * 2}`}
      >
        {guides.map((g, i) =>
          g.orientation === 'vertical' ? (
            <line
              key={i}
              x1={g.position} y1={-EXTENT}
              x2={g.position} y2={EXTENT}
              stroke="#3b82f6"
              strokeWidth={1}
              strokeDasharray="4 3"
              opacity={0.75}
            />
          ) : (
            <line
              key={i}
              x1={-EXTENT} y1={g.position}
              x2={EXTENT}  y2={g.position}
              stroke="#3b82f6"
              strokeWidth={1}
              strokeDasharray="4 3"
              opacity={0.75}
            />
          )
        )}
      </svg>
    </ViewportPortal>
  );
});
