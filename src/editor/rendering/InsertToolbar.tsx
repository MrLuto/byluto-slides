/**
 * InsertToolbar — Phase 3H.
 *
 * Dev-only insert actions for the mock editor. Buttons construct new
 * elements via the existing factory functions in `model/defaults.ts` and
 * hand them to `addElement`, which:
 *   - assigns a fresh z-index = max(existing z) + 1 (so the new element
 *     renders above everything currently on the slide),
 *   - appends to the current slide,
 *   - and selects the new element so it's immediately interactive.
 *
 * Delete uses the store's `deleteSelectedElements` which respects the
 * `locked` flag and clears text-edit mode. Mounted only inside
 * `MockDeckPreview`, so it cannot leak into the legacy showcase app.
 */
import React from 'react';
import {
  createTextElement,
  createShapeElement,
  createImageElement,
} from '@/editor/model/defaults';
import {
  useCurrentSlideId,
  useDeckActions,
  useSelectedElementIds,
} from '@/editor/state/deckStore';

// Inline SVG placeholder so new "image" elements render without network IO.
const PLACEHOLDER_IMAGE_SRC =
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 600">
      <rect width="800" height="600" fill="#E2E8F0"/>
      <path d="M0 0l800 600M800 0L0 600" stroke="#94A3B8" stroke-width="2"/>
      <text x="400" y="310" font-family="IBM Plex Sans, sans-serif" font-size="48"
        fill="#475569" text-anchor="middle">Image</text>
    </svg>`,
  );

export function InsertToolbar() {
  const slideId = useCurrentSlideId();
  const selected = useSelectedElementIds();
  const { addElement, deleteSelectedElements } = useDeckActions();

  if (!slideId) return null;

  const insertText = () =>
    addElement(slideId, createTextElement({ text: 'New text' }));
  const insertRect = () =>
    addElement(slideId, createShapeElement({ shape: 'rectangle' }));
  const insertCircle = () =>
    addElement(
      slideId,
      createShapeElement({ shape: 'ellipse', width: 320, height: 320 }),
    );
  const insertImage = () =>
    addElement(
      slideId,
      createImageElement({ src: PLACEHOLDER_IMAGE_SRC, fit: 'cover' }),
    );

  const btn =
    'px-3 py-1 rounded border border-border text-sm hover:bg-accent disabled:opacity-40';

  return (
    <div className="flex items-center gap-2 p-2 border-b border-border bg-background">
      <span className="text-xs font-mono text-muted-foreground mr-1">
        Insert
      </span>
      <button className={btn} onClick={insertText}>Text</button>
      <button className={btn} onClick={insertRect}>Rectangle</button>
      <button className={btn} onClick={insertCircle}>Circle</button>
      <button className={btn} onClick={insertImage}>Image</button>
      <span className="mx-2 h-4 w-px bg-border" />
      <button
        className={btn}
        onClick={deleteSelectedElements}
        disabled={selected.length === 0}
      >
        Delete selected
      </button>
    </div>
  );
}
