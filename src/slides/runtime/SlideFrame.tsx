import React from 'react';
import { cn } from '@/lib/utils';

/**
 * SlideFrame — single slide chrome primitive.
 *
 * Owns the shared structure (full-bleed surface, `slide-content` scope,
 * brand mark slot, accent slot) but stays brand-agnostic: no hardcoded
 * wordmark, no hardcoded accent color. Callers pass `brandMark` and
 * `accent` to compose the look.
 */

export type SlideFrameVariant = 'light' | 'dark' | 'gradient';

export interface SlideFrameProps {
  children: React.ReactNode;
  /** Surface preset. Sets default background + text color. */
  variant?: SlideFrameVariant;
  /** Override the surface background (any valid CSS background value or class). */
  background?: string;
  /** Extra classes on the frame root. */
  className?: string;
  /** Optional brand mark, rendered top-right above content. */
  brandMark?: React.ReactNode;
  /**
   * Optional accent rendered at the bottom of the frame.
   * Pass `false` to suppress; pass a node to fully customize.
   */
  accent?: React.ReactNode | false;
}

const VARIANT_CLASSES: Record<SlideFrameVariant, string> = {
  light: 'bg-[#FCFBF8] text-slate-900',
  dark: 'bg-slate-900 text-white',
  gradient:
    'bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-900 text-white',
};

export function SlideFrame({
  children,
  variant = 'light',
  background,
  className,
  brandMark,
  accent,
}: SlideFrameProps) {
  // If `background` is provided as a class-like string (starts with bg-/from-),
  // apply via className; otherwise treat as raw CSS value via inline style.
  const isClassBackground =
    !!background && /^(bg-|from-|to-|via-|bg\[)/.test(background);
  const inlineStyle =
    background && !isClassBackground ? { background } : undefined;

  return (
    <div
      className={cn(
        'w-full h-full relative font-sans slide-content',
        !background && VARIANT_CLASSES[variant],
        isClassBackground && background,
        className,
      )}
      style={inlineStyle}
    >
      {brandMark && (
        <div className="absolute top-8 right-10 z-10">{brandMark}</div>
      )}

      <div className="w-full h-full">{children}</div>

      {accent !== false && accent}
    </div>
  );
}
