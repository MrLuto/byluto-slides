/**
 * Renders a single SlideElement at its absolute (x, y, width, height) inside
 * the 1920×1080 slide canvas. Pure presentation — no selection, no drag,
 * no editing. Hidden elements are skipped. `locked` is forwarded as a data
 * attribute for future editor tooling but does not affect visuals.
 */
import React from 'react';
import type {
  ElementStyle,
  ImageElement,
  LineElement,
  ShapeElement,
  SlideElement,
  TextElement,
  TextStyle,
} from '@/editor/model/types';

interface ElementRendererProps {
  element: SlideElement;
}

export function ElementRenderer({ element }: ElementRendererProps) {
  if (element.hidden) return null;

  // Lines are special: their bounding box is derived from (x,y)→(x2,y2),
  // not from element.width/height. Render them outside the standard wrapper.
  if (element.type === 'line') {
    return <LineRenderer element={element} />;
  }

  const wrapperStyle: React.CSSProperties = {
    position: 'absolute',
    left: element.x,
    top: element.y,
    width: element.width,
    height: element.height,
    transform: element.rotation ? `rotate(${element.rotation}deg)` : undefined,
    transformOrigin: 'center center',
    opacity: element.opacity ?? 1,
    zIndex: element.z,
    pointerEvents: 'none', // pure renderer; editor layer will opt-in later
  };

  return (
    <div
      style={wrapperStyle}
      data-element-id={element.id}
      data-element-type={element.type}
      data-locked={element.locked || undefined}
    >
      {element.type === 'text' && <TextRenderer element={element} />}
      {element.type === 'image' && <ImageRenderer element={element} />}
      {element.type === 'shape' && <ShapeRenderer element={element} />}
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────
// Text
// ──────────────────────────────────────────────────────────────────────────

function textStyleToCSS(t: TextStyle | undefined): React.CSSProperties {
  if (!t) return {};
  return {
    fontFamily: t.fontFamily,
    fontSize: t.fontSize,
    fontWeight: t.fontWeight,
    fontStyle: t.italic ? 'italic' : undefined,
    textDecoration: t.underline ? 'underline' : undefined,
    color: t.color,
    lineHeight: t.lineHeight,
    letterSpacing: t.letterSpacing,
    textAlign: t.align,
  };
}

function elementStyleToCSS(s: ElementStyle | undefined): React.CSSProperties {
  if (!s) return {};
  return {
    background: s.fill,
    border:
      s.stroke && s.strokeWidth
        ? `${s.strokeWidth}px solid ${s.stroke}`
        : undefined,
    borderRadius: s.borderRadius,
    boxShadow: s.shadow,
    opacity: s.opacity,
  };
}

function TextRenderer({ element }: { element: TextElement }) {
  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        whiteSpace: 'pre-wrap',
        wordBreak: 'break-word',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'flex-start',
        ...textStyleToCSS(element.textStyle),
        ...elementStyleToCSS(element.style),
      }}
    >
      {element.text}
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────
// Image
// ──────────────────────────────────────────────────────────────────────────

function ImageRenderer({ element }: { element: ImageElement }) {
  const fitMap: Record<NonNullable<ImageElement['fit']>, React.CSSProperties['objectFit']> = {
    cover: 'cover',
    contain: 'contain',
    fill: 'fill',
  };
  return (
    <img
      src={element.src}
      alt={element.alt ?? ''}
      draggable={false}
      style={{
        width: '100%',
        height: '100%',
        display: 'block',
        objectFit: fitMap[element.fit ?? 'cover'],
        borderRadius: element.style?.borderRadius,
        boxShadow: element.style?.shadow,
        opacity: element.style?.opacity,
      }}
    />
  );
}

// ──────────────────────────────────────────────────────────────────────────
// Shape
// ──────────────────────────────────────────────────────────────────────────

function ShapeRenderer({ element }: { element: ShapeElement }) {
  const base: React.CSSProperties = {
    width: '100%',
    height: '100%',
    background: element.style?.fill,
    border:
      element.style?.stroke && element.style?.strokeWidth
        ? `${element.style.strokeWidth}px solid ${element.style.stroke}`
        : undefined,
    boxShadow: element.style?.shadow,
    opacity: element.style?.opacity,
  };

  switch (element.shape) {
    case 'rectangle':
      return (
        <div
          style={{
            ...base,
            borderRadius: element.style?.borderRadius,
          }}
        />
      );
    case 'ellipse':
      return <div style={{ ...base, borderRadius: '50%' }} />;
    case 'triangle':
      return (
        <div
          style={{
            ...base,
            // Triangles can't honor borders the same way; clip-path is enough
            // for a v1 renderer.
            clipPath: 'polygon(50% 0%, 0% 100%, 100% 100%)',
          }}
        />
      );
  }
}

// ──────────────────────────────────────────────────────────────────────────
// Line
// ──────────────────────────────────────────────────────────────────────────

function LineRenderer({ element }: { element: LineElement }) {
  // Compute the bounding box from the two endpoints in canvas coordinates.
  const minX = Math.min(element.x, element.x2);
  const minY = Math.min(element.y, element.y2);
  const w = Math.max(1, Math.abs(element.x2 - element.x));
  const h = Math.max(1, Math.abs(element.y2 - element.y));

  // Endpoints inside the bounding box.
  const x1Local = element.x - minX;
  const y1Local = element.y - minY;
  const x2Local = element.x2 - minX;
  const y2Local = element.y2 - minY;

  return (
    <svg
      width={w}
      height={h}
      viewBox={`0 0 ${w} ${h}`}
      style={{
        position: 'absolute',
        left: minX,
        top: minY,
        opacity: element.opacity ?? 1,
        zIndex: element.z,
        transform: element.rotation ? `rotate(${element.rotation}deg)` : undefined,
        transformOrigin: 'center center',
        overflow: 'visible',
        pointerEvents: 'none',
      }}
      data-element-id={element.id}
      data-element-type="line"
      data-locked={element.locked || undefined}
    >
      <line
        x1={x1Local}
        y1={y1Local}
        x2={x2Local}
        y2={y2Local}
        stroke={element.style?.stroke ?? element.style?.fill ?? '#000'}
        strokeWidth={element.style?.strokeWidth ?? 2}
        strokeLinecap="round"
      />
    </svg>
  );
}
