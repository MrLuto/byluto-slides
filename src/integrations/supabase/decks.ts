/**
 * Deck CRUD helpers (Phase 5A).
 *
 * Thin wrappers around the Supabase `decks` table. The full editable Deck
 * JSON is stored in `decks.data` (jsonb). All reads run through
 * `safeParseDeck` so we never inject malformed shapes into the editor
 * store. Writes assume the caller has already produced a valid `Deck`.
 *
 * RLS requires `owner_id = auth.uid()` for inserts and updates, so every
 * mutation here also requires an authenticated session. Callers in Phase
 * 5A check `supabase.auth.getSession()` before invoking these.
 */
import { supabase } from './client';
import { safeParseDeck } from '@/editor/model/schema';
import type { Deck } from '@/editor/model/types';

export interface DeckRow {
  id: string;
  title: string;
  owner_id: string;
  created_at: string;
  updated_at: string;
  thumbnail_url: string | null;
}

export interface DeckSummary {
  id: string;
  title: string;
  updatedAt: string;
}

export interface LoadedDeck {
  row: DeckRow;
  deck: Deck;
}

/** List the current user's decks, newest-updated first. */
export async function listUserDecks(): Promise<DeckSummary[]> {
  const { data, error } = await supabase
    .from('decks')
    .select('id, title, updated_at')
    .order('updated_at', { ascending: false });
  if (error) throw error;
  return (data ?? []).map((r) => ({
    id: r.id,
    title: r.title,
    updatedAt: r.updated_at,
  }));
}

/**
 * Insert a new deck row owned by the current user. The provided `deck`
 * is stored verbatim in `data`; its `id` field is preserved so the
 * editor's local id matches the database row id.
 */
export async function createDeck(deck: Deck): Promise<DeckRow> {
  const { data: session } = await supabase.auth.getSession();
  const uid = session.session?.user.id;
  if (!uid) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('decks')
    .insert({
      id: deck.id,
      owner_id: uid,
      title: deck.title,
      data: deck as never,
    })
    .select('id, title, owner_id, created_at, updated_at, thumbnail_url')
    .single();
  if (error) throw error;
  return data as DeckRow;
}

/**
 * Load a deck by id and validate `data` through `safeParseDeck`. Returns
 * `null` if the row exists but its `data` is not a valid Deck shape.
 */
export async function loadDeck(id: string): Promise<LoadedDeck | null> {
  const { data, error } = await supabase
    .from('decks')
    .select('id, title, owner_id, created_at, updated_at, thumbnail_url, data')
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;

  const parsed = safeParseDeck(data.data);
  if (!parsed.success) return null;

  const { data: _omit, ...row } = data;
  return { row: row as DeckRow, deck: parsed.data as unknown as Deck };
}

/**
 * Update the title and/or full deck JSON for an existing row. `updated_at`
 * is set server-side via `now()`.
 */
export async function updateDeck(
  id: string,
  patch: { title?: string; deck?: Deck },
): Promise<void> {
  const update: {
    updated_at: string;
    title?: string;
    data?: never;
  } = { updated_at: new Date().toISOString() };
  if (patch.title !== undefined) update.title = patch.title;
  if (patch.deck !== undefined) update.data = patch.deck as never;

  const { error } = await supabase.from('decks').update(update).eq('id', id);
  if (error) throw error;
}

export async function deleteDeck(id: string): Promise<void> {
  const { error } = await supabase.from('decks').delete().eq('id', id);
  if (error) throw error;
}
