/**
 * SelectionLayer — selection + drag-to-move + resize overlay (Phase 3C–3E).
 *
 * Lives inside the same 1920×1080 coordinate space as `DataSlideRenderer`,
 * as a separate sibling layer. Responsibilities:
 *   - capture clicks on element bounding boxes → `selectElement`
 *   - capture clicks on empty slide space      → `clearSelection`
 *   - draw a selection outline on selected elements
 *   - drag to move all currently-selected elements together
 *   - resize a single selected element via 4 corner handles
 *   - keyboard nudging (1 / 10 units) for the current selection
 *
 * It only mutates element x/y (move + resize) and width/height (resize).
 * No rotation, no text edit. `ElementRenderer` uses `pointer-events: none`,
 * so we mirror each element's bounding box here as a transparent hit
 * target with `pointer-events: auto`. Lines are skipped — they'll get
 * hit-testing/move/resize support in a later phase.
 *
 * Coordinate conversion:
 *   The slide is rendered through `SlideStage`, which applies a CSS scale
 *   to fit a 1920×1080 surface inside the visible canvas. We read that
 *   scale via `useSlideScale()` and divide pointer deltas (screen pixels)
 *   by it to get canvas-space deltas. Example: at scale 0.5, 100 screen
 *   px → 200 slide-coord px.
 *
 * State updates:
 *   We do NOT call `updateElement` on every `mousemove`. Instead we cache
 *   the latest pointer event in a ref and flush a single batched update
 *   per animation frame via `requestAnimationFrame`. Drag-start / resize-
 *   start snapshots are held in refs so we never read stale values from
 *   the store mid-gesture.
 */
import React, { useEffect, useRef } from 'react';
import type { ID, Slide, SlideElement } from '@/editor/model/types';
import {
  useSelectedElementIds,
  useDeckActions,
  useDeckStore,
  useEditingTextId,
} from '@/editor/state/deckStore';
import { useSlideScale } from '@/slides/runtime/SlideStage';

interface SelectionLayerProps {
  slide: Slide;
}

interface DragState {
  pointerId: number;
  startX: number; // screen px
  startY: number; // screen px
  // Snapshot of starting positions for every element being dragged.
  // Keyed by element id, in slide coordinates.
  origin: Map<ID, { x: number; y: number }>;
  movedThisFrame: boolean;
  rafId: number | null;
  // Latest pointer position cached between frames.
  lastClientX: number;
  lastClientY: number;
  // Set true on first move past a tiny threshold.
  moved: boolean;
}

const DRAG_THRESHOLD_PX = 2;
const MIN_SIZE = 20;

type Corner = 'tl' | 'tr' | 'bl' | 'br';

interface ResizeState {
  pointerId: number;
  elementId: ID;
  corner: Corner;
  startClientX: number;
  startClientY: number;
  origin: { x: number; y: number; w: number; h: number };
  rafId: number | null;
  lastClientX: number;
  lastClientY: number;
}

export function SelectionLayer({ slide }: SelectionLayerProps) {
  const selectedIds = useSelectedElementIds();
  const {
    selectElement,
    clearSelection,
    updateElement,
    setEditingText,
    beginHistory,
    endHistory,
  } = useDeckActions();
  const editingTextId = useEditingTextId();
  const scale = useSlideScale();

  // Refs that need to read current values without re-binding handlers.
  const scaleRef = useRef(scale);
  scaleRef.current = scale;
  const slideIdRef = useRef(slide.id);
  slideIdRef.current = slide.id;

  const dragRef = useRef<DragState | null>(null);
  const resizeRef = useRef<ResizeState | null>(null);

  // Cancel any in-flight rAF on unmount or slide change.
  useEffect(() => {
    return () => {
      if (dragRef.current?.rafId != null) {
        cancelAnimationFrame(dragRef.current.rafId);
      }
      if (resizeRef.current?.rafId != null) {
        cancelAnimationFrame(resizeRef.current.rafId);
      }
      dragRef.current = null;
      resizeRef.current = null;
    };
  }, [slide.id]);

  // ── Keyboard nudging ──────────────────────────────────────────────────
  // Window-level listener, but mounted only while this component is in the
  // tree. Since SelectionLayer only renders inside the dev mock-deck route
  // (via EditorSlide → MockDeckPreview), the shortcut cannot leak into the
  // legacy showcase app. Arrow = 1 unit, Shift+Arrow = 10 units. We read
  // the freshest selection + slide directly from the store so the handler
  // never closes over stale values.
  useEffect(() => {
    const isEditableTarget = (t: EventTarget | null) => {
      if (!(t instanceof HTMLElement)) return false;
      const tag = t.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true;
      if (t.isContentEditable) return true;
      return false;
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (isEditableTarget(e.target)) return;
      // Belt-and-suspenders: even if focus has slipped, never nudge while
      // an inline text editor is active.
      if (useDeckStore.getState().editingTextId != null) return;

      // Delete / Backspace → remove selected elements (skips locked ones,
      // handled inside the store action). Only when not editing text.
      if (e.key === 'Delete' || e.key === 'Backspace') {
        const ids = useDeckStore.getState().selectedElementIds;
        if (ids.length === 0) return;
        e.preventDefault();
        useDeckStore.getState().deleteSelectedElements();
        return;
      }

      let dx = 0;
      let dy = 0;
      switch (e.key) {
        case 'ArrowLeft':  dx = -1; break;
        case 'ArrowRight': dx =  1; break;
        case 'ArrowUp':    dy = -1; break;
        case 'ArrowDown':  dy =  1; break;
        default: return;
      }

      const state = useDeckStore.getState();
      const ids = state.selectedElementIds;
      if (ids.length === 0) return;

      const sId = slideIdRef.current;
      const sl = state.currentDeck?.slides.find((x) => x.id === sId);
      if (!sl) return;

      const step = e.shiftKey ? 10 : 1;
      e.preventDefault(); // block page scroll

      for (const id of ids) {
        const el = sl.elements.find((x) => x.id === id);
        if (!el) continue;
        if (el.locked || el.hidden) continue;
        if (el.type === 'line') continue; // matches drag policy
        updateElement(sId, id, {
          x: el.x + dx * step,
          y: el.y + dy * step,
        });
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [updateElement]);


  const flushDrag = () => {
    const drag = dragRef.current;
    if (!drag) return;
    drag.rafId = null;

    const dxScreen = drag.lastClientX - drag.startX;
    const dyScreen = drag.lastClientY - drag.startY;
    const s = scaleRef.current || 1;
    const dx = dxScreen / s;
    const dy = dyScreen / s;

    if (!drag.moved) {
      if (Math.hypot(dxScreen, dyScreen) < DRAG_THRESHOLD_PX) return;
      drag.moved = true;
    }

    drag.origin.forEach((orig, id) => {
      updateElement(slideIdRef.current, id, {
        x: Math.round(orig.x + dx),
        y: Math.round(orig.y + dy),
      });
    });
  };

  const onPointerMove = (e: PointerEvent) => {
    const drag = dragRef.current;
    if (!drag || e.pointerId !== drag.pointerId) return;
    drag.lastClientX = e.clientX;
    drag.lastClientY = e.clientY;
    if (drag.rafId == null) {
      drag.rafId = requestAnimationFrame(flushDrag);
    }
  };

  const endDrag = (e: PointerEvent) => {
    const drag = dragRef.current;
    if (!drag || e.pointerId !== drag.pointerId) return;
    if (drag.rafId != null) {
      cancelAnimationFrame(drag.rafId);
      // Final flush so the resting position is exact.
      flushDrag();
    }
    window.removeEventListener('pointermove', onPointerMove);
    window.removeEventListener('pointerup', endDrag);
    window.removeEventListener('pointercancel', endDrag);
    dragRef.current = null;
  };

  const beginDrag = (
    pointerId: number,
    clientX: number,
    clientY: number,
    targetIds: ID[],
  ) => {
    // Read the freshest deck snapshot directly from the store so we don't
    // rely on a render having happened after the selection change.
    const deck = useDeckStore.getState().currentDeck;
    if (!deck) return;
    const sl = deck.slides.find((x) => x.id === slideIdRef.current);
    if (!sl) return;

    const origin = new Map<ID, { x: number; y: number }>();
    for (const id of targetIds) {
      const el = sl.elements.find((e) => e.id === id);
      if (!el) continue;
      if (el.locked || el.hidden) continue;
      if (el.type === 'line') continue; // lines unsupported for drag yet
      origin.set(id, { x: el.x, y: el.y });
    }
    if (origin.size === 0) return;

    dragRef.current = {
      pointerId,
      startX: clientX,
      startY: clientY,
      lastClientX: clientX,
      lastClientY: clientY,
      origin,
      movedThisFrame: false,
      rafId: null,
      moved: false,
    };
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', endDrag);
    window.addEventListener('pointercancel', endDrag);
  };

  // ── Resize ────────────────────────────────────────────────────────────
  // Per-corner math, given origin (x0,y0,w0,h0) and slide-coord deltas
  // (dx, dy):
  //   br: right = x0+w0+dx, bottom = y0+h0+dy → newW=right-x0, newH=bottom-y0
  //   bl: left  = x0+dx,    bottom = y0+h0+dy → newW=(x0+w0)-left, newH=bottom-y0,
  //                                              newX = (x0+w0) - newW
  //   tr: right = x0+w0+dx, top    = y0+dy    → newW=right-x0,  newH=(y0+h0)-top,
  //                                              newY = (y0+h0) - newH
  //   tl: left  = x0+dx,    top    = y0+dy    → newW=(x0+w0)-left, newH=(y0+h0)-top,
  //                                              newX = (x0+w0)-newW, newY = (y0+h0)-newH
  // After clamping width/height to >= MIN_SIZE we recompute x/y from the
  // fixed (non-moving) edge so the element doesn't drift past its anchor.

  const flushResize = () => {
    const r = resizeRef.current;
    if (!r) return;
    r.rafId = null;

    const s = scaleRef.current || 1;
    const dx = (r.lastClientX - r.startClientX) / s;
    const dy = (r.lastClientY - r.startClientY) / s;
    const { x: x0, y: y0, w: w0, h: h0 } = r.origin;
    const right0 = x0 + w0;
    const bottom0 = y0 + h0;

    let newX = x0;
    let newY = y0;
    let newW = w0;
    let newH = h0;

    switch (r.corner) {
      case 'br': {
        newW = Math.max(MIN_SIZE, w0 + dx);
        newH = Math.max(MIN_SIZE, h0 + dy);
        break;
      }
      case 'bl': {
        newW = Math.max(MIN_SIZE, w0 - dx);
        newH = Math.max(MIN_SIZE, h0 + dy);
        newX = right0 - newW;
        break;
      }
      case 'tr': {
        newW = Math.max(MIN_SIZE, w0 + dx);
        newH = Math.max(MIN_SIZE, h0 - dy);
        newY = bottom0 - newH;
        break;
      }
      case 'tl': {
        newW = Math.max(MIN_SIZE, w0 - dx);
        newH = Math.max(MIN_SIZE, h0 - dy);
        newX = right0 - newW;
        newY = bottom0 - newH;
        break;
      }
    }

    updateElement(slideIdRef.current, r.elementId, {
      x: Math.round(newX),
      y: Math.round(newY),
      width: Math.round(newW),
      height: Math.round(newH),
    });
  };

  const onResizePointerMove = (e: PointerEvent) => {
    const r = resizeRef.current;
    if (!r || e.pointerId !== r.pointerId) return;
    r.lastClientX = e.clientX;
    r.lastClientY = e.clientY;
    if (r.rafId == null) r.rafId = requestAnimationFrame(flushResize);
  };

  const endResize = (e: PointerEvent) => {
    const r = resizeRef.current;
    if (!r || e.pointerId !== r.pointerId) return;
    if (r.rafId != null) {
      cancelAnimationFrame(r.rafId);
      flushResize();
    }
    window.removeEventListener('pointermove', onResizePointerMove);
    window.removeEventListener('pointerup', endResize);
    window.removeEventListener('pointercancel', endResize);
    resizeRef.current = null;
  };

  const beginResize = (
    pointerId: number,
    clientX: number,
    clientY: number,
    elementId: ID,
    corner: Corner,
  ) => {
    const deck = useDeckStore.getState().currentDeck;
    if (!deck) return;
    const sl = deck.slides.find((x) => x.id === slideIdRef.current);
    if (!sl) return;
    const el = sl.elements.find((e) => e.id === elementId);
    if (!el) return;
    if (el.locked || el.hidden) return;
    if (el.type === 'line') return;

    resizeRef.current = {
      pointerId,
      elementId,
      corner,
      startClientX: clientX,
      startClientY: clientY,
      lastClientX: clientX,
      lastClientY: clientY,
      origin: { x: el.x, y: el.y, w: el.width, h: el.height },
      rafId: null,
    };
    window.addEventListener('pointermove', onResizePointerMove);
    window.addEventListener('pointerup', endResize);
    window.addEventListener('pointercancel', endResize);
  };

  const onBackgroundPointerDown = (e: React.PointerEvent) => {
    if (e.target !== e.currentTarget) return;
    // Clicking outside also exits inline text-edit mode.
    if (editingTextId != null) setEditingText(null);
    clearSelection();
  };

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        zIndex: 1_000_000,
      }}
      onPointerDown={onBackgroundPointerDown}
    >
      {slide.elements.map((el) => {
        if (el.hidden || el.type === 'line') return null;
        const isSelected = selectedIds.includes(el.id);

        // While this text element is being inline-edited, replace its hit
        // target with the textarea overlay. This disables drag/resize for
        // it and gives the editor full pointer/keyboard focus.
        if (el.type === 'text' && editingTextId === el.id) {
          return (
            <TextEditOverlay
              key={el.id}
              element={el}
              onChange={(text) =>
                updateElement(slideIdRef.current, el.id, { text })
              }
              onExit={() => setEditingText(null)}
            />
          );
        }

        return (
          <ElementHit
            key={el.id}
            element={el}
            selected={isSelected}
            locked={!!el.locked}
            onDoubleClick={
              el.type === 'text' && !el.locked
                ? () => {
                    selectElement(el.id);
                    setEditingText(el.id);
                  }
                : undefined
            }
            onPointerDown={(e) => {
              e.stopPropagation();
              // Prevent native image/text drag.
              e.preventDefault();

              // Any pointerdown elsewhere exits inline text edit.
              if (editingTextId != null && editingTextId !== el.id) {
                setEditingText(null);
              }

              const additive = e.shiftKey;

              // Compute the post-click selection so the drag operates on
              // the correct id set (without waiting for a rerender).
              let nextSelection: ID[];
              if (additive) {
                if (selectedIds.includes(el.id)) {
                  nextSelection = selectedIds.filter((id) => id !== el.id);
                } else {
                  nextSelection = [...selectedIds, el.id];
                }
                selectElement(el.id, { additive: true });
                // Shift-toggle: do not start a drag.
                return;
              }

              if (selectedIds.includes(el.id)) {
                // Already selected → drag the whole selection.
                nextSelection = selectedIds;
              } else {
                // Replace selection with just this element, then drag it.
                nextSelection = [el.id];
                selectElement(el.id);
              }

              if (el.locked) return;
              beginDrag(e.pointerId, e.clientX, e.clientY, nextSelection);
            }}
          />
        );
      })}

      {/* Resize handles: only when exactly one resizable element is selected
          and we're not in inline text-edit mode. */}
      {(() => {
        if (selectedIds.length !== 1) return null;
        if (editingTextId != null) return null;
        const el = slide.elements.find((e) => e.id === selectedIds[0]);
        if (!el) return null;
        if (el.hidden || el.locked) return null;
        if (el.hidden || el.locked) return null;
        if (el.type === 'line') return null;
        return (
          <ResizeHandles
            element={el}
            scale={scale}
            onCornerPointerDown={(corner, e) => {
              e.stopPropagation();
              e.preventDefault();
              beginResize(e.pointerId, e.clientX, e.clientY, el.id, corner);
            }}
          />
        );
      })()}
    </div>
  );
}

interface ElementHitProps {
  element: Exclude<SlideElement, { type: 'line' }>;
  selected: boolean;
  locked: boolean;
  onPointerDown: (e: React.PointerEvent<HTMLDivElement>) => void;
  onDoubleClick?: () => void;
}

function ElementHit({ element, selected, locked, onPointerDown, onDoubleClick }: ElementHitProps) {
  return (
    <div
      data-element-id={element.id}
      data-selected={selected || undefined}
      data-locked={locked || undefined}
      onPointerDown={onPointerDown}
      onDoubleClick={onDoubleClick}
      // Suppress the browser's native drag-image for nested <img> targets.
      onDragStart={(e) => e.preventDefault()}
      draggable={false}
      style={{
        position: 'absolute',
        left: element.x,
        top: element.y,
        width: element.width,
        height: element.height,
        transform: element.rotation
          ? `rotate(${element.rotation}deg)`
          : undefined,
        transformOrigin: 'center center',
        pointerEvents: 'auto',
        cursor: locked ? 'not-allowed' : selected ? 'move' : 'pointer',
        outline: selected ? '2px solid hsl(217 91% 60%)' : 'none',
        outlineOffset: selected ? '2px' : 0,
        background: 'transparent',
        userSelect: 'none',
        touchAction: 'none',
      }}
    />
  );
}

// ──────────────────────────────────────────────────────────────────────────
// Resize handles
//
// Rendered in slide coordinates so they sit at the four corners of the
// element's bounding box. Visual size is divided by the current SlideStage
// scale so handles stay a constant ~10px on screen regardless of zoom.
// ──────────────────────────────────────────────────────────────────────────

interface ResizeHandlesProps {
  element: Exclude<SlideElement, { type: 'line' }>;
  scale: number;
  onCornerPointerDown: (corner: Corner, e: React.PointerEvent<HTMLDivElement>) => void;
}

function ResizeHandles({ element, scale, onCornerPointerDown }: ResizeHandlesProps) {
  const handlePx = 10; // on-screen size
  const s = Math.max(scale, 0.0001);
  const sizeSlide = handlePx / s; // size in slide coordinates
  const half = sizeSlide / 2;

  const corners: Array<{ corner: Corner; cx: number; cy: number; cursor: string }> = [
    { corner: 'tl', cx: element.x,                     cy: element.y,                      cursor: 'nwse-resize' },
    { corner: 'tr', cx: element.x + element.width,     cy: element.y,                      cursor: 'nesw-resize' },
    { corner: 'bl', cx: element.x,                     cy: element.y + element.height,     cursor: 'nesw-resize' },
    { corner: 'br', cx: element.x + element.width,     cy: element.y + element.height,     cursor: 'nwse-resize' },
  ];

  return (
    <>
      {corners.map(({ corner, cx, cy, cursor }) => (
        <div
          key={corner}
          data-resize-handle={corner}
          onPointerDown={(e) => onCornerPointerDown(corner, e)}
          onDragStart={(e) => e.preventDefault()}
          draggable={false}
          style={{
            position: 'absolute',
            left: cx - half,
            top: cy - half,
            width: sizeSlide,
            height: sizeSlide,
            background: 'white',
            border: `${1 / s}px solid hsl(217 91% 60%)`,
            borderRadius: 2 / s,
            pointerEvents: 'auto',
            cursor,
            touchAction: 'none',
            userSelect: 'none',
            zIndex: 1,
          }}
        />
      ))}
    </>
  );
}

// ──────────────────────────────────────────────────────────────────────────
// Inline text editing
//
// A textarea positioned in slide coordinates over the text element. Styles
// mirror the rendered text (font family/size/weight/color/align/line-height)
// so the caret aligns with what the renderer draws underneath. Updates are
// committed to TextElement.text on every change. Exit on Escape, blur, or
// pointerdown elsewhere (handled by SelectionLayer's background handler).
// Note: keyboard nudging is suppressed both by the standard editable-target
// guard (TEXTAREA) and an explicit `editingTextId != null` short-circuit.
// ──────────────────────────────────────────────────────────────────────────

interface TextEditOverlayProps {
  element: import('@/editor/model/types').TextElement;
  onChange: (text: string) => void;
  onExit: () => void;
}

function TextEditOverlay({ element, onChange, onExit }: TextEditOverlayProps) {
  const ref = React.useRef<HTMLTextAreaElement>(null);
  React.useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.focus();
    // Place caret at the end on entry.
    const len = el.value.length;
    el.setSelectionRange(len, len);
  }, []);

  const ts = element.textStyle ?? {};

  return (
    <textarea
      ref={ref}
      value={element.text}
      onChange={(e) => onChange(e.target.value)}
      onKeyDown={(e) => {
        if (e.key === 'Escape') {
          e.preventDefault();
          e.stopPropagation();
          onExit();
        }
        // Stop arrows / Backspace / Delete from bubbling up to the
        // SelectionLayer's window-level handler.
        e.stopPropagation();
      }}
      onPointerDown={(e) => e.stopPropagation()}
      onBlur={onExit}
      spellCheck={false}
      style={{
        position: 'absolute',
        left: element.x,
        top: element.y,
        width: element.width,
        height: element.height,
        transform: element.rotation
          ? `rotate(${element.rotation}deg)`
          : undefined,
        transformOrigin: 'center center',
        pointerEvents: 'auto',
        // Match the rendered text styling so the caret aligns with the
        // underlying preview while typing.
        fontFamily: ts.fontFamily,
        fontSize: ts.fontSize,
        fontWeight: ts.fontWeight,
        fontStyle: ts.italic ? 'italic' : undefined,
        color: ts.color,
        lineHeight: ts.lineHeight,
        letterSpacing: ts.letterSpacing,
        textAlign: ts.align,
        whiteSpace: 'pre-wrap',
        wordBreak: 'break-word',
        // Editor chrome: keep selection indication, kill native textarea
        // chrome so it overlays the rendered text cleanly.
        background: 'transparent',
        border: 'none',
        outline: '2px dashed hsl(217 91% 60%)',
        outlineOffset: '2px',
        padding: 0,
        margin: 0,
        resize: 'none',
        overflow: 'hidden',
        boxSizing: 'border-box',
      }}
    />
  );
}
