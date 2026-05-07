import { useState, useEffect } from 'react';
import { Client, Service, Product, Appointment } from '../types';
import { mockClients, mockServices, mockProducts, mockAppointments } from './mockData';

type Listener = () => void;

class AppStore {
  clients: Client[] = [...mockClients];
  services: Service[] = [...mockServices];
  products: Product[] = [...mockProducts];
  appointments: Appointment[] = [...mockAppointments];

  private listeners: Listener[] = [];

  modalState = {
    isNewClientOpen: false,
    isNewAppointmentOpen: false,
    isNewProductOpen: false,
  };

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

  addClient(client: Omit<Client, 'id'>) {
    const newClient = { ...client, id: Math.random().toString(36).substr(2, 9) };
    this.clients = [newClient, ...this.clients];
    this.emit();
  }

  addProduct(product: Omit<Product, 'id'>) {
    const newProduct = { ...product, id: Math.random().toString(36).substr(2, 9) };
    this.products = [newProduct, ...this.products];
    this.emit();
  }

  addAppointment(appointment: Omit<Appointment, 'id'>) {
    const newAppointment = { ...appointment, id: Math.random().toString(36).substr(2, 9) };
    this.appointments = [newAppointment, ...this.appointments];
    this.emit();
  }

  updateClient(id: string, updates: Partial<Client>) {
    this.clients = this.clients.map(c => c.id === id ? { ...c, ...updates } : c);
    this.emit();
  }

  deleteClient(id: string) {
    this.clients = this.clients.filter(c => c.id !== id);
    this.appointments = this.appointments.filter(a => a.clientId !== id);
    this.emit();
  }

  updateProduct(id: string, updates: Partial<Product>) {
    this.products = this.products.map(p => p.id === id ? { ...p, ...updates } : p);
    this.emit();
  }

  deleteProduct(id: string) {
    this.products = this.products.filter(p => p.id !== id);
    this.emit();
  }

  updateAppointment(id: string, updates: Partial<Appointment>) {
    this.appointments = this.appointments.map(a => a.id === id ? { ...a, ...updates } : a);
    this.emit();
  }

  deleteAppointment(id: string) {
    this.appointments = this.appointments.filter(a => a.id !== id);
    this.emit();
  }
}

export const store = new AppStore();

export function useStore() {
  const [, setTick] = useState(0);
  useEffect(() => {
    return store.subscribe(() => setTick(t => t + 1));
  }, []);
  return store;
}
