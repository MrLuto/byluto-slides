/**
 * MockDeckPreview — Phase 4B chrome refresh.
 *
 * Layout (purely visual reorganization — no behavior change):
 *
 *   ┌────────────────────────────────────────────────────────────────┐
 *   │ EditorTopBar (file · history · insert · edit)                  │
 *   ├──────────┬─────────────────────────────────────────┬───────────┤
 *   │ Sidebar  │ Canvas (rulers, shadow, floating zoom)  │ Inspector │
 *   ├──────────┴─────────────────────────────────────────┴───────────┤
 *   │ EditorStatusBar (slide nav · save status · reset)              │
 *   └────────────────────────────────────────────────────────────────┘
 *
 * Render-only components (SlideStage / EditorSlide / DataSlideRenderer)
 * are untouched. Store wiring identical to before — autosave still drives
 * status, setCurrentSlide / setZoom still drive nav / zoom.
 */
import React from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Minus,
  Plus,
  RotateCcw,
} from 'lucide-react';
import { SlideStage } from '@/slides/runtime/SlideStage';
import { mockDeck } from '@/editor/model/mockDeck';
import { EditorSlide } from './EditorSlide';
import { EditorTopBar } from './EditorTopBar';
import { InspectorPanel } from './InspectorPanel';
import { SlideSidebar } from './SlideSidebar';
import {
  useCurrentDeck,
  useCurrentSlide,
  useDeckActions,
  useZoom,
} from '@/editor/state/deckStore';
import { useDeckPersistence } from '@/editor/state/useDeckPersistence';

export function MockDeckPreview({ deckId }: { deckId?: string } = {}) {
  const { setCurrentSlide, setZoom } = useDeckActions();
  const deck = useCurrentDeck();
  const slide = useCurrentSlide();
  const zoom = useZoom();
  const { status, mode, title, setTitle, reset } = useDeckPersistence({
    deckId,
    fallbackDeck: mockDeck,
  });

  if (!deck || !slide) {
    return (
      <div className="flex h-full w-full items-center justify-center text-sm text-muted-foreground bg-muted/30">
        Loading deck…
      </div>
    );
  }

  const total = deck.slides.length;
  const index = deck.slides.findIndex((s) => s.id === slide.id);
  const goPrev = () =>
    index > 0 && setCurrentSlide(deck.slides[index - 1].id);
  const goNext = () =>
    index < total - 1 && setCurrentSlide(deck.slides[index + 1].id);

  return (
    <div className="flex flex-col h-full w-full bg-muted/30 text-foreground">
      <EditorTopBar />

      <div className="flex-1 min-h-0 flex">
        <SlideSidebar />

        {/* Canvas region */}
        <div className="relative flex-1 min-w-0 flex items-center justify-center overflow-hidden bg-[radial-gradient(circle_at_center,hsl(var(--muted))_0%,hsl(var(--background))_100%)]">
          {/* Rulers */}
          <Ruler axis="x" />
          <Ruler axis="y" />

          {/* Slide canvas with shadow */}
          <div className="relative h-full w-full p-12 pl-14 pt-14 flex items-center justify-center">
            <div className="relative w-full h-full rounded-md shadow-[0_10px_40px_-10px_rgba(0,0,0,0.25)] ring-1 ring-border bg-white overflow-hidden">
              <SlideStage mode="edit" zoom={zoom}>
                <EditorSlide slide={slide} />
              </SlideStage>
            </div>
          </div>

          {/* Floating zoom controls (bottom-right of canvas) */}
          <div className="absolute bottom-4 right-4 flex items-center gap-0.5 h-9 px-1 rounded-full border border-border bg-background/95 shadow-md backdrop-blur">
            <FloatBtn onClick={() => setZoom(zoom - 10)} title="Zoom out">
              <Minus className="h-4 w-4" />
            </FloatBtn>
            <button
              onClick={() => setZoom(100)}
              className="text-xs font-mono w-12 text-center tabular-nums hover:text-primary transition-colors"
              title="Reset zoom"
            >
              {zoom}%
            </button>
            <FloatBtn onClick={() => setZoom(zoom + 10)} title="Zoom in">
              <Plus className="h-4 w-4" />
            </FloatBtn>
          </div>
        </div>

        <InspectorPanel />
      </div>

      {/* Bottom status bar */}
      <div className="flex items-center h-9 px-3 border-t border-border bg-background/95 text-xs">
        <div className="flex items-center gap-1">
          <FloatBtn onClick={goPrev} disabled={index <= 0} title="Previous slide">
            <ChevronLeft className="h-3.5 w-3.5" />
          </FloatBtn>
          <span className="font-mono text-muted-foreground tabular-nums px-1">
            {index + 1} / {total}
          </span>
          <FloatBtn
            onClick={goNext}
            disabled={index >= total - 1}
            title="Next slide"
          >
            <ChevronRight className="h-3.5 w-3.5" />
          </FloatBtn>
          <span className="ml-2 font-medium truncate max-w-[16rem]">
            {slide.name ?? 'Untitled slide'}
          </span>
        </div>

        <div className="ml-auto flex items-center gap-3">
          <SaveStatus status={status} />
          <button
            onClick={reset}
            title="Reset to mock deck"
            className="inline-flex items-center gap-1 h-6 px-2 rounded text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            <RotateCcw className="h-3 w-3" />
            Reset
          </button>
        </div>
      </div>
    </div>
  );
}

function FloatBtn({
  children,
  onClick,
  disabled,
  title,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  title?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      className="h-7 w-7 inline-flex items-center justify-center rounded-full text-muted-foreground hover:text-foreground hover:bg-muted disabled:opacity-40 disabled:hover:bg-transparent disabled:cursor-not-allowed transition-colors"
    >
      {children}
    </button>
  );
}

function SaveStatus({ status }: { status: 'idle' | 'saving' | 'saved' | 'error' }) {
  const dot =
    status === 'error'
      ? 'bg-destructive'
      : status === 'saving'
      ? 'bg-amber-500 animate-pulse'
      : 'bg-emerald-500';
  const label =
    status === 'saving'
      ? 'Saving…'
      : status === 'error'
      ? 'Save error'
      : 'Saved';
  return (
    <span className="inline-flex items-center gap-1.5 font-mono text-muted-foreground">
      <span className={'h-1.5 w-1.5 rounded-full ' + dot} />
      {label}
    </span>
  );
}

// ── Rulers ─────────────────────────────────────────────────────────────
// Decorative only — they live inside the canvas region and don't affect
// SlideStage sizing because the canvas wrapper has `pl-14 pt-14` padding
// reserved for them.
function Ruler({ axis }: { axis: 'x' | 'y' }) {
  if (axis === 'x') {
    return (
      <div
        className="absolute top-0 left-14 right-0 h-6 border-b border-border bg-background/60 pointer-events-none"
        style={{
          backgroundImage:
            'repeating-linear-gradient(to right, hsl(var(--border)) 0 1px, transparent 1px 50px)',
          backgroundPosition: '0 100%',
          backgroundSize: '50px 6px',
          backgroundRepeat: 'repeat-x',
        }}
        aria-hidden
      />
    );
  }
  return (
    <div
      className="absolute top-6 left-0 bottom-0 w-6 border-r border-border bg-background/60 pointer-events-none"
      style={{
        backgroundImage:
          'repeating-linear-gradient(to bottom, hsl(var(--border)) 0 1px, transparent 1px 50px)',
        backgroundPosition: '100% 0',
        backgroundSize: '6px 50px',
        backgroundRepeat: 'repeat-y',
      }}
      aria-hidden
    />
  );
}
