import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Calendar, Users, Home, Package2, Plus, Scissors, Settings, UserCog, LogOut, ShoppingBag, Wallet, BookOpen } from 'lucide-react';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { store, useModalStore } from '../lib/store';
import { useGetSettings } from '@workspace/api-client-react';
import { useAuth } from '../lib/auth-context';
import { NewClientModal } from './NewClientModal';
import { NewAppointmentModal } from './NewAppointmentModal';
import { NewProductModal } from './NewProductModal';
import { NewServiceModal } from './NewServiceModal';
import { NewSaleModal } from './NewSaleModal';
import { InstallAppButton } from './InstallAppButton';
import { MobileNav, useCompactOnScroll } from './MobileNav';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import lumiiLogo from '../assets/lumii-logo.png';

const SIDEBAR_BORDER = 'rgba(245,240,227,0.06)';
const NAV_ACTIVE_BG = 'var(--nav-active-bg)';
const NAV_ACTIVE_TEXT = '#F5F0E3';
const NAV_INACTIVE_TEXT = 'var(--color-brand-muted)';
const NAV_HOVER_BG = 'rgba(245,240,227,0.06)';

export const Layout = ({ children }: { children: React.ReactNode }) => {
  const location = useLocation();
  const [isFabOpen, setIsFabOpen] = React.useState(false);
  const modalState = useModalStore();
  const { data: settings } = useGetSettings();
  const { user, isAdmin, can, logout } = useAuth();
  const { compact: navCompact, onScroll: onMainScroll } = useCompactOnScroll(location.pathname);

  const salonName = settings?.salonName ?? '';
  const logoUrl = settings?.logoUrl ?? null;
  const showName = settings?.showSalonName ?? true;
  const today = format(new Date(), "d MMMM yyyy", { locale: it });

  const navItems = [
    { icon: Home, label: 'Dashboard', path: '/' },
    can('agenda') && { icon: Calendar, label: 'Agenda', path: '/agenda' },
    can('clienti') && { icon: Users, label: 'Clienti', path: '/clienti' },
    can('servizi') && { icon: Scissors, label: 'Servizi', path: '/servizi' },
    can('vendite') && { icon: ShoppingBag, label: 'Vendite', path: '/vendite' },
    can('incassi') && { icon: Wallet, label: 'Incassi', path: '/incassi' },
    can('magazzino') && { icon: Package2, label: 'Magazzino', path: '/magazzino' },
  ].filter(item => !!item);

  // "+" menu, bottom to top: only what this login can see
  const fabActions = [
    can('vendite') && { label: 'Nuova Vendita', modal: 'isNewSaleOpen' as const },
    can('magazzino') && { label: 'Nuovo Prodotto', modal: 'isNewProductOpen' as const },
    can('servizi') && { label: 'Nuovo Servizio', modal: 'isNewServiceOpen' as const },
    can('agenda') && { label: 'Nuovo Appuntamento', modal: 'isNewAppointmentOpen' as const },
    can('clienti') && { label: 'Nuovo Cliente', modal: 'isNewClientOpen' as const },
  ].filter(action => !!action);

  const isSettingsActive = location.pathname === '/impostazioni';
  const isTeamActive = location.pathname === '/team';
  const isGuideActive = location.pathname.startsWith('/guida');
  const userDisplayName = user?.name?.trim() || user?.username || '';

  return (
    <div className="app-shell flex h-[100dvh] w-full overflow-hidden bg-[var(--color-brand-surface)]">
      {/* At the larger text sizes on a short screen the whole sidebar scrolls */}
      <aside
        className="app-sidebar hidden md:flex w-56 flex-col shrink-0 overflow-y-auto no-scrollbar"
        style={{ borderRight: `1px solid ${SIDEBAR_BORDER}` }}
      >
        <div className="p-6 pb-4 flex flex-col items-center text-center">
          {logoUrl ? (
            <img
              src={logoUrl}
              alt="Logo salone"
              className="w-[min(7rem,16vh)] h-[min(7rem,16vh)] rounded-xl object-contain mb-3"
            />
          ) : (
            <img src={lumiiLogo} alt="Lumii" className="w-[min(6rem,14vh)] h-[min(6rem,14vh)] object-contain mb-3" />
          )}
          {showName ? (
            <h1
              className="text-[#F5F0E3] text-xl font-semibold tracking-wide leading-tight mb-1"
              style={{ fontFamily: '"Playfair Display", serif' }}
            >
              {salonName}
            </h1>
          ) : null}
          <p className="text-[0.625rem] uppercase tracking-[0.2em]" style={{ color: 'var(--color-brand-muted)' }}>
            Gestione Salone
          </p>
        </div>

        <nav className="flex-1 px-3 mt-4 flex flex-col gap-0.5">
          {navItems.map((item) => {
            const isActive =
              location.pathname === item.path ||
              (item.path !== '/' && location.pathname.startsWith(item.path));
            return (
              <Link
                key={item.path}
                to={item.path}
                data-active={isActive || undefined}
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors text-sm font-medium"
                style={{
                  backgroundColor: isActive ? NAV_ACTIVE_BG : 'transparent',
                  color: isActive ? NAV_ACTIVE_TEXT : NAV_INACTIVE_TEXT,
                }}
                onMouseEnter={(e) => {
                  if (!isActive) {
                    (e.currentTarget as HTMLElement).style.backgroundColor = NAV_HOVER_BG;
                    (e.currentTarget as HTMLElement).style.color = '#F5F0E3';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isActive) {
                    (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent';
                    (e.currentTarget as HTMLElement).style.color = NAV_INACTIVE_TEXT;
                  }
                }}
              >
                <item.icon className="w-[1.125rem] h-[1.125rem] shrink-0" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="px-3 pb-6 flex flex-col gap-0.5">
          <InstallAppButton />

          <Link
            to="/guida"
            data-active={isGuideActive || undefined}
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors text-sm font-medium"
            style={{
              backgroundColor: isGuideActive ? NAV_ACTIVE_BG : 'transparent',
              color: isGuideActive ? NAV_ACTIVE_TEXT : NAV_INACTIVE_TEXT,
            }}
            onMouseEnter={(e) => {
              if (!isGuideActive) {
                (e.currentTarget as HTMLElement).style.backgroundColor = NAV_HOVER_BG;
                (e.currentTarget as HTMLElement).style.color = '#F5F0E3';
              }
            }}
            onMouseLeave={(e) => {
              if (!isGuideActive) {
                (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent';
                (e.currentTarget as HTMLElement).style.color = NAV_INACTIVE_TEXT;
              }
            }}
          >
            <BookOpen className="w-[1.125rem] h-[1.125rem] shrink-0" />
            <span>Guida</span>
          </Link>

          {isAdmin && (
            <Link
              to="/team"
              data-active={isTeamActive || undefined}
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors text-sm font-medium"
              style={{
                backgroundColor: isTeamActive ? NAV_ACTIVE_BG : 'transparent',
                color: isTeamActive ? NAV_ACTIVE_TEXT : NAV_INACTIVE_TEXT,
              }}
              onMouseEnter={(e) => {
                if (!isTeamActive) {
                  (e.currentTarget as HTMLElement).style.backgroundColor = NAV_HOVER_BG;
                  (e.currentTarget as HTMLElement).style.color = '#F5F0E3';
                }
              }}
              onMouseLeave={(e) => {
                if (!isTeamActive) {
                  (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent';
                  (e.currentTarget as HTMLElement).style.color = NAV_INACTIVE_TEXT;
                }
              }}
            >
              <UserCog className="w-[1.125rem] h-[1.125rem] shrink-0" />
              <span>Team</span>
            </Link>
          )}

          {isAdmin && (
            <Link
              to="/impostazioni"
              data-active={isSettingsActive || undefined}
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors text-sm font-medium"
              style={{
                backgroundColor: isSettingsActive ? NAV_ACTIVE_BG : 'transparent',
                color: isSettingsActive ? NAV_ACTIVE_TEXT : NAV_INACTIVE_TEXT,
              }}
              onMouseEnter={(e) => {
                if (!isSettingsActive) {
                  (e.currentTarget as HTMLElement).style.backgroundColor = NAV_HOVER_BG;
                  (e.currentTarget as HTMLElement).style.color = '#F5F0E3';
                }
              }}
              onMouseLeave={(e) => {
                if (!isSettingsActive) {
                  (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent';
                  (e.currentTarget as HTMLElement).style.color = NAV_INACTIVE_TEXT;
                }
              }}
            >
              <Settings className="w-[1.125rem] h-[1.125rem] shrink-0" />
              <span>Impostazioni</span>
            </Link>
          )}

          <div
            className="px-3 pt-4 mt-3"
            style={{ borderTop: `1px solid ${SIDEBAR_BORDER}` }}
          >
            <p className="text-sm capitalize mb-3" style={{ color: 'var(--color-brand-muted)' }}>{today}</p>
            <div className="flex items-center justify-between gap-2">
              <div className="flex flex-col min-w-0">
                <span className="text-sm font-medium truncate" style={{ color: '#F5F0E3' }}>
                  {userDisplayName}
                </span>
                <span className="text-[0.6875rem] truncate" style={{ color: 'var(--color-brand-muted)' }}>
                  {isAdmin ? 'Amministratore' : 'Utente'}
                </span>
              </div>
              <button
                onClick={logout}
                title="Esci"
                className="p-2 rounded-lg shrink-0 transition-colors"
                style={{ color: 'var(--color-brand-muted)' }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLElement).style.backgroundColor = NAV_HOVER_BG;
                  (e.currentTarget as HTMLElement).style.color = '#F5F0E3';
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent';
                  (e.currentTarget as HTMLElement).style.color = 'var(--color-brand-muted)';
                }}
              >
                <LogOut className="w-[1.125rem] h-[1.125rem]" />
              </button>
            </div>
          </div>
        </div>
      </aside>
      <div className="app-content flex-1 flex flex-col min-w-0 overflow-hidden relative rounded-l-2xl bg-page-bg">
        <header
          className="app-mobile-header md:hidden px-5 flex items-center justify-between shrink-0 bg-[var(--color-brand-surface)]"
          style={{
            paddingTop: 'calc(env(safe-area-inset-top, 0px) + 0.875rem)',
            paddingBottom: '0.875rem',
          }}
        >
          <div className="flex items-center gap-2">
            {logoUrl ? (
              <img
                src={logoUrl}
                alt="Logo salone"
                className="w-10 h-10 rounded-lg object-contain bg-white/10"
              />
            ) : (
              <img src={lumiiLogo} alt="Lumii" className="w-10 h-10 object-contain" />
            )}
            {showName ? (
              <h1
                className="text-[#F5F0E3] text-xl font-semibold"
                style={{ fontFamily: '"Playfair Display", serif' }}
              >
                {salonName}
              </h1>
            ) : null}
          </div>
          <div className="flex items-center gap-1 -mr-2">
            <InstallAppButton variant="mobile" />
            <Link
              to="/guida"
              title="Guida"
              aria-label="Guida"
              className="p-2 rounded-full transition-colors"
              style={{ color: 'var(--color-brand-muted)' }}
              onClick={() => setIsFabOpen(false)}
            >
              <BookOpen className="w-5 h-5" />
            </Link>
            {isAdmin && (
              <Link
                to="/team"
                title="Team"
                className="p-2 rounded-full transition-colors"
                style={{ color: 'var(--color-brand-muted)' }}
                onClick={() => setIsFabOpen(false)}
              >
                <UserCog className="w-5 h-5" />
              </Link>
            )}
            {isAdmin && (
              <Link
                to="/impostazioni"
                className="p-2 rounded-full transition-colors"
                style={{ color: 'var(--color-brand-muted)' }}
                onClick={() => setIsFabOpen(false)}
              >
                <Settings className="w-5 h-5" />
              </Link>
            )}
            <button
              onClick={() => { setIsFabOpen(false); logout(); }}
              title="Esci"
              className="p-2 rounded-full transition-colors"
              style={{ color: 'var(--color-brand-muted)' }}
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </header>

        <main onScroll={onMainScroll} className="flex-1 overflow-y-auto scroll-smooth no-scrollbar p-6 md:p-8 pb-mobile-nav">
          <div className="max-w-5xl mx-auto">
            {children}
          </div>
        </main>
      </div>
      {/* On phones it floats just above the nav pill and follows it as it shrinks (index.css) */}
      {fabActions.length > 0 && <div
        className="fixed fab-dock md:bottom-8 right-4 md:right-8 z-40 flex flex-col items-end gap-3"
        style={{ '--mobile-nav-h': navCompact ? '3.5rem' : '4.25rem' } as React.CSSProperties}
      >
        <AnimatePresence>
          {isFabOpen && (
            <motion.div
              initial={{ opacity: 0, y: 15, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 15, scale: 0.9 }}
              className="flex flex-col gap-2 mb-2"
            >
              {fabActions.map(action => (
                <button
                  key={action.modal}
                  onClick={() => { setIsFabOpen(false); store.openModal(action.modal); }}
                  className="flex items-center gap-3 bg-white px-4 py-2 rounded-full shadow-lg text-sm font-medium border text-stone-700 hover:bg-stone-50 transition-colors"
                  style={{ borderColor: 'var(--color-card-border)' }}
                >
                  {action.label}
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        <button
          onClick={() => setIsFabOpen(!isFabOpen)}
          className="btn-brand w-14 h-14 text-white rounded-full flex items-center justify-center shadow-xl transition-transform active:scale-95 focus:outline-none focus:ring-4"
        >
          <motion.div animate={{ rotate: isFabOpen ? 45 : 0 }}>
            <Plus className="w-6 h-6" />
          </motion.div>
        </button>
      </div>}
      <NewClientModal isOpen={modalState.isNewClientOpen} onClose={() => store.closeModal('isNewClientOpen')} />
      <NewAppointmentModal isOpen={modalState.isNewAppointmentOpen} onClose={() => store.closeModal('isNewAppointmentOpen')} />
      <NewProductModal isOpen={modalState.isNewProductOpen} onClose={() => store.closeModal('isNewProductOpen')} />
      <NewServiceModal isOpen={modalState.isNewServiceOpen} onClose={() => store.closeModal('isNewServiceOpen')} />
      <NewSaleModal isOpen={modalState.isNewSaleOpen} onClose={() => store.closeModal('isNewSaleOpen')} />
      <MobileNav
        // "Dashboard" reaches the pill's rounded edge: the short name fits
        items={navItems.map(item => (item.path === '/' ? { ...item, label: 'Home' } : item))}
        isActive={path => location.pathname === path || (path !== '/' && location.pathname.startsWith(path))}
        compact={navCompact}
        onNavigate={() => setIsFabOpen(false)}
      />
    </div>
  );
};
