/**
 * Compatibility wrapper. Delegates to `SlideFrame` while preserving the
 * original Carbon-inspired visuals (slide-primary dark surface, slide-accent
 * bottom bar, SLIDEFORGE wordmark in the brand slot).
 *
 * The wordmark lives here, not in SlideFrame, so the frame stays brand-agnostic.
 */
import React from 'react';
import { cn } from '@/lib/utils';
import { SlideFrame } from '@/slides/runtime/SlideFrame';

interface MSSlideLayoutProps {
  children: React.ReactNode;
  variant?: 'default' | 'title' | 'dark';
  className?: string;
}

/** @deprecated Use <SlideFrame> directly and pass your own brandMark/accent. */
export function MSSlideLayout({ children, variant = 'default', className }: MSSlideLayoutProps) {
  const isDark = variant === 'dark' || variant === 'title';

  return (
    <SlideFrame
      // Preserve the original token-based surfaces exactly.
      background={
        isDark
          ? 'bg-slide-primary text-white'
          : 'bg-[#FCFBF8] text-slide-gray-900'
      }
      className={className}
      brandMark={<LogoMark variant={isDark ? 'light' : 'dark'} />}
      accent={
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-slide-accent" />
      }
    >
      {children}
    </SlideFrame>
  );
}

interface LogoMarkProps {
  variant?: 'dark' | 'light';
  className?: string;
}

/** Minimal placeholder wordmark — only used by the legacy MSSlideLayout shim. */
export function LogoMark({ variant = 'dark', className }: LogoMarkProps) {
  const color =
    variant === 'light' ? 'hsl(var(--slide-gray-100))' : 'hsl(var(--slide-primary))';

  return (
    <svg viewBox="0 0 120 24" className={cn('h-5 w-auto', className)} fill={color}>
      <text
        x="0"
        y="17"
        fontFamily="IBM Plex Sans, sans-serif"
        fontSize="14"
        fontWeight="600"
        letterSpacing="0.05em"
      >
        SLIDEFORGE
      </text>
    </svg>
  );
}

// Re-export with legacy name for backwards compatibility
export const MSLogo = LogoMark;
