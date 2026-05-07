import { useState, useEffect } from 'react';

type Listener = () => void;

class ModalStore {
  modalState = {
    isNewClientOpen: false,
    isNewAppointmentOpen: false,
    isNewProductOpen: false,
    isNewServiceOpen: false,
  };

  private listeners: Listener[] = [];

  openModal(modal: keyof typeof this.modalState) {
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
