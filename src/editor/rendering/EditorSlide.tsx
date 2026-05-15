/**
 * EditorSlide — composes the read-only renderer with the selection layer.
 *
 * Lives in the editor namespace so `DataSlideRenderer` stays a pure
 * preview component (no store imports). Used by the dev mock-deck route;
 * not wired into the legacy showcase app.
 */
import React from 'react';
import type { Slide } from '@/editor/model/types';
import { DataSlideRenderer } from './DataSlideRenderer';
import { SelectionLayer } from './SelectionLayer';

interface EditorSlideProps {
  slide: Slide;
}

export function EditorSlide({ slide }: EditorSlideProps) {
  return (
    <div className="relative w-full h-full">
      <DataSlideRenderer slide={slide} />
      <SelectionLayer slide={slide} />
    </div>
  );
}
