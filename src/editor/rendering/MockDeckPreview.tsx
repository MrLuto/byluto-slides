/**
 * Dev-only preview of the editor data model.
 *
 * Not wired into routes. Import and render manually when iterating on the
 * data renderer:
 *
 *   import { MockDeckPreview } from '@/editor/rendering/MockDeckPreview';
 *   <MockDeckPreview />
 *
 * Uses SlideStage in `edit` mode so the preview matches how a real editor
 * canvas will look. Includes a tiny prev/next control so you can flip
 * through the mock deck.
 */
import React, { useState } from 'react';
import { SlideStage } from '@/slides/runtime/SlideStage';
import { mockDeck } from '@/editor/model/mockDeck';
import { DataSlideRenderer } from './DataSlideRenderer';

export function MockDeckPreview() {
  const [index, setIndex] = useState(0);
  const slide = mockDeck.slides[index];
  const total = mockDeck.slides.length;

  return (
    <div className="flex flex-col h-full w-full bg-[hsl(var(--canvas-bg,0_0%_96%))]">
      <div className="flex-1 p-8 overflow-hidden">
        <SlideStage mode="edit">
          <DataSlideRenderer slide={slide} />
        </SlideStage>
      </div>

      <div className="flex items-center justify-center gap-3 p-3 border-t border-border">
        <button
          className="px-3 py-1 rounded border text-sm disabled:opacity-40"
          onClick={() => setIndex((i) => Math.max(0, i - 1))}
          disabled={index === 0}
        >
          Prev
        </button>
        <span className="text-sm font-mono text-muted-foreground">
          {index + 1} / {total} — {slide.name ?? 'Untitled'}
        </span>
        <button
          className="px-3 py-1 rounded border text-sm disabled:opacity-40"
          onClick={() => setIndex((i) => Math.min(total - 1, i + 1))}
          disabled={index === total - 1}
        >
          Next
        </button>
      </div>
    </div>
  );
}
