import React, { useRef, useEffect, useState, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { ChevronLeft, ChevronRight, ZoomIn, ZoomOut, Maximize } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { FloatingMenu } from './FloatingMenu';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { SlideStage, useSlideScale } from '@/slides/runtime/SlideStage';

// Re-export for backwards compatibility
export { useSlideScale };

interface SlideCanvasProps {
  children: React.ReactNode;
  showGrid?: boolean;
  zoom?: number;
  onZoomChange?: (zoom: number) => void;
  className?: string;
  onClick?: (e: React.MouseEvent<HTMLDivElement>) => void;
  currentSlide?: number;
  totalSlides?: number;
  onPrevSlide?: () => void;
  onNextSlide?: () => void;
  onStartPresentation?: () => void;
  onStartPresenterView?: () => void;
  isDarkMode?: boolean;
  onToggleDarkMode?: () => void;
}

const ZOOM_LEVELS = [50, 75, 100, 125, 150];
const HIDE_DELAY = 500; // 0.5 seconds

export function SlideCanvas({
  children,
  showGrid = false,
  zoom = 100,
  onZoomChange,
  className,
  onClick,
  currentSlide,
  totalSlides,
  onPrevSlide,
  onNextSlide,
  onStartPresentation,
  onStartPresenterView,
  isDarkMode = false,
  onToggleDarkMode,
}: SlideCanvasProps) {
  // Shared visibility state for both controls
  const [showControls, setShowControls] = useState(false);
  const [isHoveringZoomPill, setIsHoveringZoomPill] = useState(false);
  const [isHoveringNavPill, setIsHoveringNavPill] = useState(false);
  const hideTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isHoveringAnyPillRef = useRef(false);

  // Keep ref in sync with state
  useEffect(() => {
    isHoveringAnyPillRef.current = isHoveringZoomPill || isHoveringNavPill;
  }, [isHoveringZoomPill, isHoveringNavPill]);

  const clearHideTimeout = useCallback(() => {
    if (hideTimeoutRef.current) {
      clearTimeout(hideTimeoutRef.current);
      hideTimeoutRef.current = null;
    }
  }, []);

  const startHideTimeout = useCallback(() => {
    clearHideTimeout();
    hideTimeoutRef.current = setTimeout(() => {
      if (!isHoveringAnyPillRef.current) {
        setShowControls(false);
      }
    }, HIDE_DELAY);
  }, [clearHideTimeout]);

  const handleMouseMove = useCallback(() => {
    setShowControls(true);
    startHideTimeout();
  }, [startHideTimeout]);

  const handleMouseLeave = useCallback(() => {
    if (!isHoveringAnyPillRef.current) {
      clearHideTimeout();
      setShowControls(false);
    }
  }, [clearHideTimeout]);

  useEffect(() => {
    return () => clearHideTimeout();
  }, [clearHideTimeout]);

  useEffect(() => {
    if (isHoveringZoomPill || isHoveringNavPill) {
      clearHideTimeout();
      setShowControls(true);
    } else if (showControls) {
      startHideTimeout();
    }
  }, [isHoveringZoomPill, isHoveringNavPill, clearHideTimeout, startHideTimeout, showControls]);

  useEffect(() => {
    if (currentSlide !== undefined) {
      setShowControls(true);
      startHideTimeout();
    }
  }, [currentSlide, startHideTimeout]);

  const showNavigation = currentSlide !== undefined && totalSlides !== undefined;

  return (
    <div
      className="relative flex flex-col h-full w-full bg-[hsl(var(--canvas-bg))]"
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      {/* Zoom controls - fixed position top right */}
      {onZoomChange && (
        <TooltipProvider>
          <div
            className={cn(
              'absolute top-3 right-3 flex items-center gap-0.5 px-1.5 py-0.5 bg-card/90 backdrop-blur-sm border border-border rounded-full shadow-md z-20 transition-opacity duration-300 ease-in-out',
              showControls ? 'opacity-100' : 'opacity-0 pointer-events-none',
            )}
            onMouseEnter={() => setIsHoveringZoomPill(true)}
            onMouseLeave={() => setIsHoveringZoomPill(false)}
          >
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-5 w-5 rounded-full"
                  onClick={(e) => {
                    e.stopPropagation();
                    const currentIndex = ZOOM_LEVELS.indexOf(zoom);
                    if (currentIndex > 0) onZoomChange(ZOOM_LEVELS[currentIndex - 1]);
                  }}
                  disabled={zoom === ZOOM_LEVELS[0]}
                >
                  <ZoomOut className="h-3 w-3" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Zoom Out</TooltipContent>
            </Tooltip>

            <span className="text-[10px] font-mono min-w-[28px] text-center text-muted-foreground">
              {zoom}%
            </span>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-5 w-5 rounded-full"
                  onClick={(e) => {
                    e.stopPropagation();
                    const currentIndex = ZOOM_LEVELS.indexOf(zoom);
                    if (currentIndex < ZOOM_LEVELS.length - 1) onZoomChange(ZOOM_LEVELS[currentIndex + 1]);
                  }}
                  disabled={zoom === ZOOM_LEVELS[ZOOM_LEVELS.length - 1]}
                >
                  <ZoomIn className="h-3 w-3" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Zoom In</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-5 w-5 rounded-full"
                  onClick={(e) => {
                    e.stopPropagation();
                    onZoomChange(100);
                  }}
                >
                  <Maximize className="h-3 w-3" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Reset Zoom</TooltipContent>
            </Tooltip>
          </div>
        </TooltipProvider>
      )}

      {/* Scaled slide area */}
      <div className="flex-1 flex items-center justify-center p-8 overflow-hidden">
        <SlideStage
          mode="edit"
          zoom={zoom}
          onClick={onClick}
          className={cn(showGrid && 'grid-overlay', className)}
        >
          {/* Fully opaque background to prevent bleed-through */}
          <div className="absolute inset-0 bg-background">{children}</div>
        </SlideStage>
      </div>

      {/* Bottom navigation controls */}
      {showNavigation && (
        <>
          <div
            className={cn(
              'absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-1 px-2 py-1 bg-card/90 backdrop-blur-sm border border-border rounded-full shadow-md z-20 transition-opacity duration-300 ease-in-out',
              showControls ? 'opacity-100' : 'opacity-0 pointer-events-none',
            )}
            onMouseEnter={() => setIsHoveringNavPill(true)}
            onMouseLeave={() => setIsHoveringNavPill(false)}
          >
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 rounded-full"
              onClick={onPrevSlide}
              disabled={currentSlide <= 1}
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </Button>

            <span className="text-xs font-medium text-muted-foreground min-w-[50px] text-center">
              {currentSlide} / {totalSlides}
            </span>

            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 rounded-full"
              onClick={onNextSlide}
              disabled={currentSlide >= totalSlides}
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </Button>
          </div>

          {onStartPresentation && onToggleDarkMode && (
            <div className="absolute bottom-3 right-3">
              <FloatingMenu
                isDarkMode={isDarkMode}
                onToggleDarkMode={onToggleDarkMode}
                onStartPresentation={onStartPresentation}
                onStartPresenterView={onStartPresenterView}
              />
            </div>
          )}
        </>
      )}
    </div>
  );
}
