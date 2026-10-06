import { useState, useEffect } from 'react';

type Listener = () => void;

class ModalStore {
  modalState = {
    isNewClientOpen: false,
    isNewAppointmentOpen: false,
    isNewProductOpen: false,
    isNewServiceOpen: false,
    isNewSaleOpen: false,
  };

  /** Brand a new product starts with: set when it is added from inside a brand in Magazzino */
  newProductBrand: string | null = null;

  private listeners: Listener[] = [];

  openModal(modal: keyof typeof this.modalState, newProductBrand: string | null = null) {
    if (modal === 'isNewProductOpen') this.newProductBrand = newProductBrand?.trim() || null;
    this.modalState = { ...this.modalState, [modal]: true };
    this.emit();
  }

  closeModal(modal: keyof typeof this.modalState) {
    this.modalState = { ...this.modalState, [modal]: false };
    this.emit();
  }

  subscribe(listener: Listener) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  private emit() {
    this.listeners.forEach(l => l());
  }
}

export const store = new ModalStore();

export function useModalStore() {
  const [, setTick] = useState(0);
  useEffect(() => {
    return store.subscribe(() => setTick(t => t + 1));
  }, []);
  return store.modalState;
}
