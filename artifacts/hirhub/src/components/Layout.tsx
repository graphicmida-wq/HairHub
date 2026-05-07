import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Calendar, Users, Home, Package2, Plus, Scissors, Settings } from 'lucide-react';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { store, useModalStore } from '../lib/store';
import { useGetSettings } from '@workspace/api-client-react';
import { NewClientModal } from './NewClientModal';
import { NewAppointmentModal } from './NewAppointmentModal';
import { NewProductModal } from './NewProductModal';
import { NewServiceModal } from './NewServiceModal';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';

const SIDEBAR_BG = '#3A3748';
const SIDEBAR_BORDER = 'rgba(245,240,227,0.06)';
const NAV_ACTIVE_BG = 'rgba(245,240,227,0.15)';
const NAV_ACTIVE_TEXT = '#F5F0E3';
const NAV_INACTIVE_TEXT = '#C8C4D4';
const NAV_HOVER_BG = 'rgba(245,240,227,0.06)';

export const Layout = ({ children }: { children: React.ReactNode }) => {
  const location = useLocation();
  const [isFabOpen, setIsFabOpen] = React.useState(false);
  const modalState = useModalStore();
  const { data: settings } = useGetSettings();

  const salonName = settings?.salonName ?? "Capelli & Vanitá";
  const today = format(new Date(), "d MMMM yyyy", { locale: it });

  const navItems = [
    { icon: Home, label: 'Dashboard', path: '/' },
    { icon: Calendar, label: 'Agenda', path: '/agenda' },
    { icon: Users, label: 'Clienti', path: '/clienti' },
    { icon: Scissors, label: 'Servizi', path: '/servizi' },
    { icon: Package2, label: 'Magazzino', path: '/magazzino' },
  ];

  const isSettingsActive = location.pathname === '/impostazioni';

  return (
    <div className="flex h-[100dvh] w-full overflow-hidden" style={{ background: SIDEBAR_BG }}>
      <aside
        className="hidden md:flex w-56 flex-col shrink-0"
        style={{ backgroundColor: SIDEBAR_BG, borderRight: `1px solid ${SIDEBAR_BORDER}` }}
      >
        <div className="p-6 pb-4">
          <div className="flex items-center gap-2 mb-1">
            <span style={{ color: '#C4AA7E', fontSize: '1.1rem', lineHeight: 1 }}>♥</span>
            <h1
              className="text-[#F5F0E3] text-xl font-semibold tracking-wide leading-tight"
              style={{ fontFamily: '"Playfair Display", serif' }}
            >
              {salonName}
            </h1>
          </div>
          <p className="text-[#C8C4D4] text-[10px] uppercase tracking-[0.2em] ml-[28px]">
            Gestione Salone
          </p>
        </div>

        <nav className="flex-1 px-3 mt-4 flex flex-col gap-0.5 overflow-y-auto">
          {navItems.map((item) => {
            const isActive =
              location.pathname === item.path ||
              (item.path !== '/' && location.pathname.startsWith(item.path));
            return (
              <Link
                key={item.path}
                to={item.path}
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
                <item.icon className="w-[18px] h-[18px] shrink-0" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="px-3 pb-6">
          <Link
            to="/impostazioni"
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors text-sm font-medium mb-4"
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
            <Settings className="w-[18px] h-[18px] shrink-0" />
            <span>Impostazioni</span>
          </Link>

          <div
            className="px-3 pt-4"
            style={{ borderTop: `1px solid ${SIDEBAR_BORDER}` }}
          >
            <p className="text-[#C8C4D4] text-sm capitalize">{today}</p>
          </div>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative rounded-l-2xl" style={{ backgroundColor: '#FAF7EE' }}>
        <header
          className="md:hidden px-6 h-[65px] flex items-center justify-between shrink-0"
          style={{ backgroundColor: SIDEBAR_BG }}
        >
          <div className="flex items-center gap-2">
            <span style={{ color: '#C4AA7E' }}>♥</span>
            <h1
              className="text-[#F5F0E3] text-xl font-semibold"
              style={{ fontFamily: '"Playfair Display", serif' }}
            >
              {salonName}
            </h1>
          </div>
          <Link
            to="/impostazioni"
            className="p-2 -mr-2 rounded-full transition-colors"
            style={{ color: '#C8C4D4' }}
            onClick={() => setIsFabOpen(false)}
          >
            <Settings className="w-5 h-5" />
          </Link>
        </header>

        <main className="flex-1 overflow-y-auto pb-24 md:pb-8 scroll-smooth no-scrollbar p-6 md:p-8">
          <div className="max-w-5xl mx-auto">
            {children}
          </div>
        </main>
      </div>

      <div className="fixed bottom-24 md:bottom-8 right-4 md:right-8 z-40 flex flex-col items-end gap-3">
        <AnimatePresence>
          {isFabOpen && (
            <motion.div
              initial={{ opacity: 0, y: 15, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 15, scale: 0.9 }}
              className="flex flex-col gap-2 mb-2"
            >
              <button
                onClick={() => { setIsFabOpen(false); store.openModal('isNewProductOpen'); }}
                className="flex items-center gap-3 bg-white px-4 py-2 rounded-full shadow-lg text-sm font-medium border text-stone-700 hover:bg-stone-50 transition-colors"
                style={{ borderColor: '#E8E3D8' }}
              >
                Nuovo Prodotto
              </button>
              <button
                onClick={() => { setIsFabOpen(false); store.openModal('isNewServiceOpen'); }}
                className="flex items-center gap-3 bg-white px-4 py-2 rounded-full shadow-lg text-sm font-medium border text-stone-700 hover:bg-stone-50 transition-colors"
                style={{ borderColor: '#E8E3D8' }}
              >
                Nuovo Servizio
              </button>
              <button
                onClick={() => { setIsFabOpen(false); store.openModal('isNewAppointmentOpen'); }}
                className="flex items-center gap-3 bg-white px-4 py-2 rounded-full shadow-lg text-sm font-medium border text-stone-700 hover:bg-stone-50 transition-colors"
                style={{ borderColor: '#E8E3D8' }}
              >
                Nuovo Appuntamento
              </button>
              <button
                onClick={() => { setIsFabOpen(false); store.openModal('isNewClientOpen'); }}
                className="flex items-center gap-3 bg-white px-4 py-2 rounded-full shadow-lg text-sm font-medium border text-stone-700 hover:bg-stone-50 transition-colors"
                style={{ borderColor: '#E8E3D8' }}
              >
                Nuovo Cliente
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        <button
          onClick={() => setIsFabOpen(!isFabOpen)}
          className="w-14 h-14 text-white rounded-full flex items-center justify-center shadow-xl transition-transform active:scale-95 focus:outline-none focus:ring-4"
          style={{ backgroundColor: '#3A3748', focusRingColor: 'rgba(92,88,112,0.3)' } as React.CSSProperties}
        >
          <motion.div animate={{ rotate: isFabOpen ? 45 : 0 }}>
            <Plus className="w-6 h-6" />
          </motion.div>
        </button>
      </div>

      <NewClientModal isOpen={modalState.isNewClientOpen} onClose={() => store.closeModal('isNewClientOpen')} />
      <NewAppointmentModal isOpen={modalState.isNewAppointmentOpen} onClose={() => store.closeModal('isNewAppointmentOpen')} />
      <NewProductModal isOpen={modalState.isNewProductOpen} onClose={() => store.closeModal('isNewProductOpen')} />
      <NewServiceModal isOpen={modalState.isNewServiceOpen} onClose={() => store.closeModal('isNewServiceOpen')} />

      <nav
        className="md:hidden fixed bottom-0 left-0 right-0 border-t pb-safe z-30"
        style={{ backgroundColor: SIDEBAR_BG, borderColor: SIDEBAR_BORDER }}
      >
        <div className="flex justify-around items-center h-[72px]">
          {navItems.map((item) => {
            const isActive =
              location.pathname === item.path ||
              (item.path !== '/' && location.pathname.startsWith(item.path));
            return (
              <Link
                key={item.path}
                to={item.path}
                className="flex flex-col items-center justify-center w-full h-full gap-1 active:scale-95 transition-transform"
                onClick={() => setIsFabOpen(false)}
              >
                <item.icon
                  className="w-5 h-5 transition-colors"
                  style={{ color: isActive ? '#F5F0E3' : '#9B98A8' }}
                />
                <span
                  className="text-[10px] font-medium transition-colors"
                  style={{ color: isActive ? '#F5F0E3' : '#9B98A8' }}
                >
                  {item.label}
                </span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
};
