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
import React from 'react';
import { Copy, Plus, Trash2 } from 'lucide-react';
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

      <ul className="flex-1 min-h-0 overflow-y-auto p-2 space-y-1.5">
        {deck.slides.map((sl, i) => {
          const active = sl.id === currentId;
          const bg =
            (sl.background as { color?: string } | undefined)?.color ??
            '#ffffff';
          return (
            <li key={sl.id}>
              <button
                onClick={() => setCurrentSlide(sl.id)}
                className={
                  'group w-full flex items-stretch gap-2 p-1.5 rounded-md text-left transition-colors ' +
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
                    'flex-1 min-w-0 aspect-video rounded-sm border overflow-hidden shadow-sm ' +
                    (active ? 'border-primary/50' : 'border-border')
                  }
                  style={{ background: bg }}
                  aria-hidden
                />
              </button>
              <div
                className={
                  'pl-9 pr-2 pt-0.5 text-[11px] font-mono truncate ' +
                  (active ? 'text-foreground' : 'text-muted-foreground')
                }
              >
                {sl.name ?? 'Untitled'}
              </div>
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
