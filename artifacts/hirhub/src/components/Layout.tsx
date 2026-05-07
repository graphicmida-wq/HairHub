import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Calendar, Users, Home, Package2, Menu, Plus } from 'lucide-react';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { store, useModalStore } from '../lib/store';
import { NewClientModal } from './NewClientModal';
import { NewAppointmentModal } from './NewAppointmentModal';
import { NewProductModal } from './NewProductModal';

export const Layout = ({ children }: { children: React.ReactNode }) => {
  const location = useLocation();
  const [isFabOpen, setIsFabOpen] = React.useState(false);
  const modalState = useModalStore();

  const navItems = [
    { icon: Home, label: 'Dashboard', path: '/' },
    { icon: Calendar, label: 'Agenda', path: '/agenda' },
    { icon: Users, label: 'Clienti', path: '/clienti' },
    { icon: Package2, label: 'Magazzino', path: '/magazzino' },
  ];

  return (
    <div className="flex h-[100dvh] bg-stone-50 w-full overflow-hidden">
      <aside className="hidden md:flex w-64 bg-white border-r border-stone-200 flex-col shrink-0">
        <div className="p-6 border-b border-stone-100 flex items-center h-[73px]">
          <h1 className="font-serif italic font-semibold text-2xl text-stone-800">L'Atelier</h1>
        </div>
        <nav className="flex-1 p-4 flex flex-col gap-2 overflow-y-auto">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path || (item.path !== '/' && location.pathname.startsWith(item.path));
            return (
              <Link
                key={item.path}
                to={item.path}
                className={cn(
                  "flex items-center gap-3 px-4 py-3 rounded-xl transition-all",
                  isActive ? "bg-stone-50 text-brand-dark font-medium" : "text-stone-500 hover:bg-stone-50"
                )}
              >
                <item.icon className="w-5 h-5" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </aside>

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        <header className="md:hidden bg-white px-6 h-[73px] flex items-center justify-between border-b border-stone-100 shadow-sm shrink-0">
          <h1 className="font-serif italic font-semibold text-2xl text-stone-800">L'Atelier</h1>
          <button className="p-2 -mr-2 bg-stone-50 rounded-full text-stone-600 hover:text-stone-900 transition-colors">
            <Menu className="w-5 h-5" />
          </button>
        </header>

        <main className="flex-1 overflow-y-auto pb-24 md:pb-8 scroll-smooth no-scrollbar p-6">
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
                className="flex items-center gap-3 bg-white px-4 py-2 rounded-full shadow-lg text-sm font-medium border border-stone-100 text-stone-700 hover:bg-stone-50 transition-colors"
              >
                Nuovo Prodotto
              </button>
              <button
                onClick={() => { setIsFabOpen(false); store.openModal('isNewAppointmentOpen'); }}
                className="flex items-center gap-3 bg-white px-4 py-2 rounded-full shadow-lg text-sm font-medium border border-stone-100 text-stone-700 hover:bg-stone-50 transition-colors"
              >
                Nuovo Appuntamento
              </button>
              <button
                onClick={() => { setIsFabOpen(false); store.openModal('isNewClientOpen'); }}
                className="flex items-center gap-3 bg-white px-4 py-2 rounded-full shadow-lg text-sm font-medium border border-stone-100 text-stone-700 hover:bg-stone-50 transition-colors"
              >
                Nuovo Cliente
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        <button
          onClick={() => setIsFabOpen(!isFabOpen)}
          className="w-14 h-14 bg-stone-900 text-white rounded-full flex items-center justify-center shadow-xl transition-transform active:scale-95 hover:bg-stone-800 focus:outline-none focus:ring-4 focus:ring-stone-200"
        >
          <motion.div animate={{ rotate: isFabOpen ? 45 : 0 }}>
            <Plus className="w-6 h-6" />
          </motion.div>
        </button>
      </div>

      <NewClientModal isOpen={modalState.isNewClientOpen} onClose={() => store.closeModal('isNewClientOpen')} />
      <NewAppointmentModal isOpen={modalState.isNewAppointmentOpen} onClose={() => store.closeModal('isNewAppointmentOpen')} />
      <NewProductModal isOpen={modalState.isNewProductOpen} onClose={() => store.closeModal('isNewProductOpen')} />

      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-stone-200 pb-safe z-30 shadow-[0_-4px_20px_-10px_rgba(0,0,0,0.05)]">
        <div className="flex justify-around items-center h-[72px]">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path || (item.path !== '/' && location.pathname.startsWith(item.path));
            return (
              <Link
                key={item.path}
                to={item.path}
                className="flex flex-col items-center justify-center w-full h-full gap-1 active:scale-95 transition-transform"
                onClick={() => setIsFabOpen(false)}
              >
                <item.icon className={cn("w-5 h-5 transition-colors", isActive ? "text-brand-dark" : "text-stone-400")} />
                <span className={cn("text-[10px] font-medium transition-colors", isActive ? "text-brand-dark" : "text-stone-400")}>
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
