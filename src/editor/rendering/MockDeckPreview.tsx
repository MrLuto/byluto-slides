/**
 * Dev-only preview of the editor data model + Phase 3A store integration.
 *
 * Slide selection, current slide id, and zoom now flow through the
 * Zustand `useDeckStore`. The deck is loaded once on mount via `setDeck`.
 *
 * Render-only components (DataSlideRenderer / SlideStage) still receive
 * data via props — they remain store-agnostic.
 */
import React, { useEffect } from 'react';
import { SlideStage } from '@/slides/runtime/SlideStage';
import { mockDeck } from '@/editor/model/mockDeck';
import { EditorSlide } from './EditorSlide';
import { InspectorPanel } from './InspectorPanel';
import { InsertToolbar } from './InsertToolbar';
import { IOToolbar } from './IOToolbar';
import { SlideSidebar } from './SlideSidebar';
import {
  useCurrentDeck,
  useCurrentSlide,
  useDeckActions,
  useZoom,
} from '@/editor/state/deckStore';

export function MockDeckPreview() {
  const { setDeck, setCurrentSlide, setZoom } = useDeckActions();
  const deck = useCurrentDeck();
  const slide = useCurrentSlide();
  const zoom = useZoom();

  // Load the mock deck once.
  useEffect(() => {
    setDeck(mockDeck);
  }, [setDeck]);

  if (!deck || !slide) {
    return (
      <div className="flex h-full w-full items-center justify-center text-sm text-muted-foreground">
        Loading deck…
      </div>
    );
  }

  const total = deck.slides.length;
  const index = deck.slides.findIndex((s) => s.id === slide.id);

  const goPrev = () => {
    if (index > 0) setCurrentSlide(deck.slides[index - 1].id);
  };
  const goNext = () => {
    if (index < total - 1) setCurrentSlide(deck.slides[index + 1].id);
  };

  return (
    <div className="flex flex-col h-full w-full bg-[hsl(var(--canvas-bg,0_0%_96%))]">
      <IOToolbar />
      <InsertToolbar />
      <div className="flex-1 min-h-0 flex">
        <SlideSidebar />
        <div className="flex-1 min-w-0 p-8 overflow-hidden">
          <SlideStage mode="edit" zoom={zoom}>
            <EditorSlide slide={slide} />
          </SlideStage>
        </div>
        <InspectorPanel />
      </div>

      <div className="flex items-center justify-center gap-3 p-3 border-t border-border">
        <button
          className="px-3 py-1 rounded border text-sm disabled:opacity-40"
          onClick={goPrev}
          disabled={index <= 0}
        >
          Prev
        </button>
        <span className="text-sm font-mono text-muted-foreground">
          {index + 1} / {total} — {slide.name ?? 'Untitled'}
        </span>
        <button
          className="px-3 py-1 rounded border text-sm disabled:opacity-40"
          onClick={goNext}
          disabled={index >= total - 1}
        >
          Next
        </button>

        <span className="mx-2 h-4 w-px bg-border" />

        <button
          className="px-2 py-1 rounded border text-sm"
          onClick={() => setZoom(zoom - 10)}
        >
          −
        </button>
        <span className="text-xs font-mono text-muted-foreground w-12 text-center">
          {zoom}%
        </span>
        <button
          className="px-2 py-1 rounded border text-sm"
          onClick={() => setZoom(zoom + 10)}
        >
          +
        </button>
      </div>
    </div>
  );
}
