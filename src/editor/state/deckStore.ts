/**
 * Editor state store (Phase 3A).
 *
 * Zustand store that holds the *editing* state for a Deck:
 *  - which deck is loaded
 *  - which slide is current
 *  - which elements are selected
 *  - current zoom (canvas zoom multiplier in percent, 100 = fit)
 *  - editor mode (`edit` | `preview`)
 *
 * Render-only components (DataSlideRenderer, ElementRenderer, SlideStage,
 * SlideFrame) MUST NOT import this store. They take data via props so they
 * stay pure and reusable. Editor-aware components subscribe via the
 * granular hooks exported below to avoid unnecessary rerenders.
 *
 * No undo/redo, dragging, or resizing yet — those land in later phases.
 */
import { create } from 'zustand';
import { useShallow } from 'zustand/react/shallow';
import type { Deck, ID, Slide, SlideElement } from '@/editor/model/types';

export type EditorMode = 'edit' | 'preview';

// ──────────────────────────────────────────────────────────────────────────
// History
//
// Snapshot-based undo/redo. We push the *previous* `currentDeck` reference
// into `past` whenever a deck-mutating action runs, and clear `future`. On
// undo we move the head of `past` back into `currentDeck` and push the
// current one onto `future`. UI-only state — selection, zoom, editor mode,
// inline text-edit id — is intentionally not snapshotted: it would create
// noisy entries (e.g. "I clicked an element") and round-trip badly when a
// snapshot points at slides/elements that no longer exist.
//
// To avoid one history entry per drag/resize frame, callers wrap a gesture
// in `beginHistory()` / `endHistory()`. While `_txDepth > 0`, mutations
// update `currentDeck` but do NOT push to `past`; on `endHistory` we push
// the snapshot captured at the *start* of the gesture — yielding one
// reversible step for the whole drag/resize/typing burst.
// ──────────────────────────────────────────────────────────────────────────

const HISTORY_LIMIT = 100;

// ──────────────────────────────────────────────────────────────────────────
// State + actions
// ──────────────────────────────────────────────────────────────────────────

interface DeckState {
  currentDeck: Deck | null;
  currentSlideId: ID | null;
  selectedElementIds: ID[];
  zoom: number; // percent; 100 = fit
  editorMode: EditorMode;
  /** Id of the element currently in inline text-edit mode, if any. */
  editingTextId: ID | null;

  // history (deck snapshots only — UI state is excluded by design)
  past: Deck[];
  future: Deck[];
  /** Internal: nesting depth of an open history transaction. */
  _txDepth: number;
  /** Internal: deck snapshot captured at the start of the transaction. */
  _txPre: Deck | null;

  // actions
  setDeck: (deck: Deck | null) => void;
  setCurrentSlide: (slideId: ID | null) => void;
  selectElement: (elementId: ID, opts?: { additive?: boolean }) => void;
  clearSelection: () => void;
  setZoom: (zoom: number) => void;
  setEditorMode: (mode: EditorMode) => void;
  /** Enter/exit inline text-edit mode. Pass `null` to exit. */
  setEditingText: (elementId: ID | null) => void;
  /**
   * Patch a single element on a slide. Pass any subset of element fields
   * (e.g. `{ x, y }` during a drag). No-ops if the slide or element is
   * missing, or the element is locked.
   */
  updateElement: (
    slideId: ID,
    elementId: ID,
    patch: Partial<SlideElement>,
  ) => void;
  /**
   * Append a new element to a slide and select it. Z-index is auto-assigned
   * one above the current max so the new element renders on top.
   */
  addElement: (slideId: ID, element: SlideElement) => void;
  /**
   * Remove all currently-selected elements from the current slide. Locked
   * elements are skipped. Clears selection + text-edit mode.
   */
  deleteSelectedElements: () => void;
  /** Append a new blank slide and select it. */
  addSlide: () => void;
  duplicateCurrentSlide: () => void;
  deleteCurrentSlide: () => void;
  moveSlide: (fromIndex: number, toIndex: number) => void;

  // history actions
  /** Open a history transaction; nest-safe. Pair with `endHistory`. */
  beginHistory: () => void;
  /** Close a history transaction; commits one entry on the outermost call. */
  endHistory: () => void;
  undo: () => void;
  redo: () => void;
}

/**
 * Compute the state patch for a deck-changing action. Records history
 * unless we're inside an open transaction (in which case the snapshot was
 * already captured at `beginHistory` time).
 */
function withHistory(
  s: DeckState,
  nextDeck: Deck,
  extra: Partial<DeckState> = {},
): Partial<DeckState> {
  if (nextDeck === s.currentDeck) return extra;
  if (s._txDepth > 0 || !s.currentDeck) {
    return { currentDeck: nextDeck, ...extra };
  }
  const past = [...s.past, s.currentDeck];
  if (past.length > HISTORY_LIMIT) past.splice(0, past.length - HISTORY_LIMIT);
  return { currentDeck: nextDeck, past, future: [], ...extra };
}

export const useDeckStore = create<DeckState>((set) => ({
  currentDeck: null,
  currentSlideId: null,
  selectedElementIds: [],
  zoom: 100,
  editorMode: 'edit',
  editingTextId: null,

  past: [],
  future: [],
  _txDepth: 0,
  _txPre: null,

  setDeck: (deck) =>
    set(() => ({
      currentDeck: deck,
      // When the deck changes, default to its first slide and clear selection.
      currentSlideId: deck?.slides[0]?.id ?? null,
      selectedElementIds: [],
      editingTextId: null,
      // Loading a fresh deck is the new baseline — discard prior history.
      past: [],
      future: [],
      _txDepth: 0,
      _txPre: null,
    })),

  setCurrentSlide: (slideId) =>
    set(() => ({
      currentSlideId: slideId,
      selectedElementIds: [],
      editingTextId: null,
    })),

  selectElement: (elementId, opts) =>
    set((s) => {
      if (opts?.additive) {
        if (s.selectedElementIds.includes(elementId)) {
          return {
            selectedElementIds: s.selectedElementIds.filter(
              (id) => id !== elementId,
            ),
          };
        }
        return { selectedElementIds: [...s.selectedElementIds, elementId] };
      }
      return { selectedElementIds: [elementId] };
    }),

  clearSelection: () => set(() => ({ selectedElementIds: [] })),

  setZoom: (zoom) =>
    set(() => ({ zoom: Math.max(10, Math.min(400, Math.round(zoom))) })),

  setEditorMode: (editorMode) => set(() => ({ editorMode })),

  setEditingText: (editingTextId) => set(() => ({ editingTextId })),

  updateElement: (slideId, elementId, patch) =>
    set((s) => {
      const deck = s.currentDeck;
      if (!deck) return {};
      let mutated = false;
      const slides = deck.slides.map((sl) => {
        if (sl.id !== slideId) return sl;
        const elements = sl.elements.map((el) => {
          if (el.id !== elementId) return el;
          if (el.locked) return el;
          mutated = true;
          return { ...el, ...patch, type: el.type } as SlideElement;
        });
        return { ...sl, elements };
      });
      if (!mutated) return {};
      return withHistory(s, { ...deck, slides });
    }),

  addElement: (slideId, element) =>
    set((s) => {
      const deck = s.currentDeck;
      if (!deck) return {};
      let inserted = false;
      const slides = deck.slides.map((sl) => {
        if (sl.id !== slideId) return sl;
        const maxZ = sl.elements.reduce((m, e) => Math.max(m, e.z ?? 0), 0);
        const withZ = { ...element, z: maxZ + 1 } as SlideElement;
        inserted = true;
        return { ...sl, elements: [...sl.elements, withZ] };
      });
      if (!inserted) return {};
      return withHistory(s, { ...deck, slides }, {
        selectedElementIds: [element.id],
        editingTextId: null,
      });
    }),

  deleteSelectedElements: () =>
    set((s) => {
      const deck = s.currentDeck;
      const slideId = s.currentSlideId;
      if (!deck || !slideId) return {};
      const ids = new Set(s.selectedElementIds);
      if (ids.size === 0) return {};
      let mutated = false;
      const slides = deck.slides.map((sl) => {
        if (sl.id !== slideId) return sl;
        const next = sl.elements.filter((el) => {
          if (!ids.has(el.id)) return true;
          if (el.locked) return true;
          mutated = true;
          return false;
        });
        return { ...sl, elements: next };
      });
      if (!mutated) return { selectedElementIds: [], editingTextId: null };
      return withHistory(s, { ...deck, slides }, {
        selectedElementIds: [],
        editingTextId: null,
      });
    }),

  addSlide: () =>
    set((s) => {
      const deck = s.currentDeck;
      if (!deck) return {};
      const ts = new Date().toISOString();
      const newSlide: Slide = {
        id: newId(),
        position: deck.slides.length,
        background: deck.slides[0]?.background ?? { type: 'solid', color: '#FFFFFF' },
        elements: [],
        createdAt: ts,
        updatedAt: ts,
      };
      return withHistory(
        s,
        { ...deck, slides: [...deck.slides, newSlide] },
        {
          currentSlideId: newSlide.id,
          selectedElementIds: [],
          editingTextId: null,
        },
      );
    }),

  duplicateCurrentSlide: () =>
    set((s) => {
      const deck = s.currentDeck;
      if (!deck || !s.currentSlideId) return {};
      const idx = deck.slides.findIndex((sl) => sl.id === s.currentSlideId);
      if (idx < 0) return {};
      const src = deck.slides[idx];
      const dup: Slide = {
        ...src,
        id: newId(),
        name: src.name ? `${src.name} copy` : undefined,
        elements: src.elements.map((el) => ({ ...el, id: newId() })),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      const slides = [
        ...deck.slides.slice(0, idx + 1),
        dup,
        ...deck.slides.slice(idx + 1),
      ].map((sl, i) => ({ ...sl, position: i }));
      return withHistory(s, { ...deck, slides }, {
        currentSlideId: dup.id,
        selectedElementIds: [],
        editingTextId: null,
      });
    }),

  deleteCurrentSlide: () =>
    set((s) => {
      const deck = s.currentDeck;
      if (!deck || !s.currentSlideId) return {};
      if (deck.slides.length <= 1) return {};
      const idx = deck.slides.findIndex((sl) => sl.id === s.currentSlideId);
      if (idx < 0) return {};
      const slides = deck.slides
        .filter((_, i) => i !== idx)
        .map((sl, i) => ({ ...sl, position: i }));
      const nextIdx = Math.min(idx, slides.length - 1);
      return withHistory(s, { ...deck, slides }, {
        currentSlideId: slides[nextIdx].id,
        selectedElementIds: [],
        editingTextId: null,
      });
    }),

  moveSlide: (fromIndex, toIndex) =>
    set((s) => {
      const deck = s.currentDeck;
      if (!deck) return {};
      const len = deck.slides.length;
      const from = Math.max(0, Math.min(len - 1, fromIndex));
      const to = Math.max(0, Math.min(len - 1, toIndex));
      if (from === to) return {};
      const next = [...deck.slides];
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      const slides = next.map((sl, i) => ({ ...sl, position: i }));
      return withHistory(s, { ...deck, slides });
    }),

  // ── History actions ─────────────────────────────────────────────────
  beginHistory: () =>
    set((s) => {
      if (s._txDepth > 0) return { _txDepth: s._txDepth + 1 };
      return { _txDepth: 1, _txPre: s.currentDeck };
    }),

  endHistory: () =>
    set((s) => {
      if (s._txDepth <= 0) return {};
      if (s._txDepth > 1) return { _txDepth: s._txDepth - 1 };
      const pre = s._txPre;
      // Commit one history entry iff the deck actually changed.
      if (pre && s.currentDeck && pre !== s.currentDeck) {
        const past = [...s.past, pre];
        if (past.length > HISTORY_LIMIT)
          past.splice(0, past.length - HISTORY_LIMIT);
        return { _txDepth: 0, _txPre: null, past, future: [] };
      }
      return { _txDepth: 0, _txPre: null };
    }),

  undo: () =>
    set((s) => {
      if (s.past.length === 0 || !s.currentDeck) return {};
      const prev = s.past[s.past.length - 1];
      const past = s.past.slice(0, -1);
      const future = [...s.future, s.currentDeck];
      // Keep currentSlideId valid against the restored deck.
      const stillThere = prev.slides.some((sl) => sl.id === s.currentSlideId);
      return {
        currentDeck: prev,
        past,
        future,
        currentSlideId: stillThere
          ? s.currentSlideId
          : prev.slides[0]?.id ?? null,
        selectedElementIds: [],
        editingTextId: null,
      };
    }),

  redo: () =>
    set((s) => {
      if (s.future.length === 0 || !s.currentDeck) return {};
      const next = s.future[s.future.length - 1];
      const future = s.future.slice(0, -1);
      const past = [...s.past, s.currentDeck];
      const stillThere = next.slides.some((sl) => sl.id === s.currentSlideId);
      return {
        currentDeck: next,
        past,
        future,
        currentSlideId: stillThere
          ? s.currentSlideId
          : next.slides[0]?.id ?? null,
        selectedElementIds: [],
        editingTextId: null,
      };
    }),
}));

// Local helper for slide actions — keeps `defaults.ts` import out of the
// module top-level type cycle and lets us regenerate ids without pulling in
// the whole factory layer.
const newId = (): ID => {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return 'id-' + Math.random().toString(36).slice(2) + Date.now().toString(36);
};

// ──────────────────────────────────────────────────────────────────────────
// Granular selector hooks
//
// Each hook subscribes to the smallest possible slice so consumers only
// rerender when their slice changes. Use these instead of calling
// `useDeckStore(s => …)` ad-hoc at call sites.
// ──────────────────────────────────────────────────────────────────────────

export const useCurrentDeck = () => useDeckStore((s) => s.currentDeck);
export const useCurrentSlideId = () => useDeckStore((s) => s.currentSlideId);
export const useZoom = () => useDeckStore((s) => s.zoom);
export const useEditorMode = () => useDeckStore((s) => s.editorMode);
export const useEditingTextId = () => useDeckStore((s) => s.editingTextId);
export const useCanUndo = () => useDeckStore((s) => s.past.length > 0);
export const useCanRedo = () => useDeckStore((s) => s.future.length > 0);

/** Selected element ids as a stable array reference (shallow-compared). */
export const useSelectedElementIds = () =>
  useDeckStore(useShallow((s) => s.selectedElementIds));

/** Convenience: is this single element id currently selected? */
export const useIsElementSelected = (elementId: ID) =>
  useDeckStore((s) => s.selectedElementIds.includes(elementId));

/** Resolve the current Slide object from the current deck + slide id. */
export const useCurrentSlide = (): Slide | null =>
  useDeckStore((s) => {
    if (!s.currentDeck || !s.currentSlideId) return null;
    return s.currentDeck.slides.find((sl) => sl.id === s.currentSlideId) ?? null;
  });

/**
 * Stable actions object. Actions never change identity in Zustand, so this
 * never causes rerenders. Use when a component needs several actions.
 */
export const useDeckActions = () =>
  useDeckStore(
    useShallow((s) => ({
      setDeck: s.setDeck,
      setCurrentSlide: s.setCurrentSlide,
      selectElement: s.selectElement,
      clearSelection: s.clearSelection,
      setZoom: s.setZoom,
      setEditorMode: s.setEditorMode,
      updateElement: s.updateElement,
      setEditingText: s.setEditingText,
      addElement: s.addElement,
      deleteSelectedElements: s.deleteSelectedElements,
      addSlide: s.addSlide,
      duplicateCurrentSlide: s.duplicateCurrentSlide,
      deleteCurrentSlide: s.deleteCurrentSlide,
      moveSlide: s.moveSlide,
      beginHistory: s.beginHistory,
      endHistory: s.endHistory,
      undo: s.undo,
      redo: s.redo,
    })),
  );
