import React, { useEffect, useMemo, useState } from 'react';
import { Link, Navigate, useLocation, useParams } from 'react-router-dom';
import { useGetSettings } from '@workspace/api-client-react';
import { ArrowLeft, ArrowRight, BookOpen, ChevronRight, Loader2, Printer, Search } from 'lucide-react';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { useAuth } from '../lib/auth-context';
import { GUIDE, type GuideChapter } from '../guide/content';
import { AdminBadge, GuidePrintContext } from '../guide/ui';
import '../guide/guide.css';

/** The chapters (and topics) this login may read: same rules as the menu. */
function useGuideChapters(): GuideChapter[] {
  const { isAdmin, can } = useAuth();
  return useMemo(
    () =>
      GUIDE.filter(ch => (!ch.adminOnly || isAdmin) && (!ch.section || can(ch.section))).map(ch => ({
        ...ch,
        topics: ch.topics.filter(t => !t.adminOnly || isAdmin),
      })),
    [isAdmin, can],
  );
}

const normalize = (text: string) =>
  text.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

/** "sconto" also finds "sconti", "formula" also "formule": drop the ending of longer words. */
const stem = (word: string) => (word.length > 4 ? word.replace(/[aeiou]$/, '') : word);

/** The page scrolls inside <main>, not the window. */
function scrollMainToTop() {
  document.querySelector('main')?.scrollTo({ top: 0 });
}

const ChapterIcon = ({ chapter, size = 'md' }: { chapter: GuideChapter; size?: 'md' | 'lg' }) => (
  <span
    className={size === 'lg' ? 'w-14 h-14 rounded-2xl flex items-center justify-center shrink-0' : 'w-11 h-11 rounded-xl flex items-center justify-center shrink-0'}
    style={{ backgroundColor: 'var(--color-brand-icon-bg)', color: 'var(--color-brand-icon-color)' }}
  >
    <chapter.icon className={size === 'lg' ? 'w-7 h-7' : 'w-5 h-5'} />
  </span>
);

// ── Index ─────────────────────────────────────────────────────────────────────

export const GuideIndex = () => {
  const chapters = useGuideChapters();
  const [query, setQuery] = useState('');

  const results = useMemo(() => {
    const words = normalize(query).split(/\s+/).filter(Boolean).map(stem);
    if (words.length === 0) return null;
    return chapters.flatMap(ch =>
      ch.topics
        .filter(t => {
          const haystack = normalize(`${ch.title} ${t.title} ${t.keywords ?? ''}`);
          return words.every(w => haystack.includes(w));
        })
        .map(t => ({ chapter: ch, topic: t })),
    );
  }, [chapters, query]);

  useEffect(scrollMainToTop, []);

  return (
    <div className="flex flex-col gap-6 page-enter">
      <section>
        <span className="text-on-page-muted text-sm font-medium tracking-wide uppercase">Aiuto</span>
        <h1 className="text-3xl font-serif text-on-page mt-1">Guida all'uso</h1>
        <p className="text-on-page-muted mt-2 max-w-2xl">
          Come si usa Lumii, pagina per pagina. Scegli un capitolo o cerca quello che ti serve.
        </p>
      </section>

      <div className="relative">
        <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
        <input
          type="search"
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Cerca: formula, sconto, password…"
          className="w-full bg-white border border-stone-200 rounded-xl py-3 pl-10 pr-4 outline-none focus:border-brand-dark focus:ring-1 focus:ring-brand-dark transition-all shadow-sm"
        />
      </div>

      {results ? (
        <div className="bg-white rounded-2xl border border-stone-100 shadow-sm overflow-hidden divide-y divide-stone-100">
          {results.length === 0 && (
            <p className="p-6 text-center text-stone-500">
              Nessun argomento trovato. Prova con un'altra parola, oppure sfoglia i capitoli.
            </p>
          )}
          {results.map(({ chapter, topic }) => (
            <Link
              key={`${chapter.id}-${topic.id}`}
              to={`/guida/${chapter.id}#${topic.id}`}
              className="flex items-center gap-3 px-5 py-3.5 hover:bg-stone-50 transition-colors"
            >
              <chapter.icon className="w-4 h-4 shrink-0 text-stone-400" />
              <span className="flex-1 min-w-0">
                <span className="block text-xs text-stone-500">{chapter.title}</span>
                <span className="block font-medium text-stone-900">{topic.title}</span>
              </span>
              <ChevronRight className="w-4 h-4 shrink-0 text-stone-300" />
            </Link>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {chapters.map((ch, i) => (
            <Link
              key={ch.id}
              to={`/guida/${ch.id}`}
              className="bg-white p-4 rounded-2xl shadow-sm border border-stone-100 flex items-center gap-4 hover:border-brand-dark/30 hover:shadow-md transition-all active:scale-[0.98]"
            >
              <ChapterIcon chapter={ch} />
              <span className="flex-1 min-w-0">
                <span className="block font-semibold text-stone-900">
                  <span className="text-stone-400 font-normal mr-1.5">{i + 1}.</span>{ch.title}
                </span>
                <span className="block text-sm text-stone-500 leading-snug mt-0.5">{ch.summary}</span>
              </span>
              <ChevronRight className="w-5 h-5 shrink-0 text-stone-300" />
            </Link>
          ))}
        </div>
      )}

      <Link
        to="/guida/stampa"
        className="self-start flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium border border-stone-200 bg-white text-stone-700 hover:bg-stone-50 transition-colors"
      >
        <Printer className="w-4 h-4" /> Stampa o salva in PDF
      </Link>
    </div>
  );
};

// ── One chapter ───────────────────────────────────────────────────────────────

const Topics = ({ chapter, idPrefix = '' }: { chapter: GuideChapter; idPrefix?: string }) => (
  <>
    {chapter.topics.map(topic => (
      <section
        key={topic.id}
        id={idPrefix + topic.id}
        className="guide-topic guide-card bg-white rounded-2xl border border-stone-100 shadow-sm p-5 md:p-7 scroll-mt-4 text-stone-700 text-base"
      >
        <h2 className="text-xl font-serif text-stone-900 leading-snug flex flex-wrap items-center gap-x-3 gap-y-1">
          {topic.title}
          {topic.adminOnly && <AdminBadge />}
        </h2>
        {topic.body}
      </section>
    ))}
  </>
);

export const GuideChapterPage = () => {
  const { chapterId } = useParams();
  const { hash } = useLocation();
  const chapters = useGuideChapters();
  const index = chapters.findIndex(ch => ch.id === chapterId);
  const chapter = chapters[index];

  // Open at the requested topic (links from search and from other chapters), otherwise at the top
  const shownId = chapter?.id;
  useEffect(() => {
    if (!shownId) return;
    const target = hash ? document.getElementById(decodeURIComponent(hash.slice(1))) : null;
    // Instant: <main> scrolls smoothly, and a long animated scroll can stop short
    if (target) target.scrollIntoView({ block: 'start', behavior: 'instant' });
    else scrollMainToTop();
  }, [shownId, hash]);

  if (!chapter) return <Navigate to="/guida" replace />;
  const prev = chapters[index - 1];
  const next = chapters[index + 1];

  return (
    <div className="guide-doc flex flex-col gap-5 page-enter" key={chapter.id}>
      <Link to="/guida" className="guide-noprint self-start flex items-center gap-1.5 text-sm font-medium text-on-page-muted hover:text-on-page transition-colors">
        <ArrowLeft className="w-4 h-4" /> Tutta la guida
      </Link>

      <header className="flex items-center gap-4">
        <ChapterIcon chapter={chapter} size="lg" />
        <div className="min-w-0">
          <span className="text-on-page-muted text-sm font-medium tracking-wide uppercase">Capitolo {index + 1}</span>
          <h1 className="text-3xl font-serif text-on-page leading-tight">{chapter.title}</h1>
        </div>
      </header>
      <p className="text-on-page-muted -mt-1">{chapter.summary}</p>

      {chapter.topics.length > 1 && (
        <nav aria-label="In questo capitolo" className="guide-noprint bg-white rounded-2xl border border-stone-100 shadow-sm p-4 md:p-5">
          <p className="text-xs uppercase tracking-wider font-semibold text-stone-400 mb-2">In questo capitolo</p>
          <ul className="flex flex-col">
            {chapter.topics.map(topic => (
              <li key={topic.id}>
                <a
                  href={`#${topic.id}`}
                  onClick={e => {
                    e.preventDefault();
                    document.getElementById(topic.id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                  }}
                  className="flex items-center gap-2 py-1.5 text-stone-700 hover:text-stone-900"
                >
                  <ChevronRight className="w-4 h-4 shrink-0 text-stone-300" />
                  {topic.title}
                </a>
              </li>
            ))}
          </ul>
        </nav>
      )}

      <Topics chapter={chapter} />

      <div className="guide-noprint grid grid-cols-2 gap-3 mt-2">
        {prev ? (
          <Link to={`/guida/${prev.id}`} className="bg-white rounded-2xl border border-stone-100 shadow-sm p-4 hover:shadow-md transition-all">
            <span className="flex items-center gap-1 text-xs text-stone-400"><ArrowLeft className="w-3.5 h-3.5" /> Capitolo precedente</span>
            <span className="block font-medium text-stone-900 mt-1">{prev.title}</span>
          </Link>
        ) : <span />}
        {next ? (
          <Link to={`/guida/${next.id}`} className="bg-white rounded-2xl border border-stone-100 shadow-sm p-4 text-right hover:shadow-md transition-all">
            <span className="flex items-center justify-end gap-1 text-xs text-stone-400">Capitolo successivo <ArrowRight className="w-3.5 h-3.5" /></span>
            <span className="block font-medium text-stone-900 mt-1">{next.title}</span>
          </Link>
        ) : <span />}
      </div>
    </div>
  );
};

// ── Whole guide, to print or save as PDF ──────────────────────────────────────

export const GuidePrint = () => {
  const chapters = useGuideChapters();
  const { data: settings } = useGetSettings();
  const [imagesReady, setImagesReady] = useState(false);

  useEffect(scrollMainToTop, []);

  // Printing before the screenshots have arrived would leave holes in the PDF
  useEffect(() => {
    let cancelled = false;
    const check = () => {
      if (cancelled) return;
      const images = Array.from(document.querySelectorAll<HTMLImageElement>('.guide-doc img'));
      if (images.every(img => img.complete)) setImagesReady(true);
      else window.setTimeout(check, 300);
    };
    check();
    return () => { cancelled = true; };
  }, []);

  return (
    <GuidePrintContext.Provider value={true}>
      <div className="flex flex-col gap-5 page-enter">
        <div className="guide-noprint flex flex-wrap items-center justify-between gap-3">
          <Link to="/guida" className="flex items-center gap-1.5 text-sm font-medium text-on-page-muted hover:text-on-page transition-colors">
            <ArrowLeft className="w-4 h-4" /> Tutta la guida
          </Link>
          <button
            onClick={() => window.print()}
            disabled={!imagesReady}
            className="btn-brand flex items-center gap-2 text-white px-4 py-2.5 rounded-xl text-sm font-medium disabled:opacity-60"
          >
            {imagesReady ? <Printer className="w-4 h-4" /> : <Loader2 className="w-4 h-4 animate-spin" />}
            {imagesReady ? 'Stampa o salva in PDF' : 'Preparo le immagini…'}
          </button>
        </div>
        <p className="guide-noprint text-sm text-on-page-muted">
          Per avere un file, nella finestra di stampa scegli «Salva come PDF» come stampante.
        </p>

        <div className="guide-doc flex flex-col gap-5">
          <header className="guide-card bg-white rounded-2xl border border-stone-100 shadow-sm p-6 md:p-8">
            <div className="flex items-center gap-3 text-stone-500">
              <BookOpen className="w-5 h-5" />
              <span className="text-sm font-medium uppercase tracking-wide">{settings?.salonName ?? 'Lumii'}</span>
            </div>
            <h1 className="text-4xl font-serif text-stone-900 mt-3">Lumii · Guida all'uso</h1>
            <p className="text-stone-500 mt-2">Aggiornata al {format(new Date(), 'd MMMM yyyy', { locale: it })}</p>
            <ol className="mt-6 flex flex-col gap-1.5 text-stone-700">
              {chapters.map((ch, i) => (
                <li key={ch.id}><span className="text-stone-400 mr-2">{i + 1}.</span>{ch.title}</li>
              ))}
            </ol>
          </header>

          {chapters.map((ch, i) => (
            <div key={ch.id} className="guide-chapter flex flex-col gap-5">
              <div className="flex items-center gap-4 pt-4">
                <ChapterIcon chapter={ch} size="lg" />
                <div>
                  <span className="text-on-page-muted text-sm font-medium tracking-wide uppercase">Capitolo {i + 1}</span>
                  <h1 className="text-3xl font-serif text-on-page leading-tight">{ch.title}</h1>
                </div>
              </div>
              <Topics chapter={ch} idPrefix={`${ch.id}-`} />
            </div>
          ))}
        </div>
      </div>
    </GuidePrintContext.Provider>
  );
};
