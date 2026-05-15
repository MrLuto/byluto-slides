/**
 * IOToolbar — Phase 3K.
 *
 * Dev-only JSON import/export controls for the mock editor. Lives at the
 * editor layer (NOT inside any render-only component) so DataSlideRenderer
 * stays pure.
 *
 * Validation: imported JSON is parsed with `JSON.parse`, then handed to
 * `safeParseDeck` (Zod) before it ever touches the store. If validation
 * fails we surface the first issue path + message and never call setDeck.
 *
 * On successful import, `setDeck` already (a) resets history, (b) selects
 * the first slide, and (c) clears selection + text-edit mode — see
 * `deckStore.setDeck`. So no extra reset wiring is required here.
 */
import React, { useRef, useState } from 'react';
import { safeParseDeck } from '@/editor/model/schema';
import { useCurrentDeck, useDeckActions } from '@/editor/state/deckStore';

export function IOToolbar() {
  const deck = useCurrentDeck();
  const { setDeck } = useDeckActions();
  const fileRef = useRef<HTMLInputElement>(null);
  const [msg, setMsg] = useState<{ kind: 'ok' | 'err'; text: string } | null>(
    null,
  );

  const flash = (m: { kind: 'ok' | 'err'; text: string }) => {
    setMsg(m);
    window.setTimeout(() => setMsg(null), 4000);
  };

  const handleExport = () => {
    if (!deck) return;
    const json = JSON.stringify(deck, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${deck.title || 'deck'}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleCopy = async () => {
    if (!deck) return;
    try {
      await navigator.clipboard.writeText(JSON.stringify(deck, null, 2));
      flash({ kind: 'ok', text: 'Copied JSON to clipboard.' });
    } catch {
      flash({ kind: 'err', text: 'Clipboard copy failed.' });
    }
  };

  const handleImportFile = async (file: File) => {
    let raw: unknown;
    try {
      raw = JSON.parse(await file.text());
    } catch (e) {
      flash({ kind: 'err', text: `Invalid JSON: ${(e as Error).message}` });
      return;
    }
    const result = safeParseDeck(raw);
    if (!result.success) {
      const issue = result.error.issues[0];
      const path = issue?.path.join('.') || '(root)';
      flash({
        kind: 'err',
        text: `Invalid deck: ${path} — ${issue?.message ?? 'unknown error'}`,
      });
      return;
    }
    // setDeck resets history, selects first slide, and clears selection.
    setDeck(result.data as unknown as Parameters<typeof setDeck>[0]);
    flash({ kind: 'ok', text: 'Imported deck.' });
  };

  const btn =
    'px-3 py-1 rounded border border-border text-sm hover:bg-accent disabled:opacity-40';

  return (
    <div className="flex items-center gap-2 p-2 border-b border-border bg-background">
      <span className="text-xs font-mono text-muted-foreground mr-1">JSON</span>
      <button className={btn} onClick={handleExport} disabled={!deck}>
        Export
      </button>
      <button className={btn} onClick={handleCopy} disabled={!deck}>
        Copy
      </button>
      <button className={btn} onClick={() => fileRef.current?.click()}>
        Import
      </button>
      <input
        ref={fileRef}
        type="file"
        accept="application/json,.json"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) void handleImportFile(f);
          e.target.value = '';
        }}
      />
      {msg && (
        <span
          className={
            'ml-2 text-xs font-mono ' +
            (msg.kind === 'ok' ? 'text-green-600' : 'text-destructive')
          }
        >
          {msg.text}
        </span>
      )}
    </div>
  );
}
