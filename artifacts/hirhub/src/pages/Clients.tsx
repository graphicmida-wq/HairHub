import React, { useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { store } from '../lib/store';
import { useListClients, type Client } from '@workspace/api-client-react';
import { Search, UserPlus, Phone, SearchX, Loader2, AlertCircle } from 'lucide-react';
import { ClientDetailsModal } from '../components/ClientDetailsModal';
import { EditClientModal } from '../components/EditClientModal';
import { cn, compareText } from '../lib/utils';

type SortBy = 'nome' | 'cognome';

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
const SORT_KEY = 'lumii-clients-sort';

function loadSort(): SortBy {
  try {
    return localStorage.getItem(SORT_KEY) === 'cognome' ? 'cognome' : 'nome';
  } catch {
    return 'nome';
  }
}

/** First letter without accents ("Àurora" → A); anything else goes under "#". */
function initialOf(text: string): string {
  const letter = text.trim().charAt(0).normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase();
  return /[A-Z]/.test(letter) ? letter : '#';
}

export const Clients = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<SortBy>(loadSort);
  const { data: clients = [], isLoading, isError } = useListClients();
  const [detailClientId, setDetailClientId] = useState<string | null>(null);
  const [editClientId, setEditClientId] = useState<string | null>(null);
  const sectionRefs = useRef(new Map<string, HTMLElement>());

  const changeSort = (value: SortBy) => {
    setSortBy(value);
    try { localStorage.setItem(SORT_KEY, value); } catch {}
  };

  // "Giulia Bianchi" or "Bianchi Giulia", matching the chosen order
  const displayName = (c: Client) =>
    sortBy === 'cognome' ? `${c.lastName} ${c.firstName}` : `${c.firstName} ${c.lastName}`;

  const sections = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    const visible = clients.filter(c =>
      !term ||
      `${c.firstName} ${c.lastName}`.toLowerCase().includes(term) ||
      `${c.lastName} ${c.firstName}`.toLowerCase().includes(term) ||
      c.phone.includes(term)
    );
    const [primary, secondary] = sortBy === 'cognome'
      ? [(c: Client) => c.lastName, (c: Client) => c.firstName]
      : [(c: Client) => c.firstName, (c: Client) => c.lastName];
    visible.sort((a, b) => compareText(primary(a), primary(b)) || compareText(secondary(a), secondary(b)));

    const byLetter = new Map<string, Client[]>();
    for (const c of visible) {
      const letter = initialOf(primary(c));
      byLetter.set(letter, [...(byLetter.get(letter) ?? []), c]);
    }
    // "#" (names starting with a digit or symbol) goes last
    return [...byLetter.entries()].sort(([a], [b]) => (a === '#' ? 1 : b === '#' ? -1 : a.localeCompare(b)));
  }, [clients, searchTerm, sortBy]);

  const letters = new Set(sections.map(([letter]) => letter));
  const index = letters.has('#') ? [...ALPHABET, '#'] : ALPHABET;

  const jumpTo = (letter: string) => {
    sectionRefs.current.get(letter)?.scrollIntoView({ block: 'start', behavior: 'smooth' });
  };

  // Dragging a finger along the alphabet jumps letter by letter, as in a phone's contacts
  const jumpFromPointer = (e: React.PointerEvent) => {
    const el = document.elementFromPoint(e.clientX, e.clientY) as HTMLElement | null;
    const letter = el?.dataset['letter'];
    if (letter && letters.has(letter)) jumpTo(letter);
  };

  const total = sections.reduce((n, [, list]) => n + list.length, 0);

  return (
    <div className="flex flex-col gap-6 page-enter h-full">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-serif text-on-page">Clienti</h1>
        <button onClick={() => store.openModal('isNewClientOpen')} className="btn-brand hidden md:flex items-center gap-2 text-white px-4 py-2.5 rounded-xl text-sm font-medium">
          <UserPlus className="w-4 h-4" /> Nuovo Cliente
        </button>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 pr-7 md:pr-0">
        <div className="relative flex-1">
          <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
          <input
            type="text"
            placeholder="Cerca per nome, cognome o telefono..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-white border border-stone-200 rounded-xl py-3 pl-10 pr-4 outline-none focus:border-brand-dark focus:ring-1 focus:ring-brand-dark transition-all shadow-sm"
          />
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-sm text-on-page-muted">Ordina per</span>
          <div className="flex bg-white border border-stone-200 rounded-xl p-1 shadow-sm">
            {(['nome', 'cognome'] as const).map(value => (
              <button
                key={value}
                onClick={() => changeSort(value)}
                className={cn(
                  'px-4 py-1.5 rounded-lg text-sm font-medium transition-all',
                  sortBy === value ? 'btn-brand text-white' : 'text-stone-600 hover:text-stone-900'
                )}
              >
                {value === 'nome' ? 'Nome' : 'Cognome'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="py-12 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-on-page-muted" /></div>
      ) : isError ? (
        <div className="py-12 flex flex-col items-center justify-center text-red-500 gap-2">
          <AlertCircle className="w-8 h-8 opacity-70" />
          <p className="text-sm">Errore nel caricamento dei clienti.</p>
        </div>
      ) : total === 0 ? (
        <div className="py-12 flex flex-col items-center justify-center text-on-page-muted">
          <SearchX className="w-12 h-12 mb-3 opacity-50" />
          <p>Nessun cliente trovato</p>
        </div>
      ) : (
        <>
          {/* Room on the right for the alphabet */}
          <div className="flex flex-col gap-2 pr-7 md:pr-9">
            {sections.map(([letter, list]) => (
              <section
                key={letter}
                ref={el => { if (el) sectionRefs.current.set(letter, el); else sectionRefs.current.delete(letter); }}
                className="scroll-mt-2"
              >
                <h2 className="sticky top-0 z-10 bg-page-bg py-2 text-lg font-serif font-semibold text-on-page border-b border-black/10 mb-3">
                  {letter}
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                  {list.map(client => (
                    <div
                      key={client.id}
                      onClick={() => setDetailClientId(client.id)}
                      className="bg-white p-4 rounded-2xl shadow-sm border border-stone-100 flex items-center gap-4 active:scale-[0.98] transition-all cursor-pointer hover:border-brand-dark/30 hover:shadow-md"
                    >
                      <div className="w-12 h-12 rounded-full flex items-center justify-center font-serif text-lg shrink-0" style={{ backgroundColor: 'var(--color-brand-icon-bg)', color: 'var(--color-brand-icon-color)' }}>
                        {client.firstName.charAt(0)}{client.lastName.charAt(0)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium text-stone-900 truncate">{displayName(client)}</h3>
                        <div className="flex items-center gap-1 text-sm text-stone-500 mt-1">
                          <Phone className="w-3 h-3 shrink-0" />
                          <span className="truncate">{client.phone}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            ))}
          </div>

          {/* Portal: the page wrapper is animated (transform), which would trap a fixed element */}
          {createPortal(<nav
            aria-label="Vai alla lettera"
            className="fixed right-1 md:right-3 top-1/2 -translate-y-1/2 z-30 flex flex-col items-center py-2 px-1 rounded-full bg-white/80 backdrop-blur-sm shadow-sm border border-stone-200 select-none touch-none"
            onPointerDown={e => { e.currentTarget.setPointerCapture(e.pointerId); jumpFromPointer(e); }}
            onPointerMove={e => { if (e.buttons) jumpFromPointer(e); }}
          >
            {index.map(letter => (
              <button
                key={letter}
                type="button"
                data-letter={letter}
                disabled={!letters.has(letter)}
                onClick={() => jumpTo(letter)}
                className={cn(
                  'w-6 h-[1.15rem] text-[11px] leading-none font-semibold flex items-center justify-center rounded',
                  letters.has(letter) ? 'text-stone-800 hover:bg-stone-100' : 'text-stone-300'
                )}
              >
                {letter}
              </button>
            ))}
          </nav>, document.body)}
        </>
      )}

      <ClientDetailsModal
        isOpen={!!detailClientId}
        onClose={() => setDetailClientId(null)}
        clientId={detailClientId}
        onEdit={(id) => { setDetailClientId(null); setEditClientId(id); }}
      />

      <EditClientModal
        isOpen={!!editClientId}
        onClose={() => setEditClientId(null)}
        clientId={editClientId}
      />
    </div>
  );
};
