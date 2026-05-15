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
}

export const useDeckStore = create<DeckState>((set) => ({
  currentDeck: null,
  currentSlideId: null,
  selectedElementIds: [],
  zoom: 100,
  editorMode: 'edit',

  setDeck: (deck) =>
    set(() => ({
      currentDeck: deck,
      // When the deck changes, default to its first slide and clear selection.
      currentSlideId: deck?.slides[0]?.id ?? null,
      selectedElementIds: [],
    })),

  setCurrentSlide: (slideId) =>
    set(() => ({
      currentSlideId: slideId,
      // Selection is per-slide; clear when navigating between slides.
      selectedElementIds: [],
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
          // Discriminated-union safe merge: keep `type` from the original.
          return { ...el, ...patch, type: el.type } as SlideElement;
        });
        return { ...sl, elements };
      });
      if (!mutated) return {};
      return { currentDeck: { ...deck, slides } };
    }),
}));

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
    })),
  );
