/**
 * Compatibility shim. The real implementation now lives in
 * `src/slides/runtime/SlideStage.tsx`. These exports are preserved so existing
 * imports keep working until callers migrate.
 */
import React from 'react';
import {
  SlideStage,
  SLIDE_WIDTH,
  SLIDE_HEIGHT,
  SLIDE_ASPECT_RATIO,
  SlideScaleContext,
  useSlideScale,
} from '@/slides/runtime/SlideStage';

export { SLIDE_WIDTH, SLIDE_HEIGHT, SLIDE_ASPECT_RATIO, SlideScaleContext, useSlideScale };

interface ScaledSlideProps {
  children?: React.ReactNode;
  SlideComponent?: React.ComponentType<any>;
  className?: string;
  containerClassName?: string;
  showGrid?: boolean;
  onClick?: (e: React.MouseEvent<HTMLDivElement>) => void;
}

/** @deprecated Use <SlideStage mode="present"> (or "thumb" inside flex layouts). */
export function ScaledSlide({
  children,
  SlideComponent,
  className,
  containerClassName,
  showGrid = false,
  onClick,
}: ScaledSlideProps) {
  const content = SlideComponent ? <SlideComponent /> : children;
  return (
    <SlideStage
      mode="present"
      wrapperClassName={containerClassName}
      className={[showGrid ? 'grid-overlay' : '', className ?? ''].join(' ').trim()}
      onClick={onClick}
    >
      {content}
    </SlideStage>
  );
}

/** @deprecated Use <SlideStage mode="edit" zoom={zoom}>. */
export function CenteredScaledSlide({
  children,
  SlideComponent,
  className,
  containerClassName,
  showGrid = false,
  onClick,
  zoom = 100,
}: ScaledSlideProps & { zoom?: number }) {
  const content = SlideComponent ? <SlideComponent /> : children;
  return (
    <SlideStage
      mode="edit"
      zoom={zoom}
      wrapperClassName={containerClassName}
      className={[showGrid ? 'grid-overlay' : '', className ?? ''].join(' ').trim()}
      onClick={onClick}
    >
      {content}
    </SlideStage>
  );
}
