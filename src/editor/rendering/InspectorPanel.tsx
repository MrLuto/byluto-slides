/**
 * InspectorPanel — right-side editor panel (Phase 3F).
 *
 * Visible only inside the dev mock-deck route. Reads the single currently-
 * selected element directly from the deck store and pipes edits back via
 * `updateElement`. Pure UI: no rendering of slide content, no awareness of
 * `SlideStage` or `DataSlideRenderer`, so render-only components remain
 * untouched.
 *
 * Field → data-model mapping:
 *   - x / y / width / height / rotation → patched at the top level of the
 *     element. Width/height are clamped to >= 20 (matches MIN_SIZE used by
 *     the resize gesture). Opacity is clamped to [0, 1].
 *   - text                              → TextElement.text
 *   - font size / color                 → TextElement.textStyle.{fontSize,color}
 *   - fill / stroke / stroke width      → ShapeElement.style.{fill,stroke,strokeWidth}
 *
 * Nested objects (`textStyle`, `style`) are merged immutably so untouched
 * fields are preserved. Empty/invalid numeric input is ignored rather than
 * writing NaN.
 */
import React from 'react';
import {
  useCurrentSlide,
  useDeckActions,
  useSelectedElementIds,
} from '@/editor/state/deckStore';
import type {
  ElementStyle,
  ShapeElement,
  SlideElement,
  TextElement,
  TextStyle,
} from '@/editor/model/types';

const MIN_SIZE = 20;

export function InspectorPanel() {
  const slide = useCurrentSlide();
  const selectedIds = useSelectedElementIds();
  const { updateElement } = useDeckActions();

  // Empty / multi-select states.
  if (!slide) return <ShellEmpty msg="No slide" />;
  if (selectedIds.length === 0) return <ShellEmpty msg="Nothing selected" />;
  if (selectedIds.length > 1)
    return <ShellEmpty msg={`${selectedIds.length} elements selected`} />;

  const el = slide.elements.find((e) => e.id === selectedIds[0]);
  if (!el) return <ShellEmpty msg="Element not found" />;

  const patch = (p: Partial<SlideElement>) =>
    updateElement(slide.id, el.id, p);

  return (
    <aside className="w-72 shrink-0 h-full overflow-y-auto border-l border-border bg-background">
      <div className="px-4 py-3 border-b border-border">
        <div className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
          Inspector
        </div>
        <div className="text-sm font-medium truncate">{el.type}</div>
        <div className="text-xs font-mono text-muted-foreground truncate">
          {el.id}
        </div>
      </div>

      <Section title="Geometry">
        <Row>
          <NumField label="X" value={el.x} onChange={(v) => patch({ x: v })} />
          <NumField label="Y" value={el.y} onChange={(v) => patch({ y: v })} />
        </Row>
        <Row>
          <NumField
            label="W"
            value={el.width}
            min={MIN_SIZE}
            onChange={(v) => patch({ width: Math.max(MIN_SIZE, v) })}
          />
          <NumField
            label="H"
            value={el.height}
            min={MIN_SIZE}
            onChange={(v) => patch({ height: Math.max(MIN_SIZE, v) })}
          />
        </Row>
        <Row>
          <NumField
            label="Rotation"
            value={el.rotation ?? 0}
            onChange={(v) => patch({ rotation: v })}
          />
          <NumField
            label="Opacity"
            value={el.opacity ?? 1}
            step={0.05}
            min={0}
            max={1}
            onChange={(v) =>
              patch({ opacity: Math.max(0, Math.min(1, v)) })
            }
          />
        </Row>
      </Section>

      {el.type === 'text' && <TextSection element={el} patch={patch} />}
      {el.type === 'shape' && <ShapeSection element={el} patch={patch} />}
    </aside>
  );
}

// ──────────────────────────────────────────────────────────────────────────
// Type-specific sections
// ──────────────────────────────────────────────────────────────────────────

function TextSection({
  element,
  patch,
}: {
  element: TextElement;
  patch: (p: Partial<SlideElement>) => void;
}) {
  const ts: TextStyle = element.textStyle ?? {};
  const setTextStyle = (p: Partial<TextStyle>) =>
    patch({ textStyle: { ...ts, ...p } } as Partial<TextElement>);

  return (
    <Section title="Text">
      <label className="block px-3 pb-2 text-[10px] uppercase tracking-wider text-muted-foreground">
        Content
      </label>
      <div className="px-3 pb-3">
        <textarea
          className="w-full h-20 text-sm border border-border rounded px-2 py-1 bg-background"
          value={element.text}
          onChange={(e) =>
            patch({ text: e.target.value } as Partial<TextElement>)
          }
        />
      </div>
      <Row>
        <NumField
          label="Size"
          value={ts.fontSize ?? 24}
          min={1}
          onChange={(v) => setTextStyle({ fontSize: Math.max(1, v) })}
        />
        <ColorField
          label="Color"
          value={ts.color ?? '#000000'}
          onChange={(v) => setTextStyle({ color: v })}
        />
      </Row>
    </Section>
  );
}

function ShapeSection({
  element,
  patch,
}: {
  element: ShapeElement;
  patch: (p: Partial<SlideElement>) => void;
}) {
  const st: ElementStyle = element.style ?? {};
  const setStyle = (p: Partial<ElementStyle>) =>
    patch({ style: { ...st, ...p } } as Partial<ShapeElement>);

  return (
    <Section title="Shape">
      <Row>
        <ColorField
          label="Fill"
          value={st.fill ?? '#000000'}
          onChange={(v) => setStyle({ fill: v })}
        />
        <ColorField
          label="Stroke"
          value={st.stroke ?? '#000000'}
          onChange={(v) => setStyle({ stroke: v })}
        />
      </Row>
      <Row>
        <NumField
          label="Stroke width"
          value={st.strokeWidth ?? 0}
          min={0}
          onChange={(v) => setStyle({ strokeWidth: Math.max(0, v) })}
        />
      </Row>
    </Section>
  );
}

// ──────────────────────────────────────────────────────────────────────────
// Primitives
// ──────────────────────────────────────────────────────────────────────────

function ShellEmpty({ msg }: { msg: string }) {
  return (
    <aside className="w-72 shrink-0 h-full border-l border-border bg-background flex items-center justify-center text-xs text-muted-foreground">
      {msg}
    </aside>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="border-b border-border py-2">
      <div className="px-3 py-1 text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
        {title}
      </div>
      {children}
    </div>
  );
}

function Row({ children }: { children: React.ReactNode }) {
  return <div className="flex gap-2 px-3 py-1">{children}</div>;
}

interface NumFieldProps {
  label: string;
  value: number;
  min?: number;
  max?: number;
  step?: number;
  onChange: (v: number) => void;
}

function NumField({ label, value, min, max, step = 1, onChange }: NumFieldProps) {
  return (
    <label className="flex-1 min-w-0 block">
      <span className="block text-[10px] uppercase tracking-wider text-muted-foreground mb-1">
        {label}
      </span>
      <input
        type="number"
        value={Number.isFinite(value) ? value : ''}
        min={min}
        max={max}
        step={step}
        onChange={(e) => {
          const raw = e.target.value;
          if (raw === '') return; // ignore empty rather than write NaN
          const n = Number(raw);
          if (!Number.isFinite(n)) return;
          onChange(n);
        }}
        className="w-full text-sm border border-border rounded px-2 py-1 bg-background"
      />
    </label>
  );
}

function ColorField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  // Browser <input type="color"> requires #rrggbb. Fall back to black if the
  // current value isn't a hex literal (e.g. an `hsl(...)` string).
  const safe = /^#[0-9a-fA-F]{6}$/.test(value) ? value : '#000000';
  return (
    <label className="flex-1 min-w-0 block">
      <span className="block text-[10px] uppercase tracking-wider text-muted-foreground mb-1">
        {label}
      </span>
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={safe}
          onChange={(e) => onChange(e.target.value)}
          className="h-7 w-9 border border-border rounded cursor-pointer bg-background"
        />
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="flex-1 min-w-0 text-xs font-mono border border-border rounded px-2 py-1 bg-background"
        />
      </div>
    </label>
  );
}
