import { Link } from 'react-router-dom';
import { BookOpen } from 'lucide-react';
import { cn } from '../lib/utils';

/** Next to a page title: opens the chapter of the guide about that page. */
export const GuideLink = ({ chapter, className }: { chapter: string; className?: string }) => (
  <Link
    to={`/guida/${chapter}`}
    title="Apri la guida di questa pagina"
    className={cn(
      'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-medium shrink-0 transition-colors text-on-page-muted hover:text-on-page',
      className,
    )}
    style={{ borderColor: 'var(--color-card-border)' }}
  >
    <BookOpen className="w-3.5 h-3.5" /> Guida
  </Link>
);
