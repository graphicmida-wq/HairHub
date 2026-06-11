import { useRegisterSW } from 'virtual:pwa-register/react';
import { RefreshCw, X } from 'lucide-react';

// Check for a newer deploy periodically: an installed PWA kept open all day
// (a salon front desk) would otherwise only notice updates on the next launch.
const UPDATE_CHECK_INTERVAL_MS = 60 * 60 * 1000; // 1h

export function PwaReloadPrompt() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(_swUrl, registration) {
      if (!registration) return;
      setInterval(() => {
        if (!navigator.onLine) return;
        registration.update().catch(() => {});
      }, UPDATE_CHECK_INTERVAL_MS);
    },
  });

  if (!needRefresh) return null;

  return (
    <div
      role="alert"
      className="fixed bottom-28 md:bottom-8 left-1/2 -translate-x-1/2 z-[10001] w-[calc(100vw-2rem)] max-w-sm"
    >
      <div
        className="flex items-center gap-3 px-4 py-3 rounded-2xl shadow-xl text-sm"
        style={{ background: 'var(--color-brand-dark)', color: '#F5F0E3' }}
      >
        <RefreshCw className="w-4 h-4 shrink-0 opacity-80" />
        <span className="flex-1 font-medium">Nuova versione disponibile</span>
        <button
          onClick={() => updateServiceWorker(true)}
          className="shrink-0 rounded-lg px-3 py-1.5 text-xs font-semibold bg-white/15 hover:bg-white/25 transition-colors"
        >
          Aggiorna
        </button>
        <button
          onClick={() => setNeedRefresh(false)}
          aria-label="Chiudi"
          className="shrink-0 opacity-60 hover:opacity-100 transition-opacity"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
