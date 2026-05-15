/**
 * SlideSidebar — Phase 3I.
 *
 * Dev-only slide list for the mock editor. Shows slide number + name and
 * the current/selected state. Buttons call the store actions:
 *   - addSlide          → append a blank slide and select it
 *   - duplicateCurrent  → clone current slide; both slide.id and every
 *                         element.id are regenerated via crypto.randomUUID
 *                         inside the store action so nothing collides
 *   - deleteCurrent     → remove current; store auto-selects a neighbor
 *                         and refuses to delete the final slide
 *
 * Selection + text-edit state is cleared whenever the current slide
 * changes (handled inside `setCurrentSlide` and the slide actions).
 */
import React from 'react';
import {
  useCurrentDeck,
  useCurrentSlideId,
  useDeckActions,
} from '@/editor/state/deckStore';

export function SlideSidebar() {
  const deck = useCurrentDeck();
  const currentId = useCurrentSlideId();
  const {
    setCurrentSlide,
    addSlide,
    duplicateCurrentSlide,
    deleteCurrentSlide,
  } = useDeckActions();

  if (!deck) return null;

  const btn =
    'px-2 py-1 rounded border border-border text-xs hover:bg-accent disabled:opacity-40';

  return (
    <div className="flex flex-col w-48 shrink-0 border-r border-border bg-background">
      <div className="flex flex-wrap gap-1 p-2 border-b border-border">
        <button className={btn} onClick={addSlide}>+ New</button>
        <button
          className={btn}
          onClick={duplicateCurrentSlide}
          disabled={!currentId}
        >
          Duplicate
        </button>
        <button
          className={btn}
          onClick={deleteCurrentSlide}
          disabled={deck.slides.length <= 1}
        >
          Delete
        </button>
      </div>
      <ul className="flex-1 min-h-0 overflow-y-auto p-2 space-y-1">
        {deck.slides.map((sl, i) => {
          const active = sl.id === currentId;
          return (
            <li key={sl.id}>
              <button
                onClick={() => setCurrentSlide(sl.id)}
                className={
                  'w-full text-left px-2 py-2 rounded border text-xs font-mono ' +
                  (active
                    ? 'border-primary bg-accent text-foreground'
                    : 'border-border hover:bg-accent/50 text-muted-foreground')
                }
              >
                <span className="mr-2">{String(i + 1).padStart(2, '0')}</span>
                <span className="truncate">{sl.name ?? 'Untitled'}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
