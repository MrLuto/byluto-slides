/**
 * SlideSidebar — Phase 4B chrome refresh.
 *
 * Pure UI polish. Same store actions, same interactions:
 *   - addSlide / duplicateCurrentSlide / deleteCurrentSlide
 *   - clicking a row → setCurrentSlide
 *
 * Now shows a numbered "filmstrip" with a 16:9 thumbnail rectangle and
 * the slide name underneath, mimicking Slides/PowerPoint.
 */
import React, { useState } from 'react';
import { Copy, Plus, Trash2 } from 'lucide-react';
import {
  useCurrentDeck,
  useCurrentSlideId,
  useDeckActions,
} from '@/editor/state/deckStore';
import type { Slide } from '@/editor/model/types';
import { DataSlideRenderer } from './DataSlideRenderer';
import { SlideStage } from '@/slides/runtime/SlideStage';

/**
 * SlideThumb — renders a real miniature of the slide.
 *
 * Uses `DataSlideRenderer` directly (NOT `EditorSlide`), so the editor
 * `SelectionLayer` and its handles never appear in the sidebar.
 * `SlideStage mode="thumb"` scales 1920×1080 down to fit the 16:9 box and
 * sets `interactive={false}` by default → all pointer events are blocked,
 * so clicks bubble to the parent button.
 *
 * Memoized on slide identity + reference so unrelated slide edits don't
 * re-render the entire filmstrip.
 */
const SlideThumb = React.memo(function SlideThumb({ slide }: { slide: Slide }) {
  return (
    <SlideStage mode="thumb" interactive={false}>
      <DataSlideRenderer slide={slide} />
    </SlideStage>
  );
});

export function SlideSidebar() {
  const deck = useCurrentDeck();
  const currentId = useCurrentSlideId();
  const {
    setCurrentSlide,
    addSlide,
    duplicateCurrentSlide,
    deleteCurrentSlide,
    moveSlide,
  } = useDeckActions();

  // Native HTML5 DnD state. `dragIndex` is the source row being dragged;
  // `overIndex` encodes the drop position as an *insertion gap* index in
  // the range [0, slides.length], where N means "after the last slide".
  // We render a thin highlighted bar at that gap as drop feedback.
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [overIndex, setOverIndex] = useState<number | null>(null);

  if (!deck) return null;

  // Translate an insertion-gap index into the destination index expected
  // by `moveSlide(fromIndex, toIndex)`. When dragging downward, the source
  // is removed first, which shifts every later index down by one — so for
  // gaps strictly after the source we subtract one. Same-position drops
  // (gap === from or gap === from + 1) are no-ops.
  const commitDrop = (from: number, gap: number) => {
    if (gap === from || gap === from + 1) return;
    const to = gap > from ? gap - 1 : gap;
    moveSlide(from, to);
  };

  return (
    <aside className="flex flex-col w-56 shrink-0 border-r border-border bg-background/60">
      <div className="flex items-center justify-between px-3 h-10 border-b border-border">
        <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
          Slides · {deck.slides.length}
        </span>
        <div className="flex items-center gap-0.5">
          <SidebarIconBtn onClick={addSlide} title="New slide">
            <Plus className="h-3.5 w-3.5" />
          </SidebarIconBtn>
          <SidebarIconBtn
            onClick={duplicateCurrentSlide}
            disabled={!currentId}
            title="Duplicate"
          >
            <Copy className="h-3.5 w-3.5" />
          </SidebarIconBtn>
          <SidebarIconBtn
            onClick={deleteCurrentSlide}
            disabled={deck.slides.length <= 1}
            title="Delete"
            danger
          >
            <Trash2 className="h-3.5 w-3.5" />
          </SidebarIconBtn>
        </div>
      </div>

      <ul
        className="flex-1 min-h-0 overflow-y-auto p-2 space-y-1.5"
        onDragOver={(e) => {
          // Allow drop when pointer is between rows / past the last row.
          if (dragIndex !== null) e.preventDefault();
        }}
        onDrop={(e) => {
          if (dragIndex === null) return;
          e.preventDefault();
          const gap = overIndex ?? deck.slides.length;
          commitDrop(dragIndex, gap);
          setDragIndex(null);
          setOverIndex(null);
        }}
      >
        {deck.slides.map((sl, i) => {
          const active = sl.id === currentId;
          const isDragging = dragIndex === i;
          // Show drop indicator above row `i` when overIndex === i, and
          // below the last row when overIndex === slides.length.
          const showBarAbove = overIndex === i && dragIndex !== null;
          const showBarBelow =
            i === deck.slides.length - 1 &&
            overIndex === deck.slides.length &&
            dragIndex !== null;
          return (
            <li
              key={sl.id}
              draggable
              onDragStart={(e) => {
                setDragIndex(i);
                e.dataTransfer.effectAllowed = 'move';
                // Required by Firefox to actually start the drag.
                e.dataTransfer.setData('text/plain', sl.id);
              }}
              onDragEnd={() => {
                setDragIndex(null);
                setOverIndex(null);
              }}
              onDragOver={(e) => {
                if (dragIndex === null) return;
                e.preventDefault();
                e.dataTransfer.dropEffect = 'move';
                // Pick the nearer gap (top half → before, bottom half → after).
                const rect = e.currentTarget.getBoundingClientRect();
                const before = e.clientY - rect.top < rect.height / 2;
                setOverIndex(before ? i : i + 1);
              }}
            >
              {/* Top drop indicator */}
              <div
                className={
                  'h-0.5 -my-0.5 rounded-full mx-2 ' +
                  (showBarAbove ? 'bg-primary' : 'bg-transparent')
                }
                aria-hidden
              />
              <button
                onClick={() => setCurrentSlide(sl.id)}
                className={
                  'group w-full flex items-stretch gap-2 p-1.5 rounded-md text-left transition-colors ' +
                  (isDragging ? 'opacity-40 ' : '') +
                  (active
                    ? 'bg-primary/10 ring-1 ring-primary/40'
                    : 'hover:bg-muted/60')
                }
              >
                <span
                  className={
                    'shrink-0 self-center w-5 text-[10px] font-mono text-right ' +
                    (active
                      ? 'text-primary'
                      : 'text-muted-foreground group-hover:text-foreground')
                  }
                >
                  {i + 1}
                </span>
                <span
                  className={
                    'flex-1 min-w-0 aspect-video rounded-sm border overflow-hidden shadow-sm bg-white ' +
                    (active ? 'border-primary/50' : 'border-border')
                  }
                  aria-hidden
                >
                  <SlideThumb slide={sl} />
                </span>
              </button>
              <div
                className={
                  'pl-9 pr-2 pt-0.5 text-[11px] font-mono truncate ' +
                  (active ? 'text-foreground' : 'text-muted-foreground')
                }
              >
                {sl.name ?? 'Untitled'}
              </div>
              {/* Bottom drop indicator (only on last row, for "drop at end"). */}
              <div
                className={
                  'h-0.5 mt-1 rounded-full mx-2 ' +
                  (showBarBelow ? 'bg-primary' : 'bg-transparent')
                }
                aria-hidden
              />
            </li>
          );
        })}
      </ul>
    </aside>
  );
}

function SidebarIconBtn({
  children,
  onClick,
  disabled,
  title,
  danger,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  title?: string;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={
        'h-7 w-7 inline-flex items-center justify-center rounded ' +
        'text-muted-foreground hover:text-foreground hover:bg-muted ' +
        'disabled:opacity-40 disabled:hover:bg-transparent disabled:cursor-not-allowed ' +
        'transition-colors ' +
        (danger ? 'hover:text-destructive ' : '')
      }
    >
      {children}
    </button>
  );
}
