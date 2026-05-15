/**
 * Compatibility wrapper. Delegates to `SlideFrame` while preserving the
 * original visual output (gradient accent bar, light/dark/gradient variants).
 */
import React from 'react';
import { SlideFrame, type SlideFrameVariant } from '@/slides/runtime/SlideFrame';

interface SlideLayoutProps {
  children: React.ReactNode;
  variant?: 'default' | 'dark' | 'gradient';
  className?: string;
}

const VARIANT_MAP: Record<NonNullable<SlideLayoutProps['variant']>, SlideFrameVariant> = {
  default: 'light',
  dark: 'dark',
  gradient: 'gradient',
};

/** @deprecated Use <SlideFrame> directly. */
export function SlideLayout({ children, variant = 'default', className }: SlideLayoutProps) {
  return (
    <SlideFrame
      variant={VARIANT_MAP[variant]}
      className={className}
      accent={
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500" />
      }
    >
      {children}
    </SlideFrame>
  );
}
