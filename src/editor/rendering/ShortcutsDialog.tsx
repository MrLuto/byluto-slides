/**
 * ShortcutsDialog — Phase 4E.
 *
 * Read-only modal listing the editor's current keyboard & mouse shortcuts.
 * Pure UI; does not bind or change any handlers.
 */
import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';

type Shortcut = { label: string; keys: string[] };

const GROUPS: { title: string; items: Shortcut[] }[] = [
  {
    title: 'Selection',
    items: [
      { label: 'Select element', keys: ['Click'] },
      { label: 'Multi-select', keys: ['Shift', 'Click'] },
      { label: 'Edit text', keys: ['Double-click'] },
    ],
  },
  {
    title: 'Transform',
    items: [
      { label: 'Move element', keys: ['Drag'] },
      { label: 'Nudge', keys: ['↑', '↓', '←', '→'] },
      { label: 'Fast nudge', keys: ['Shift', '↑/↓/←/→'] },
      { label: 'Resize', keys: ['Drag corner'] },
    ],
  },
  {
    title: 'Editing',
    items: [
      { label: 'Delete selected', keys: ['Del'] },
      { label: 'Also delete', keys: ['Backspace'] },
      { label: 'Undo', keys: ['⌘/Ctrl', 'Z'] },
      { label: 'Redo', keys: ['⌘/Ctrl', 'Shift', 'Z'] },
      { label: 'Redo (alt)', keys: ['Ctrl', 'Y'] },
    ],
  },
  {
    title: 'File',
    items: [
      { label: 'Import deck', keys: ['Top bar', 'Import JSON'] },
      { label: 'Export deck', keys: ['Top bar', 'Export JSON'] },
      { label: 'Copy deck JSON', keys: ['Top bar', 'Copy'] },
    ],
  },
];

export function ShortcutsDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Keyboard shortcuts</DialogTitle>
          <DialogDescription>
            Quick reference for navigating and editing slides.
          </DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-5 mt-2">
          {GROUPS.map((g) => (
            <section key={g.title}>
              <h3 className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground mb-2">
                {g.title}
              </h3>
              <ul className="space-y-1.5">
                {g.items.map((it) => (
                  <li
                    key={it.label}
                    className="flex items-center justify-between gap-3 text-sm"
                  >
                    <span className="text-foreground">{it.label}</span>
                    <span className="flex items-center gap-1 shrink-0">
                      {it.keys.map((k, i) => (
                        <React.Fragment key={i}>
                          {i > 0 && (
                            <span className="text-muted-foreground text-xs">
                              +
                            </span>
                          )}
                          <kbd className="inline-flex items-center justify-center min-w-[1.5rem] h-6 px-1.5 rounded border border-border bg-muted text-[11px] font-mono text-foreground">
                            {k}
                          </kbd>
                        </React.Fragment>
                      ))}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
