/**
 * Editor data model — JSON-serializable types for decks, slides, and elements.
 *
 * Rules:
 *  - Everything in here must be safe to `JSON.stringify` and round-trip back
 *    through `JSON.parse`. No `Date`, no `Map`, no functions, no class
 *    instances, no React nodes.
 *  - All identifiers are stable strings (uuid v4 in practice). Never derive
 *    ids from labels or positions.
 *  - The internal coordinate system is fixed at 1920×1080 CSS pixels. All
 *    element x/y/width/height values live in this space; rendering scales
 *    via `SlideStage`.
 *  - `position` on a slide is the integer order index inside its deck.
 *  - Versioning: bump `schemaVersion` on the deck when a breaking change is
 *    introduced and provide a migration in `editor/model/migrations`.
 */

export const SCHEMA_VERSION = 1;
export const SLIDE_WIDTH = 1920;
export const SLIDE_HEIGHT = 1080;

export type ID = string;
export type ISODateString = string;

// ──────────────────────────────────────────────────────────────────────────
// Theme
// ──────────────────────────────────────────────────────────────────────────

export interface Theme {
  /** Hex strings, e.g. "#0F172A". Avoid CSS variables — keep decks portable. */
  colors: {
    background: string;
    surface: string;
    text: string;
    muted: string;
    accent: string;
    primary: string;
  };
  fonts: {
    heading: string;
    body: string;
    mono: string;
  };
}

// ──────────────────────────────────────────────────────────────────────────
// Slide background
// ──────────────────────────────────────────────────────────────────────────

export type SlideBackground =
  | { type: 'solid'; color: string }
  | {
      type: 'gradient';
      from: string;
      to: string;
      /** Degrees, 0 = top→bottom. */
      angle: number;
    }
  | {
      type: 'image';
      /** Public URL or storage key. */
      src: string;
      fit: 'cover' | 'contain' | 'fill';
      opacity?: number;
    };

// ──────────────────────────────────────────────────────────────────────────
// Element style (shared)
// ──────────────────────────────────────────────────────────────────────────

export type TextAlign = 'left' | 'center' | 'right' | 'justify';
export type FontWeight = 100 | 200 | 300 | 400 | 500 | 600 | 700 | 800 | 900;

export interface ElementStyle {
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
  /** 0–1. Multiplied with element-level opacity. */
  opacity?: number;
  borderRadius?: number;
  /** Box-shadow expressed as a CSS string. Optional, kept simple on purpose. */
  shadow?: string;
}

export interface TextStyle {
  fontFamily?: string;
  /** In px on the 1920×1080 canvas. */
  fontSize?: number;
  fontWeight?: FontWeight;
  italic?: boolean;
  underline?: boolean;
  color?: string;
  /** Multiplier of fontSize, e.g. 1.2 */
  lineHeight?: number;
  letterSpacing?: number;
  align?: TextAlign;
}

// ──────────────────────────────────────────────────────────────────────────
// Elements
// ──────────────────────────────────────────────────────────────────────────

export type ElementType = 'text' | 'image' | 'shape' | 'line';

interface BaseElement {
  id: ID;
  /** Position in 1920×1080 canvas pixels. */
  x: number;
  y: number;
  width: number;
  height: number;
  /** Degrees, clockwise. */
  rotation?: number;
  /** Element-level opacity 0–1. */
  opacity?: number;
  /** Higher renders on top. Stored explicitly to avoid array-order coupling. */
  z: number;
  locked?: boolean;
  hidden?: boolean;
}

export interface TextElement extends BaseElement {
  type: 'text';
  /** Plain text. Rich text is out of scope for the initial model. */
  text: string;
  textStyle?: TextStyle;
  style?: ElementStyle;
}

export interface ImageElement extends BaseElement {
  type: 'image';
  src: string;
  alt?: string;
  fit?: 'cover' | 'contain' | 'fill';
  style?: ElementStyle;
}

export type ShapeKind = 'rectangle' | 'ellipse' | 'triangle';

export interface ShapeElement extends BaseElement {
  type: 'shape';
  shape: ShapeKind;
  style?: ElementStyle;
}

export interface LineElement extends BaseElement {
  type: 'line';
  /** Endpoints are relative to (x, y); width/height bound the segment. */
  x2: number;
  y2: number;
  style?: ElementStyle;
}

export type SlideElement =
  | TextElement
  | ImageElement
  | ShapeElement
  | LineElement;

// ──────────────────────────────────────────────────────────────────────────
// Slide & Deck
// ──────────────────────────────────────────────────────────────────────────

export interface Slide {
  id: ID;
  /** Optional human-readable label shown in the sidebar. */
  name?: string;
  /** Order inside the deck. Owned by the deck, not the slide. */
  position: number;
  background: SlideBackground;
  elements: SlideElement[];
  /** Optional speaker notes. Authoritative storage may live elsewhere. */
  notes?: string;
  createdAt: ISODateString;
  updatedAt: ISODateString;
}

export interface Deck {
  id: ID;
  schemaVersion: number;
  title: string;
  theme: Theme;
  slides: Slide[];
  createdAt: ISODateString;
  updatedAt: ISODateString;
}
