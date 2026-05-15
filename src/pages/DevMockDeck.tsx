import { MockDeckPreview } from "@/editor/rendering/MockDeckPreview";

/**
 * Temporary dev-only page (Phase 2B).
 * Mounted at /dev/mock-deck via src/App.tsx.
 * Safe to delete once the data-driven renderer replaces the legacy app.
 */
export default function DevMockDeck() {
  return (
    <div className="min-h-screen w-full bg-background text-foreground flex flex-col">
      <header className="flex items-center justify-between border-b border-border px-6 py-3">
        <div className="flex items-center gap-3">
          <span className="rounded bg-yellow-400/20 text-yellow-700 dark:text-yellow-300 px-2 py-0.5 text-xs font-mono uppercase tracking-wider">
            Dev preview
          </span>
          <h1 className="text-sm font-medium">Mock deck — data-driven renderer</h1>
        </div>
        <a href="/" className="text-xs text-muted-foreground hover:underline">
          ← Back to app
        </a>
      </header>
      <main className="flex-1 min-h-0">
        <MockDeckPreview />
      </main>
    </div>
  );
}
