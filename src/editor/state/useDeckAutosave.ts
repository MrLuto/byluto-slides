/**
 * useDeckAutosave — Phase 3L.
 *
 * Lives at the editor state layer (NOT inside any render-only component) so
 * `DataSlideRenderer` and the legacy showcase stay pure.
 *
 * Behavior:
 *  - Subscribes only to `currentDeck` from the store. UI-only state
 *    (selection, zoom, editor mode, text-edit id) and history (`past` /
 *    `future`) are NOT persisted.
 *  - Debounces writes by 750ms so a drag/resize burst collapses into one
 *    write.
 *  - On mount: reads `localStorage`, runs the JSON through `safeParseDeck`
 *    and only calls `setDeck` if Zod validates it. Invalid/missing data
 *    falls back to the provided `fallbackDeck` (the in-repo `mockDeck`).
 *
 * Returns `{ status, reset }` for a status indicator + reset-to-mock button.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import type { Deck } from '@/editor/model/types';
import { safeParseDeck } from '@/editor/model/schema';
import { useCurrentDeck, useDeckActions } from './deckStore';

const STORAGE_KEY = 'lovable.devMockDeck.v1';
const DEBOUNCE_MS = 750;

export type AutosaveStatus = 'idle' | 'saving' | 'saved' | 'error';

export function useDeckAutosave(fallbackDeck: Deck) {
  const deck = useCurrentDeck();
  const { setDeck } = useDeckActions();
  const [status, setStatus] = useState<AutosaveStatus>('idle');
  const hydratedRef = useRef(false);
  const timerRef = useRef<number | null>(null);

  // ── Hydrate once on mount ─────────────────────────────────────────────
  useEffect(() => {
    if (hydratedRef.current) return;
    hydratedRef.current = true;
    let next: Deck = fallbackDeck;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = safeParseDeck(JSON.parse(raw));
        if (parsed.success) {
          next = parsed.data as unknown as Deck;
        }
      }
    } catch {
      // ignore — fall through to mockDeck
    }
    setDeck(next);
    setStatus('saved');
  }, [fallbackDeck, setDeck]);

  // ── Debounced autosave on deck changes ────────────────────────────────
  useEffect(() => {
    if (!hydratedRef.current || !deck) return;
    setStatus('saving');
    if (timerRef.current) window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(deck));
        setStatus('saved');
      } catch {
        setStatus('error');
      }
    }, DEBOUNCE_MS);
    return () => {
      if (timerRef.current) window.clearTimeout(timerRef.current);
    };
  }, [deck]);

  const reset = useCallback(() => {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      /* noop */
    }
    setDeck(fallbackDeck);
    setStatus('saved');
  }, [fallbackDeck, setDeck]);

  return { status, reset };
}
