import React, {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import { cn } from '@/lib/utils';

/**
 * SlideStage — single source of truth for slide scaling.
 *
 * Renders children at a fixed 1920×1080 internal coordinate system and
 * scales them to fit the parent container while preserving aspect ratio.
 *
 * Modes:
 *  - edit:    fills parent, scales around the center, applies optional `zoom`
 *             multiplier, draws shadow/rounded chrome (used in the editor canvas).
 *  - thumb:   sizes itself to the rendered dimensions, scales from top-left
 *             (used inside flex layouts like the sidebar / overview grid).
 *  - present: fills parent, scales around the center, no zoom, no chrome
 *             (used in fullscreen presentation, presenter view, audience window).
 *
 * `interactive` toggles pointer events on the slide content. Defaults to
 * true for `edit`, false for `thumb` and `present`.
 */

export const SLIDE_WIDTH = 1920;
export const SLIDE_HEIGHT = 1080;
export const SLIDE_ASPECT_RATIO = SLIDE_WIDTH / SLIDE_HEIGHT;

export const SlideScaleContext = createContext<number>(1);
export function useSlideScale() {
  return useContext(SlideScaleContext);
}

export type SlideStageMode = 'edit' | 'thumb' | 'present';

export interface SlideStageProps {
  children: React.ReactNode;
  mode: SlideStageMode;
  /** Zoom multiplier in percent (100 = fit). Only applied in `edit` mode. */
  zoom?: number;
  /** Override pointer-events on the slide content. */
  interactive?: boolean;
  /** Extra classes on the inner 1920×1080 slide element. */
  className?: string;
  /** Extra classes on the outer wrapper. */
  wrapperClassName?: string;
  onClick?: (e: React.MouseEvent<HTMLDivElement>) => void;
}

export function SlideStage({
  children,
  mode,
  zoom = 100,
  interactive,
  className,
  wrapperClassName,
  onClick,
}: SlideStageProps) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [fitScale, setFitScale] = useState(0);
  const [renderedSize, setRenderedSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const measure = () => {
      const el = wrapperRef.current;
      if (!el) return;

      // `thumb` participates in flex layouts: measure parent so we can
      // size ourselves to the rendered dimensions. Other modes fill parent.
      const target = mode === 'thumb' ? el.parentElement : el;
      if (!target) return;

      const w = target.clientWidth;
      const h = target.clientHeight;
      if (w === 0 || h === 0) return;

      const scale = Math.min(w / SLIDE_WIDTH, h / SLIDE_HEIGHT);
      setFitScale(scale);
      setRenderedSize({
        width: SLIDE_WIDTH * scale,
        height: SLIDE_HEIGHT * scale,
      });
    };

    const rafId = requestAnimationFrame(measure);
    const observer = new ResizeObserver(() => {
      requestAnimationFrame(measure);
    });

    const target =
      mode === 'thumb'
        ? wrapperRef.current?.parentElement
        : wrapperRef.current;
    if (target) observer.observe(target);

    return () => {
      cancelAnimationFrame(rafId);
      observer.disconnect();
    };
  }, [mode]);

  const zoomMultiplier = mode === 'edit' ? zoom / 100 : 1;
  const finalScale = fitScale * zoomMultiplier;

  const isThumb = mode === 'thumb';
  const allowInteraction =
    interactive ?? (mode === 'edit');

  // Wrapper styling differs by mode.
  const wrapperStyle: React.CSSProperties = isThumb
    ? {
        width: renderedSize.width || '100%',
        height: renderedSize.height || 'auto',
      }
    : { width: '100%', height: '100%' };

  // Inner slide positioning differs by mode.
  const slideStyle: React.CSSProperties = isThumb
    ? {
        width: SLIDE_WIDTH,
        height: SLIDE_HEIGHT,
        transform: `scale(${finalScale})`,
        transformOrigin: 'top left',
        position: 'absolute',
        top: 0,
        left: 0,
      }
    : {
        width: SLIDE_WIDTH,
        height: SLIDE_HEIGHT,
        transform: `translate(-50%, -50%) scale(${finalScale})`,
        transformOrigin: 'center center',
        position: 'absolute',
        top: '50%',
        left: '50%',
      };

  const slideChrome =
    mode === 'edit'
      ? 'slide-canvas shadow-2xl rounded-lg isolate'
      : mode === 'thumb'
      ? ''
      : '';

  return (
    <SlideScaleContext.Provider value={finalScale}>
      <div
        ref={wrapperRef}
        className={cn('relative overflow-hidden', wrapperClassName)}
        style={wrapperStyle}
      >
        <div
          className={cn(
            'overflow-hidden flex-shrink-0',
            slideChrome,
            !allowInteraction && 'pointer-events-none',
            className,
          )}
          style={slideStyle}
          onClick={onClick}
        >
          {children}
        </div>
      </div>
    </SlideScaleContext.Provider>
  );
}
