/**
 * SelectionLayer — read-only selection overlay (Phase 3B).
 *
 * Lives inside the same 1920×1080 coordinate space as `DataSlideRenderer`,
 * but is a separate sibling layer. Its job is purely:
 *   - capture clicks on element bounding boxes → `selectElement`
 *   - capture clicks on empty slide space      → `clearSelection`
 *   - draw a selection outline on selected elements
 *
 * It does NOT mutate elements (no drag, no resize, no text edit). The
 * renderer (`ElementRenderer`) uses `pointer-events: none`, so we mirror
 * each element's bounding box here as a transparent hit target with
 * `pointer-events: auto`. Lines are skipped for now (their bbox can be
 * degenerate) — they'll get hit-testing in the drag/resize phase.
 */
import React from 'react';
import type { Slide, SlideElement } from '@/editor/model/types';
import {
  useSelectedElementIds,
  useDeckActions,
} from '@/editor/state/deckStore';

interface SelectionLayerProps {
  slide: Slide;
}

export function SelectionLayer({ slide }: SelectionLayerProps) {
  const selectedIds = useSelectedElementIds();
  const { selectElement, clearSelection } = useDeckActions();

  const onBackgroundClick = (e: React.MouseEvent) => {
    // Only clear when the click landed on the background itself, not on
    // an element hit-target that bubbled up.
    if (e.target === e.currentTarget) {
      clearSelection();
    }
  };

  return (
    <div
      // Full slide area; catches "empty space" clicks.
      style={{
        position: 'absolute',
        inset: 0,
        zIndex: 1_000_000, // above all rendered elements
      }}
      onMouseDown={onBackgroundClick}
    >
      {slide.elements.map((el) => {
        if (el.hidden || el.type === 'line') return null;
        const isSelected = selectedIds.includes(el.id);
        return (
          <ElementHit
            key={el.id}
            element={el}
            selected={isSelected}
            onSelect={(additive) =>
              selectElement(el.id, additive ? { additive: true } : undefined)
            }
          />
        );
      })}
    </div>
  );
}

interface ElementHitProps {
  element: Exclude<SlideElement, { type: 'line' }>;
  selected: boolean;
  onSelect: (additive: boolean) => void;
}

function ElementHit({ element, selected, onSelect }: ElementHitProps) {
  return (
    <div
      data-element-id={element.id}
      data-selected={selected || undefined}
      onMouseDown={(e) => {
        // Stop background from clearing selection.
        e.stopPropagation();
        onSelect(e.shiftKey);
      }}
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
        cursor: 'pointer',
        // Selection outline. Uses outline (not border) so it doesn't
        // affect hit-box dimensions or layout.
        outline: selected ? '2px solid hsl(217 91% 60%)' : 'none',
        outlineOffset: selected ? '2px' : 0,
        background: 'transparent',
      }}
    />
  );
}
