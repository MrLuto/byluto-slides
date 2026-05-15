/**
 * EditorTopBar — Phase 4B chrome.
 *
 * Single grouped top toolbar for the dev editor. Replaces the previous
 * stacked IOToolbar + InsertToolbar. Pure UI refactor: all actions still
 * call the existing store actions (addElement, deleteSelectedElements,
 * undo, redo, setDeck) and the existing IO helpers. No new behavior.
 *
 * Groups (left → right):
 *   1. File:    Import / Export / Copy JSON
 *   2. History: Undo / Redo
 *   3. Insert:  Text / Rectangle / Ellipse / Image
 *   4. Edit:    Delete selected
 */
import React, { useRef, useState } from 'react';
import {
  Copy,
  Download,
  Image as ImageIcon,
  Keyboard,
  Redo2,
  Square,
  Circle as CircleIcon,
  Trash2,
  Type,
  Undo2,
  Upload,
} from 'lucide-react';
import { ShortcutsDialog } from '@/editor/rendering/ShortcutsDialog';
import {
  createImageElement,
  createShapeElement,
  createTextElement,
} from '@/editor/model/defaults';
import { safeParseDeck } from '@/editor/model/schema';
import {
  useCanRedo,
  useCanUndo,
  useCurrentDeck,
  useCurrentSlideId,
  useDeckActions,
  useSelectedElementIds,
} from '@/editor/state/deckStore';

const PLACEHOLDER_IMAGE_SRC =
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 600">
      <rect width="800" height="600" fill="#E2E8F0"/>
      <path d="M0 0l800 600M800 0L0 600" stroke="#94A3B8" stroke-width="2"/>
      <text x="400" y="310" font-family="IBM Plex Sans, sans-serif" font-size="48"
        fill="#475569" text-anchor="middle">Image</text>
    </svg>`,
  );

export interface EditorTopBarProps {
  /** Editable deck title shown next to the brand. Falls back to deck.title. */
  title?: string;
  onTitleChange?: (next: string) => void;
  /** Persistence indicator shown in the brand chip. */
  mode?: 'cloud' | 'local';
}

export function EditorTopBar({ title, onTitleChange, mode }: EditorTopBarProps = {}) {
  const slideId = useCurrentSlideId();
  const deck = useCurrentDeck();
  const selected = useSelectedElementIds();
  const canUndo = useCanUndo();
  const canRedo = useCanRedo();
  const {
    addElement,
    deleteSelectedElements,
    undo,
    redo,
    setDeck,
  } = useDeckActions();

  const fileRef = useRef<HTMLInputElement>(null);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [msg, setMsg] = useState<{ kind: 'ok' | 'err'; text: string } | null>(
    null,
  );
  const flash = (m: typeof msg) => {
    setMsg(m);
    if (m) window.setTimeout(() => setMsg(null), 3500);
  };

  // ── File / IO ────────────────────────────────────────────────────────
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
      flash({ kind: 'ok', text: 'Copied to clipboard' });
    } catch {
      flash({ kind: 'err', text: 'Clipboard copy failed' });
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
    setDeck(result.data as unknown as Parameters<typeof setDeck>[0]);
    flash({ kind: 'ok', text: 'Imported deck' });
  };

  // ── Insert ───────────────────────────────────────────────────────────
  const insertText = () =>
    slideId && addElement(slideId, createTextElement({ text: 'New text' }));
  const insertRect = () =>
    slideId && addElement(slideId, createShapeElement({ shape: 'rectangle' }));
  const insertCircle = () =>
    slideId &&
    addElement(
      slideId,
      createShapeElement({ shape: 'ellipse', width: 320, height: 320 }),
    );
  const insertImage = () =>
    slideId &&
    addElement(
      slideId,
      createImageElement({ src: PLACEHOLDER_IMAGE_SRC, fit: 'cover' }),
    );

  return (
    <div className="flex items-center gap-1 h-12 px-3 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <div className="text-sm font-semibold tracking-tight pr-3 mr-1 border-r border-border h-6 flex items-center">
        SlideForge
        <span className="ml-2 px-1.5 py-0.5 text-[10px] font-mono uppercase tracking-wider rounded bg-muted text-muted-foreground">
          dev
        </span>
      </div>

      <Group label="File">
        <ToolButton onClick={() => fileRef.current?.click()} title="Import JSON">
          <Upload className="h-4 w-4" />
        </ToolButton>
        <ToolButton onClick={handleExport} title="Export JSON" disabled={!deck}>
          <Download className="h-4 w-4" />
        </ToolButton>
        <ToolButton onClick={handleCopy} title="Copy JSON" disabled={!deck}>
          <Copy className="h-4 w-4" />
        </ToolButton>
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
      </Group>

      <Divider />

      <Group label="History">
        <ToolButton onClick={undo} disabled={!canUndo} title="Undo (⌘Z)">
          <Undo2 className="h-4 w-4" />
        </ToolButton>
        <ToolButton onClick={redo} disabled={!canRedo} title="Redo (⌘⇧Z)">
          <Redo2 className="h-4 w-4" />
        </ToolButton>
      </Group>

      <Divider />

      <Group label="Insert">
        <ToolButton onClick={insertText} title="Text">
          <Type className="h-4 w-4" />
        </ToolButton>
        <ToolButton onClick={insertRect} title="Rectangle">
          <Square className="h-4 w-4" />
        </ToolButton>
        <ToolButton onClick={insertCircle} title="Ellipse">
          <CircleIcon className="h-4 w-4" />
        </ToolButton>
        <ToolButton onClick={insertImage} title="Image">
          <ImageIcon className="h-4 w-4" />
        </ToolButton>
      </Group>

      <Divider />

      <Group label="Edit">
        <ToolButton
          onClick={deleteSelectedElements}
          disabled={selected.length === 0}
          title="Delete selected (Del)"
          danger
        >
          <Trash2 className="h-4 w-4" />
        </ToolButton>
      </Group>

      <div className="ml-auto flex items-center gap-2">
        {msg && (
          <span
            className={
              'text-xs font-mono px-2 py-1 rounded ' +
              (msg.kind === 'ok'
                ? 'text-emerald-600 bg-emerald-500/10'
                : 'text-destructive bg-destructive/10')
            }
          >
            {msg.text}
          </span>
        )}
        <ToolButton
          onClick={() => setShortcutsOpen(true)}
          title="Keyboard shortcuts (?)"
        >
          <Keyboard className="h-4 w-4" />
        </ToolButton>
      </div>
      <ShortcutsDialog open={shortcutsOpen} onOpenChange={setShortcutsOpen} />
    </div>
  );
}

// ── primitives ─────────────────────────────────────────────────────────

function Group({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center" aria-label={label}>
      {children}
    </div>
  );
}

function Divider() {
  return <span className="mx-2 h-5 w-px bg-border" aria-hidden />;
}

function ToolButton({
  children,
  onClick,
  disabled,
  title,
  danger,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  title?: string;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      aria-label={title}
      className={
        'h-8 w-8 inline-flex items-center justify-center rounded-md ' +
        'text-muted-foreground hover:text-foreground ' +
        'hover:bg-muted active:bg-muted/80 ' +
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background ' +
        'disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-muted-foreground disabled:cursor-not-allowed ' +
        'transition-colors ' +
        (danger ? 'hover:text-destructive ' : '')
      }
    >
      {children}
    </button>
  );
}
