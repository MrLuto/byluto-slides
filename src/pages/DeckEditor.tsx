/**
 * DeckEditor — Phase 5A.
 * Cloud-backed editor route. Reads `:id` from the URL and forwards it to
 * `MockDeckPreview`, which switches `useDeckPersistence` into cloud mode.
 */
import { useParams, Link } from 'react-router-dom';
import { MockDeckPreview } from '@/editor/rendering/MockDeckPreview';

export default function DeckEditor() {
  const { id } = useParams<{ id: string }>();
  return (
    <div className="h-screen w-full bg-background text-foreground flex flex-col overflow-hidden">
      <header className="flex items-center justify-between border-b border-border px-4 py-2">
        <Link
          to="/decks"
          className="text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          ← Library
        </Link>
      </header>
      <main className="flex-1 min-h-0">
        <MockDeckPreview deckId={id} />
      </main>
    </div>
  );
}
