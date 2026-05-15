/**
 * InspectorPanel — Phase 4B chrome refresh.
 *
 * Pure UI polish, no behavior change. Same store wiring:
 *   - reads single selected element from currentSlide
 *   - patches via updateElement (geometry, text, shape style)
 *   - clamps width/height to MIN_SIZE, opacity to [0,1]
 *
 * Visual changes only:
 *   - Sectioned cards with collapsible look
 *   - Better empty/multi-select states (icon + helper text)
 *   - Tighter, more consistent inputs
 *   - Type pill in header
 */
import React from 'react';
import { MousePointerSquareDashed, Layers, Image as ImageIcon, Square as SquareIcon, Type as TypeIcon } from 'lucide-react';
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

  if (!slide)
    return (
      <ShellEmpty
        title="No slide selected"
        hint="Pick a slide from the sidebar to start editing."
      />
    );
  if (selectedIds.length === 0)
    return (
      <ShellEmpty
        title="Nothing selected"
        hint="Click an element on the canvas to view and edit its properties. Press ? for shortcuts."
      />
    );
  if (selectedIds.length > 1)
    return (
      <ShellEmpty
        title={`${selectedIds.length} elements selected`}
        hint="Multi-element editing isn't available yet. Select a single element to edit it."
      />
    );

  const el = slide.elements.find((e) => e.id === selectedIds[0]);
  if (!el) return <ShellEmpty title="Element not found" hint="" />;

  const patch = (p: Partial<SlideElement>) =>
    updateElement(slide.id, el.id, p);

  return (
    <aside className="w-72 shrink-0 h-full overflow-y-auto border-l border-border bg-background">
      <div className="px-4 py-3 border-b border-border flex items-center gap-3">
        <TypeBadge type={el.type} />
        <div className="min-w-0">
          <div className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
            Inspector
          </div>
          <div className="text-sm font-medium capitalize truncate">{el.type}</div>
        </div>
      </div>

      <Section title="Position & size">
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
            onChange={(v) => patch({ opacity: Math.max(0, Math.min(1, v)) })}
          />
        </Row>
      </Section>

      {el.type === 'text' && <TextSection element={el} patch={patch} />}
      {el.type === 'shape' && <ShapeSection element={el} patch={patch} />}
    </aside>
  );
}

function TypeBadge({ type }: { type: SlideElement['type'] }) {
  const Icon =
    type === 'text' ? TypeIcon : type === 'image' ? ImageIcon : type === 'shape' ? SquareIcon : Layers;
  return (
    <div className="h-9 w-9 rounded-md bg-primary/10 text-primary inline-flex items-center justify-center shrink-0">
      <Icon className="h-4 w-4" />
    </div>
  );
}

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
      <div className="px-3 pt-1 pb-2">
        <Label>Content</Label>
        <textarea
          className="w-full h-20 text-sm border border-border rounded-md px-2 py-1.5 bg-background focus:outline-none focus:ring-1 focus:ring-primary/50"
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

// ── primitives ─────────────────────────────────────────────────────────

function ShellEmpty({ title, hint }: { title: string; hint: string }) {
  return (
    <aside className="w-72 shrink-0 h-full border-l border-border bg-background flex flex-col items-center justify-center px-6 text-center">
      <div className="h-10 w-10 rounded-full bg-muted text-muted-foreground inline-flex items-center justify-center mb-3">
        <MousePointerSquareDashed className="h-5 w-5" />
      </div>
      <div className="text-sm font-medium">{title}</div>
      {hint && (
        <div className="text-xs text-muted-foreground mt-1 leading-snug">
          {hint}
        </div>
      )}
    </aside>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="border-b border-border py-2">
      <div className="px-3 py-1.5 text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
        {title}
      </div>
      {children}
    </div>
  );
}

function Row({ children }: { children: React.ReactNode }) {
  return <div className="flex gap-2 px-3 py-1">{children}</div>;
}

function Label({ children }: { children: React.ReactNode }) {
  return (
    <span className="block text-[10px] uppercase tracking-wider text-muted-foreground mb-1">
      {children}
    </span>
  );
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
      <Label>{label}</Label>
      <input
        type="number"
        value={Number.isFinite(value) ? value : ''}
        min={min}
        max={max}
        step={step}
        onChange={(e) => {
          const raw = e.target.value;
          if (raw === '') return;
          const n = Number(raw);
          if (!Number.isFinite(n)) return;
          onChange(n);
        }}
        className="w-full text-sm border border-border rounded-md px-2 py-1 bg-background focus:outline-none focus:ring-1 focus:ring-primary/50 tabular-nums"
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
  const safe = /^#[0-9a-fA-F]{6}$/.test(value) ? value : '#000000';
  return (
    <label className="flex-1 min-w-0 block">
      <Label>{label}</Label>
      <div className="flex items-center gap-2 border border-border rounded-md px-1.5 py-1 bg-background focus-within:ring-1 focus-within:ring-primary/50">
        <input
          type="color"
          value={safe}
          onChange={(e) => onChange(e.target.value)}
          className="h-5 w-6 rounded cursor-pointer bg-transparent border-0 p-0"
        />
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="flex-1 min-w-0 text-xs font-mono bg-transparent focus:outline-none"
        />
      </div>
    </label>
  );
}
