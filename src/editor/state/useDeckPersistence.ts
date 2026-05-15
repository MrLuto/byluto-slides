/**
 * useDeckPersistence — Phase 5A.
 *
 * Replaces the local-only `useDeckAutosave`. Strategy:
 *
 *   • If `deckId` is provided AND the user has an authenticated Supabase
 *     session → load from `decks.data` and autosave to Supabase.
 *   • Otherwise → fall back to localStorage (one shared key, like before).
 *
 * The hook keeps a `mode` so the UI can show whether we're talking to the
 * cloud or to the browser. Save status is optimistic: it flips to
 * `saving` immediately on deck changes, then resolves to `saved` or
 * `error` after the debounced flush.
 *
 * Undo/redo and the full editor store stay 100% local — only the
 * `currentDeck` snapshot is persisted, never `past` / `future` /
 * selection / zoom.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import type { Deck } from '@/editor/model/types';
import { safeParseDeck } from '@/editor/model/schema';
import { supabase } from '@/integrations/supabase/client';
import { loadDeck, updateDeck } from '@/integrations/supabase/decks';
import { useCurrentDeck, useDeckActions } from './deckStore';

const LOCAL_KEY = 'lovable.devMockDeck.v1';
const DEBOUNCE_MS = 750;

export type AutosaveStatus = 'idle' | 'saving' | 'saved' | 'error';
export type PersistenceMode = 'cloud' | 'local';

interface Options {
  /** When set + user authed, we load/save this row in `decks`. */
  deckId?: string;
  /** Used when no cloud row + no local backup is found. */
  fallbackDeck: Deck;
}

export function useDeckPersistence({ deckId, fallbackDeck }: Options) {
  const deck = useCurrentDeck();
  const { setDeck } = useDeckActions();
  const [status, setStatus] = useState<AutosaveStatus>('idle');
  const [mode, setMode] = useState<PersistenceMode>('local');
  const [error, setError] = useState<string | null>(null);
  const [title, setTitleState] = useState<string>(fallbackDeck.title);

  const hydratedRef = useRef(false);
  const timerRef = useRef<number | null>(null);
  const sessionRef = useRef<Session | null>(null);
  const deckIdRef = useRef<string | undefined>(deckId);
  deckIdRef.current = deckId;

  // ── Hydrate once ──────────────────────────────────────────────────────
  useEffect(() => {
    if (hydratedRef.current) return;
    hydratedRef.current = true;

    (async () => {
      const { data } = await supabase.auth.getSession();
      sessionRef.current = data.session;

      // Try cloud first when both deckId + session are present.
      if (deckId && data.session) {
        try {
          const loaded = await loadDeck(deckId);
          if (loaded) {
            setDeck(loaded.deck);
            setTitleState(loaded.row.title);
            setMode('cloud');
            setStatus('saved');
            return;
          }
          setError('Deck not found or invalid');
        } catch (e) {
          setError((e as Error).message);
        }
      }

      // Local fallback path.
      let next: Deck = fallbackDeck;
      try {
        const raw = localStorage.getItem(LOCAL_KEY);
        if (raw) {
          const parsed = safeParseDeck(JSON.parse(raw));
          if (parsed.success) next = parsed.data as unknown as Deck;
        }
      } catch {
        /* ignore */
      }
      setDeck(next);
      setTitleState(next.title);
      setMode('local');
      setStatus('saved');
    })();
  }, [deckId, fallbackDeck, setDeck]);

  // ── Keep title state synced with deck.title when deck changes ─────────
  useEffect(() => {
    if (deck && deck.title !== title) setTitleState(deck.title);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deck?.title]);

  // ── Debounced autosave ────────────────────────────────────────────────
  useEffect(() => {
    if (!hydratedRef.current || !deck) return;
    setStatus('saving');
    if (timerRef.current) window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(async () => {
      try {
        if (mode === 'cloud' && deckIdRef.current) {
          await updateDeck(deckIdRef.current, { deck, title: deck.title });
        } else {
          localStorage.setItem(LOCAL_KEY, JSON.stringify(deck));
        }
        setStatus('saved');
        setError(null);
      } catch (e) {
        setStatus('error');
        setError((e as Error).message);
      }
    }, DEBOUNCE_MS);
    return () => {
      if (timerRef.current) window.clearTimeout(timerRef.current);
    };
  }, [deck, mode]);

  /** Edit the deck title locally; autosave will flush it. */
  const setTitle = useCallback(
    (next: string) => {
      setTitleState(next);
      if (deck) setDeck({ ...deck, title: next });
    },
    [deck, setDeck],
  );

  const reset = useCallback(() => {
    try {
      localStorage.removeItem(LOCAL_KEY);
    } catch {
      /* noop */
    }
    setDeck(fallbackDeck);
    setTitleState(fallbackDeck.title);
    setStatus('saved');
  }, [fallbackDeck, setDeck]);

  return { status, mode, error, title, setTitle, reset };
}
