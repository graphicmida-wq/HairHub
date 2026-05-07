import React from 'react';
import { X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  className?: string;
}

export const Modal = ({ isOpen, onClose, title, children, className }: ModalProps) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-stone-900/40 backdrop-blur-sm z-50"
          />
          <motion.div
            initial={{ opacity: 0, y: 100, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 100, scale: 0.95 }}
            className={cn(
              "fixed z-50 flex flex-col bg-white shadow-2xl overflow-y-auto w-full max-h-[90vh]",
              "left-0 right-0 bottom-0 top-auto rounded-t-2xl",
              "md:bottom-auto md:top-1/2 md:left-1/2 md:right-auto md:-translate-x-1/2 md:-translate-y-1/2 md:rounded-2xl md:w-full md:max-w-md md:max-h-[85vh]",
              className
            )}
          >
            <div className="sticky top-0 bg-white z-10 px-6 py-4 border-b border-stone-100 flex items-center justify-between">
              <h2 className="text-xl font-serif font-semibold text-stone-900">{title}</h2>
              <button
                onClick={onClose}
                className="p-2 -mr-2 text-stone-400 hover:text-stone-900 transition-colors rounded-full hover:bg-stone-50"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6">
              {children}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
