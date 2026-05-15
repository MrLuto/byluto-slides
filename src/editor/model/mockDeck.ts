/**
 * Mock editable deck — realistic test data for the future renderer.
 *
 * Pure data, no React, no JSX. Built with the model factories so it always
 * round-trips through `safeParseDeck`. Not rendered anywhere yet; this exists
 * so renderer/store work in later phases has something to load.
 *
 * Coordinates are in the 1920×1080 canvas. Z-order is explicit:
 *   0   = base background shapes
 *   10  = supporting shapes / accents
 *   20  = body text
 *   30  = headings
 *   40  = foreground accents (badges, buttons)
 */

import {
  createBlankDeck,
  createBlankSlide,
  createImageElement,
  createShapeElement,
  createTextElement,
  DEFAULT_THEME,
} from './defaults';
import { safeParseDeck } from './schema';
import type { Deck } from './types';

const C = DEFAULT_THEME.colors;
const F = DEFAULT_THEME.fonts;

// ──────────────────────────────────────────────────────────────────────────
// Slide 1 — Title slide
// ──────────────────────────────────────────────────────────────────────────

const titleSlide = createBlankSlide({
  name: 'Cover',
  position: 0,
  background: { type: 'solid', color: C.primary },
  elements: [
    // Accent bar across the bottom.
    createShapeElement({
      shape: 'rectangle',
      x: 0,
      y: 1072,
      width: 1920,
      height: 8,
      z: 10,
      style: { fill: C.accent, borderRadius: 0 },
    }),
    // Eyebrow label.
    createTextElement({
      text: 'PHASE 1B PROTOTYPE',
      x: 160,
      y: 380,
      width: 900,
      height: 40,
      z: 20,
      textStyle: {
        fontFamily: F.body,
        fontSize: 24,
        fontWeight: 500,
        color: C.accent,
        letterSpacing: 4,
        align: 'left',
      },
    }),
    // Headline.
    createTextElement({
      text: 'A New Way to Build Decks',
      x: 160,
      y: 440,
      width: 1500,
      height: 220,
      z: 30,
      textStyle: {
        fontFamily: F.heading,
        fontSize: 128,
        fontWeight: 700,
        color: '#FFFFFF',
        lineHeight: 1.05,
        align: 'left',
      },
    }),
    // Subhead.
    createTextElement({
      text: 'Editable slides powered by the new Lovable editor model.',
      x: 160,
      y: 700,
      width: 1400,
      height: 80,
      z: 30,
      textStyle: {
        fontFamily: F.body,
        fontSize: 36,
        fontWeight: 400,
        color: C.muted,
        lineHeight: 1.3,
        align: 'left',
      },
    }),
  ],
  notes: 'Open with the editor vision; one minute, no demo yet.',
});

// ──────────────────────────────────────────────────────────────────────────
// Slide 2 — Content slide with text + shape
// ──────────────────────────────────────────────────────────────────────────

const contentSlide = createBlankSlide({
  name: 'Why it matters',
  position: 1,
  background: { type: 'solid', color: C.background },
  elements: [
    // Decorative side block.
    createShapeElement({
      shape: 'rectangle',
      x: 0,
      y: 0,
      width: 24,
      height: 1080,
      z: 0,
      style: { fill: C.accent, borderRadius: 0 },
    }),
    // Section title.
    createTextElement({
      text: 'Why it matters',
      x: 160,
      y: 180,
      width: 1400,
      height: 100,
      z: 30,
      textStyle: {
        fontFamily: F.heading,
        fontSize: 72,
        fontWeight: 700,
        color: C.text,
        lineHeight: 1.1,
        align: 'left',
      },
    }),
    // Body paragraph.
    createTextElement({
      text:
        'Slides become real data instead of source files. ' +
        'You get reorder, duplicate, theme swaps, and undo for free — ' +
        'and decks stay portable across exports and imports.',
      x: 160,
      y: 320,
      width: 1100,
      height: 320,
      z: 20,
      textStyle: {
        fontFamily: F.body,
        fontSize: 36,
        fontWeight: 400,
        color: C.text,
        lineHeight: 1.45,
        align: 'left',
      },
    }),
    // Highlight callout shape.
    createShapeElement({
      shape: 'rectangle',
      x: 1340,
      y: 360,
      width: 420,
      height: 360,
      z: 10,
      style: { fill: C.surface, borderRadius: 24, shadow: '0 20px 60px rgba(15,23,42,0.12)' },
    }),
    // Callout headline.
    createTextElement({
      text: '6×',
      x: 1360,
      y: 400,
      width: 380,
      height: 180,
      z: 40,
      textStyle: {
        fontFamily: F.heading,
        fontSize: 144,
        fontWeight: 700,
        color: C.accent,
        align: 'center',
      },
    }),
    // Callout label.
    createTextElement({
      text: 'faster slide iteration',
      x: 1360,
      y: 600,
      width: 380,
      height: 80,
      z: 40,
      textStyle: {
        fontFamily: F.body,
        fontSize: 28,
        fontWeight: 500,
        color: C.muted,
        align: 'center',
      },
    }),
  ],
  notes: 'Land the value prop; gesture toward the callout for emphasis.',
});

// ──────────────────────────────────────────────────────────────────────────
// Slide 3 — Image placeholder slide
// ──────────────────────────────────────────────────────────────────────────

const imageSlide = createBlankSlide({
  name: 'Product preview',
  position: 2,
  background: { type: 'solid', color: C.background },
  elements: [
    // Image placeholder occupying the right two-thirds.
    createImageElement({
      src: 'https://placehold.co/1200x900?text=Product+Preview',
      alt: 'Product preview placeholder',
      fit: 'cover',
      x: 720,
      y: 90,
      width: 1100,
      height: 900,
      z: 10,
      style: { borderRadius: 24 },
    }),
    // Title on the left rail.
    createTextElement({
      text: 'Product preview',
      x: 100,
      y: 260,
      width: 580,
      height: 200,
      z: 30,
      textStyle: {
        fontFamily: F.heading,
        fontSize: 72,
        fontWeight: 700,
        color: C.text,
        lineHeight: 1.1,
        align: 'left',
      },
    }),
    // Caption.
    createTextElement({
      text:
        'Drop the latest screenshot here. The editor will let you swap ' +
        'the image inline without touching code.',
      x: 100,
      y: 480,
      width: 580,
      height: 260,
      z: 20,
      textStyle: {
        fontFamily: F.body,
        fontSize: 28,
        fontWeight: 400,
        color: C.muted,
        lineHeight: 1.5,
        align: 'left',
      },
    }),
  ],
  notes: 'Use this slot for the latest product shot before each demo.',
});

// ──────────────────────────────────────────────────────────────────────────
// Deck
// ──────────────────────────────────────────────────────────────────────────

export const mockDeck: Deck = createBlankDeck({
  title: 'Mock editable deck',
  theme: DEFAULT_THEME,
  slides: [titleSlide, contentSlide, imageSlide],
});

/**
 * Validates the mock deck against the zod schema.
 * Useful in tests and dev-time sanity checks.
 */
export function validateMockDeck() {
  return safeParseDeck(mockDeck);
}
