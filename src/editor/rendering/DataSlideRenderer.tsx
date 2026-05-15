/**
 * DataSlideRenderer — renders a Slide from the editor data model.
 *
 * Pure presentation. Wraps the slide in `SlideFrame` (brand-agnostic,
 * `transparent` surface) so the existing scoping (`slide-content`, etc.)
 * still applies. Background is rendered as a dedicated layer so we can
 * support solid / gradient / image without touching SlideFrame.
 *
 * Sorting: elements are rendered in ascending `z`. Equal `z` falls back
 * to array order for stability.
 */
import React, { useMemo } from 'react';
import { SlideFrame } from '@/slides/runtime/SlideFrame';
import type { Slide, SlideBackground } from '@/editor/model/types';
import { ElementRenderer } from './ElementRenderer';

interface DataSlideRendererProps {
  slide: Slide;
  className?: string;
}

export function DataSlideRenderer({ slide, className }: DataSlideRendererProps) {
  const sortedElements = useMemo(() => {
    return [...slide.elements].sort((a, b) => a.z - b.z);
  }, [slide.elements]);

  return (
    <SlideFrame
      background="transparent"
      className={className}
      // Renderer is brand-agnostic; legacy wrappers handle their own marks.
      accent={false}
    >
      <SlideBackgroundLayer background={slide.background} />
      <div className="absolute inset-0">
        {sortedElements.map((el) => (
          <ElementRenderer key={el.id} element={el} />
        ))}
      </div>
    </SlideFrame>
  );
}

// ──────────────────────────────────────────────────────────────────────────
// Background layer
// ──────────────────────────────────────────────────────────────────────────

function SlideBackgroundLayer({ background }: { background: SlideBackground }) {
  const style: React.CSSProperties = {
    position: 'absolute',
    inset: 0,
    pointerEvents: 'none',
  };

  switch (background.type) {
    case 'solid':
      return <div style={{ ...style, background: background.color }} />;
    case 'gradient':
      return (
        <div
          style={{
            ...style,
            background: `linear-gradient(${background.angle}deg, ${background.from}, ${background.to})`,
          }}
        />
      );
    case 'image':
      return (
        <div
          style={{
            ...style,
            backgroundImage: `url(${background.src})`,
            backgroundSize: background.fit === 'fill' ? '100% 100%' : background.fit,
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat',
            opacity: background.opacity ?? 1,
          }}
        />
      );
  }
}
