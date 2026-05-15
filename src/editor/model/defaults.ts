/**
 * Factories for editor model objects. Pure functions, no side effects beyond
 * generating ids and timestamps. Outputs are always JSON-serializable.
 */
import {
  SCHEMA_VERSION,
  SLIDE_WIDTH,
  SLIDE_HEIGHT,
  type Deck,
  type ID,
  type ImageElement,
  type ShapeElement,
  type ShapeKind,
  type Slide,
  type SlideBackground,
  type TextElement,
  type Theme,
} from './types';

const newId = (): ID => {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  // Fallback for non-browser environments.
  return 'id-' + Math.random().toString(36).slice(2) + Date.now().toString(36);
};

const now = (): string => new Date().toISOString();

// ──────────────────────────────────────────────────────────────────────────
// Defaults
// ──────────────────────────────────────────────────────────────────────────

export const DEFAULT_THEME: Theme = {
  colors: {
    background: '#FCFBF8',
    surface: '#FFFFFF',
    text: '#0F172A',
    muted: '#64748B',
    accent: '#4E93FF',
    primary: '#003366',
  },
  fonts: {
    heading: 'IBM Plex Sans, sans-serif',
    body: 'IBM Plex Sans, sans-serif',
    mono: 'IBM Plex Mono, monospace',
  },
};

export const DEFAULT_BACKGROUND: SlideBackground = {
  type: 'solid',
  color: DEFAULT_THEME.colors.background,
};

// Centered defaults inside the 1920×1080 canvas.
const CENTER_X = SLIDE_WIDTH / 2;
const CENTER_Y = SLIDE_HEIGHT / 2;

// ──────────────────────────────────────────────────────────────────────────
// Element factories
// ──────────────────────────────────────────────────────────────────────────

export interface CreateTextOptions extends Partial<Omit<TextElement, 'id' | 'type'>> {
  text?: string;
}

export function createTextElement(opts: CreateTextOptions = {}): TextElement {
  const width = opts.width ?? 800;
  const height = opts.height ?? 120;
  return {
    id: newId(),
    type: 'text',
    x: opts.x ?? CENTER_X - width / 2,
    y: opts.y ?? CENTER_Y - height / 2,
    width,
    height,
    rotation: opts.rotation ?? 0,
    opacity: opts.opacity ?? 1,
    z: opts.z ?? 0,
    locked: opts.locked,
    hidden: opts.hidden,
    text: opts.text ?? 'Double-click to edit',
    textStyle: {
      fontFamily: DEFAULT_THEME.fonts.heading,
      fontSize: 48,
      fontWeight: 600,
      color: DEFAULT_THEME.colors.text,
      lineHeight: 1.2,
      align: 'left',
      ...opts.textStyle,
    },
    style: opts.style,
  };
}

export interface CreateShapeOptions
  extends Partial<Omit<ShapeElement, 'id' | 'type' | 'shape'>> {
  shape?: ShapeKind;
}

export function createShapeElement(opts: CreateShapeOptions = {}): ShapeElement {
  const width = opts.width ?? 400;
  const height = opts.height ?? 400;
  return {
    id: newId(),
    type: 'shape',
    shape: opts.shape ?? 'rectangle',
    x: opts.x ?? CENTER_X - width / 2,
    y: opts.y ?? CENTER_Y - height / 2,
    width,
    height,
    rotation: opts.rotation ?? 0,
    opacity: opts.opacity ?? 1,
    z: opts.z ?? 0,
    locked: opts.locked,
    hidden: opts.hidden,
    style: {
      fill: DEFAULT_THEME.colors.accent,
      borderRadius: 8,
      ...opts.style,
    },
  };
}

export interface CreateImageOptions
  extends Partial<Omit<ImageElement, 'id' | 'type' | 'src'>> {
  src: string;
}

export function createImageElement(opts: CreateImageOptions): ImageElement {
  const width = opts.width ?? 800;
  const height = opts.height ?? 600;
  return {
    id: newId(),
    type: 'image',
    src: opts.src,
    alt: opts.alt,
    fit: opts.fit ?? 'cover',
    x: opts.x ?? CENTER_X - width / 2,
    y: opts.y ?? CENTER_Y - height / 2,
    width,
    height,
    rotation: opts.rotation ?? 0,
    opacity: opts.opacity ?? 1,
    z: opts.z ?? 0,
    locked: opts.locked,
    hidden: opts.hidden,
    style: opts.style,
  };
}

// ──────────────────────────────────────────────────────────────────────────
// Slide & Deck factories
// ──────────────────────────────────────────────────────────────────────────

export interface CreateSlideOptions {
  name?: string;
  position?: number;
  background?: SlideBackground;
  elements?: Slide['elements'];
  notes?: string;
}

export function createBlankSlide(opts: CreateSlideOptions = {}): Slide {
  const ts = now();
  return {
    id: newId(),
    name: opts.name,
    position: opts.position ?? 0,
    background: opts.background ?? DEFAULT_BACKGROUND,
    elements: opts.elements ?? [],
    notes: opts.notes,
    createdAt: ts,
    updatedAt: ts,
  };
}

export interface CreateDeckOptions {
  title?: string;
  theme?: Theme;
  /** Initial slides; if omitted, the deck starts with a single blank slide. */
  slides?: Slide[];
}

export function createBlankDeck(opts: CreateDeckOptions = {}): Deck {
  const ts = now();
  const slides =
    opts.slides && opts.slides.length > 0
      ? opts.slides.map((s, i) => ({ ...s, position: i }))
      : [createBlankSlide({ position: 0 })];
  return {
    id: newId(),
    schemaVersion: SCHEMA_VERSION,
    title: opts.title ?? 'Untitled deck',
    theme: opts.theme ?? DEFAULT_THEME,
    slides,
    createdAt: ts,
    updatedAt: ts,
  };
}
