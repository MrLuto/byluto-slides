/**
 * Zod validation schemas for the editor data model. Mirrors `types.ts`
 * exactly — keep them in sync. Use these at trust boundaries: when loading
 * a deck from the database, importing JSON, or accepting user uploads.
 *
 * Within the running app, prefer the TypeScript types from `./types` and
 * skip validation on hot paths.
 */
import { z } from 'zod';
import { SCHEMA_VERSION } from './types';

// ──────────────────────────────────────────────────────────────────────────
// Primitives
// ──────────────────────────────────────────────────────────────────────────

const idSchema = z.string().min(1);
const isoDateSchema = z.string().min(1);
const colorSchema = z.string().min(1); // hex / rgb / hsl — kept loose on purpose
const fontWeightSchema = z.union([
  z.literal(100), z.literal(200), z.literal(300), z.literal(400),
  z.literal(500), z.literal(600), z.literal(700), z.literal(800), z.literal(900),
]);

// ──────────────────────────────────────────────────────────────────────────
// Theme
// ──────────────────────────────────────────────────────────────────────────

export const themeSchema = z.object({
  colors: z.object({
    background: colorSchema,
    surface: colorSchema,
    text: colorSchema,
    muted: colorSchema,
    accent: colorSchema,
    primary: colorSchema,
  }),
  fonts: z.object({
    heading: z.string(),
    body: z.string(),
    mono: z.string(),
  }),
});

// ──────────────────────────────────────────────────────────────────────────
// Background
// ──────────────────────────────────────────────────────────────────────────

export const slideBackgroundSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('solid'), color: colorSchema }),
  z.object({
    type: z.literal('gradient'),
    from: colorSchema,
    to: colorSchema,
    angle: z.number(),
  }),
  z.object({
    type: z.literal('image'),
    src: z.string().min(1),
    fit: z.enum(['cover', 'contain', 'fill']),
    opacity: z.number().min(0).max(1).optional(),
  }),
]);

// ──────────────────────────────────────────────────────────────────────────
// Element style
// ──────────────────────────────────────────────────────────────────────────

export const elementStyleSchema = z.object({
  fill: colorSchema.optional(),
  stroke: colorSchema.optional(),
  strokeWidth: z.number().nonnegative().optional(),
  opacity: z.number().min(0).max(1).optional(),
  borderRadius: z.number().nonnegative().optional(),
  shadow: z.string().optional(),
});

export const textStyleSchema = z.object({
  fontFamily: z.string().optional(),
  fontSize: z.number().positive().optional(),
  fontWeight: fontWeightSchema.optional(),
  italic: z.boolean().optional(),
  underline: z.boolean().optional(),
  color: colorSchema.optional(),
  lineHeight: z.number().positive().optional(),
  letterSpacing: z.number().optional(),
  align: z.enum(['left', 'center', 'right', 'justify']).optional(),
});

// ──────────────────────────────────────────────────────────────────────────
// Elements
// ──────────────────────────────────────────────────────────────────────────

const baseElementSchema = z.object({
  id: idSchema,
  x: z.number(),
  y: z.number(),
  width: z.number().nonnegative(),
  height: z.number().nonnegative(),
  rotation: z.number().optional(),
  opacity: z.number().min(0).max(1).optional(),
  z: z.number(),
  locked: z.boolean().optional(),
  hidden: z.boolean().optional(),
});

export const textElementSchema = baseElementSchema.extend({
  type: z.literal('text'),
  text: z.string(),
  textStyle: textStyleSchema.optional(),
  style: elementStyleSchema.optional(),
});

export const imageElementSchema = baseElementSchema.extend({
  type: z.literal('image'),
  src: z.string().min(1),
  alt: z.string().optional(),
  fit: z.enum(['cover', 'contain', 'fill']).optional(),
  style: elementStyleSchema.optional(),
});

export const shapeElementSchema = baseElementSchema.extend({
  type: z.literal('shape'),
  shape: z.enum(['rectangle', 'ellipse', 'triangle']),
  style: elementStyleSchema.optional(),
});

export const lineElementSchema = baseElementSchema.extend({
  type: z.literal('line'),
  x2: z.number(),
  y2: z.number(),
  style: elementStyleSchema.optional(),
});

export const slideElementSchema = z.discriminatedUnion('type', [
  textElementSchema,
  imageElementSchema,
  shapeElementSchema,
  lineElementSchema,
]);

// ──────────────────────────────────────────────────────────────────────────
// Slide & Deck
// ──────────────────────────────────────────────────────────────────────────

export const slideSchema = z.object({
  id: idSchema,
  name: z.string().optional(),
  position: z.number().int().nonnegative(),
  background: slideBackgroundSchema,
  elements: z.array(slideElementSchema),
  notes: z.string().optional(),
  createdAt: isoDateSchema,
  updatedAt: isoDateSchema,
});

export const deckSchema = z.object({
  id: idSchema,
  schemaVersion: z.number().int().positive(),
  title: z.string(),
  theme: themeSchema,
  slides: z.array(slideSchema),
  createdAt: isoDateSchema,
  updatedAt: isoDateSchema,
});

// ──────────────────────────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────────────────────────

/** Throws a ZodError if invalid. Returns the parsed deck. */
export function parseDeck(raw: unknown) {
  return deckSchema.parse(raw);
}

/** Returns a Result-like tuple; never throws. */
export function safeParseDeck(raw: unknown) {
  return deckSchema.safeParse(raw);
}

export function isCurrentSchema(version: number): boolean {
  return version === SCHEMA_VERSION;
}
