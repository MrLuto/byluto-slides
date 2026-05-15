/**
 * DeckPicker — Phase 5A.
 *
 * Lightweight library page: lists the current user's cloud decks and lets
 * them open or create one. When unauthenticated, shows a sign-in form
 * (email + password) so the rest of the cloud flow becomes usable. New
 * decks are seeded from `mockDeck` with a fresh id + ISO timestamps.
 */
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, FileText, LogOut } from 'lucide-react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import {
  createDeck,
  deleteDeck,
  listUserDecks,
  type DeckSummary,
} from '@/integrations/supabase/decks';
import { mockDeck } from '@/editor/model/mockDeck';
import type { Deck } from '@/editor/model/types';

const newId = (): string =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : 'id-' + Math.random().toString(36).slice(2) + Date.now().toString(36);

export default function DeckPicker() {
  const nav = useNavigate();
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(false);
  const [decks, setDecks] = useState<DeckSummary[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setReady(true);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      setSession(s);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!session) return;
    setBusy(true);
    listUserDecks()
      .then(setDecks)
      .catch((e) => setError((e as Error).message))
      .finally(() => setBusy(false));
  }, [session]);

  const handleCreate = async () => {
    setError(null);
    setBusy(true);
    try {
      const ts = new Date().toISOString();
      const seed: Deck = {
        ...mockDeck,
        id: newId(),
        title: 'Untitled deck',
        createdAt: ts,
        updatedAt: ts,
        slides: mockDeck.slides.map((s) => ({
          ...s,
          id: newId(),
          elements: s.elements.map((e) => ({ ...e, id: newId() })),
          createdAt: ts,
          updatedAt: ts,
        })),
      };
      const row = await createDeck(seed);
      nav(`/decks/${row.id}`);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this deck? This cannot be undone.')) return;
    try {
      await deleteDeck(id);
      setDecks((d) => d.filter((x) => x.id !== id));
    } catch (e) {
      setError((e as Error).message);
    }
  };

  if (!ready) {
    return (
      <Shell>
        <div className="text-sm text-muted-foreground">Loading…</div>
      </Shell>
    );
  }

  if (!session) {
    return (
      <Shell>
        <SignInForm onError={setError} />
        {error && <ErrorBox text={error} />}
      </Shell>
    );
  }

  return (
    <Shell
      right={
        <button
          onClick={() => supabase.auth.signOut()}
          className="inline-flex items-center gap-1.5 h-8 px-3 text-xs rounded-md border border-border hover:bg-muted transition-colors"
        >
          <LogOut className="h-3.5 w-3.5" />
          Sign out
        </button>
      }
    >
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">Your decks</h1>
        <button
          onClick={handleCreate}
          disabled={busy}
          className="inline-flex items-center gap-2 h-9 px-3 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors"
        >
          <Plus className="h-4 w-4" />
          New deck
        </button>
      </div>

      {error && <ErrorBox text={error} />}

      {decks.length === 0 ? (
        <div className="border border-dashed border-border rounded-lg p-12 text-center">
          <FileText className="h-8 w-8 mx-auto text-muted-foreground mb-3" />
          <div className="text-sm font-medium mb-1">No decks yet</div>
          <div className="text-xs text-muted-foreground">
            Create your first deck to start editing.
          </div>
        </div>
      ) : (
        <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {decks.map((d) => (
            <li
              key={d.id}
              className="group border border-border rounded-lg p-4 hover:border-primary/50 hover:shadow-sm transition-all bg-card"
            >
              <button
                onClick={() => nav(`/decks/${d.id}`)}
                className="w-full text-left"
              >
                <div className="aspect-video w-full rounded-md bg-muted/50 mb-3 flex items-center justify-center">
                  <FileText className="h-6 w-6 text-muted-foreground" />
                </div>
                <div className="text-sm font-medium truncate">{d.title}</div>
                <div className="text-[11px] font-mono text-muted-foreground mt-0.5">
                  Updated {new Date(d.updatedAt).toLocaleString()}
                </div>
              </button>
              <button
                onClick={() => handleDelete(d.id)}
                className="mt-2 text-[11px] text-muted-foreground hover:text-destructive transition-colors"
              >
                Delete
              </button>
            </li>
          ))}
        </ul>
      )}
    </Shell>
  );
}

function Shell({
  children,
  right,
}: {
  children: React.ReactNode;
  right?: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border">
        <div className="max-w-5xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold tracking-tight">SlideForge</span>
            <span className="px-1.5 py-0.5 text-[10px] font-mono uppercase tracking-wider rounded bg-muted text-muted-foreground">
              library
            </span>
          </div>
          {right}
        </div>
      </header>
      <main className="max-w-5xl mx-auto px-6 py-10">{children}</main>
    </div>
  );
}

function ErrorBox({ text }: { text: string }) {
  return (
    <div className="mb-4 text-xs text-destructive bg-destructive/10 border border-destructive/30 rounded-md px-3 py-2 font-mono">
      {text}
    </div>
  );
}

function SignInForm({ onError }: { onError: (e: string | null) => void }) {
  const [mode, setMode] = useState<'in' | 'up'>('in');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    onError(null);
    try {
      const fn =
        mode === 'in'
          ? supabase.auth.signInWithPassword({ email, password })
          : supabase.auth.signUp({
              email,
              password,
              options: { emailRedirectTo: `${window.location.origin}/decks` },
            });
      const { error } = await fn;
      if (error) onError(error.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <form
      onSubmit={submit}
      className="max-w-sm mx-auto border border-border rounded-lg p-6 space-y-3"
    >
      <h1 className="text-lg font-semibold tracking-tight">
        {mode === 'in' ? 'Sign in' : 'Create account'}
      </h1>
      <p className="text-xs text-muted-foreground">
        Save and load decks from your cloud library.
      </p>
      <input
        type="email"
        required
        autoComplete="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="you@example.com"
        className="w-full h-9 px-3 text-sm rounded-md border border-border bg-background focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      />
      <input
        type="password"
        required
        minLength={6}
        autoComplete={mode === 'in' ? 'current-password' : 'new-password'}
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="Password"
        className="w-full h-9 px-3 text-sm rounded-md border border-border bg-background focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      />
      <button
        type="submit"
        disabled={busy}
        className="w-full h-9 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors"
      >
        {busy ? '…' : mode === 'in' ? 'Sign in' : 'Sign up'}
      </button>
      <button
        type="button"
        onClick={() => setMode(mode === 'in' ? 'up' : 'in')}
        className="w-full text-xs text-muted-foreground hover:text-foreground transition-colors"
      >
        {mode === 'in'
          ? "Don't have an account? Sign up"
          : 'Already have an account? Sign in'}
      </button>
    </form>
  );
}
