import { randomBytes } from "crypto";

export type AppointmentStatus =
  | "prenotato"
  | "confermato"
  | "completato"
  | "annullato"
  | "no-show";

export interface Client {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  dob?: string | null;
  notes?: string | null;
  allergies?: string | null;
  hairSpecs?: string | null;
}

export interface Service {
  id: string;
  name: string;
  category: string;
  durationMins: number;
  price: number;
  notes?: string | null;
}

export interface Product {
  id: string;
  name: string;
  category: string;
  brand: string;
  quantity: number;
  minThreshold: number;
  supplier?: string | null;
  notes?: string | null;
}

export interface Appointment {
  id: string;
  clientId: string;
  serviceId: string;
  date: string;
  time: string;
  durationMins: number;
  status: AppointmentStatus;
  notes?: string | null;
  usedProductIds?: string[] | null;
}

export interface SalonSettings {
  salonName: string;
  address?: string | null;
  phone?: string | null;
  email?: string | null;
}

function uid(): string {
  return randomBytes(6).toString("hex");
}

const today = new Date().toISOString().split("T")[0];
const tomorrow = new Date(Date.now() + 86400000).toISOString().split("T")[0];

class DataStore {
  clients: Client[] = [
    { id: "c1", firstName: "Giulia", lastName: "Bianchi", phone: "+39 333 1234567", email: "giulia@example.com", allergies: "Nessuna", hairSpecs: "Capelli fini, trattati. Preferisce colorazione senza ammoniaca." },
    { id: "c2", firstName: "Marco", lastName: "Rossi", phone: "+39 345 9876543", email: "marco.r@example.com" },
    { id: "c3", firstName: "Elena", lastName: "Verdi", phone: "+39 328 5556667", email: "elena.v@example.com", dob: "1990-05-14" },
  ];

  services: Service[] = [
    { id: "s1", name: "Taglio Donna", category: "Taglio", durationMins: 45, price: 35 },
    { id: "s2", name: "Piega Corti", category: "Piega", durationMins: 30, price: 18 },
    { id: "s3", name: "Colore Base", category: "Colore", durationMins: 60, price: 45 },
    { id: "s4", name: "Taglio Uomo", category: "Taglio", durationMins: 30, price: 25 },
  ];

  products: Product[] = [
    { id: "p1", name: "Shampoo Ristrutturante 1L", category: "Lavaggio", brand: "Kerastase", quantity: 12, minThreshold: 5 },
    { id: "p2", name: "Balsamo Idratante", category: "Lavaggio", brand: "Olaplex", quantity: 3, minThreshold: 6 },
    { id: "p3", name: "Tinta Tubo 6.0", category: "Colore", brand: "Wella", quantity: 1, minThreshold: 10 },
    { id: "p4", name: "Olio Illuminante", category: "Finish", brand: "Moroccanoil", quantity: 8, minThreshold: 4 },
  ];

  appointments: Appointment[] = [
    { id: "a1", clientId: "c1", serviceId: "s3", date: today, time: "10:00", durationMins: 60, status: "confermato" },
    { id: "a2", clientId: "c2", serviceId: "s4", date: today, time: "11:15", durationMins: 30, status: "completato" },
    { id: "a3", clientId: "c3", serviceId: "s1", date: today, time: "15:30", durationMins: 45, status: "prenotato" },
    { id: "a4", clientId: "c1", serviceId: "s2", date: tomorrow, time: "09:00", durationMins: 30, status: "prenotato" },
  ];

  settings: SalonSettings = {
    salonName: "L'Atelier",
    address: "",
    phone: "",
    email: "",
  };

  // ── Clients ──────────────────────────────────────────────────────────────
  getClients(): Client[] {
    return this.clients;
  }
  getClient(id: string): Client | undefined {
    return this.clients.find((c) => c.id === id);
  }
  createClient(data: Omit<Client, "id">): Client {
    const client = { ...data, id: uid() };
    this.clients = [client, ...this.clients];
    return client;
  }
  updateClient(id: string, data: Partial<Omit<Client, "id">>): Client | undefined {
    const idx = this.clients.findIndex((c) => c.id === id);
    if (idx === -1) return undefined;
    this.clients[idx] = { ...this.clients[idx], ...data };
    return this.clients[idx];
  }
  deleteClient(id: string): boolean {
    const before = this.clients.length;
    this.clients = this.clients.filter((c) => c.id !== id);
    this.appointments = this.appointments.filter((a) => a.clientId !== id);
    return this.clients.length < before;
  }

  // ── Services ─────────────────────────────────────────────────────────────
  getServices(): Service[] {
    return this.services;
  }
  createService(data: Omit<Service, "id">): Service {
    const service = { ...data, id: uid() };
    this.services = [service, ...this.services];
    return service;
  }
  updateService(id: string, data: Partial<Omit<Service, "id">>): Service | undefined {
    const idx = this.services.findIndex((s) => s.id === id);
    if (idx === -1) return undefined;
    this.services[idx] = { ...this.services[idx], ...data };
    return this.services[idx];
  }
  deleteService(id: string): boolean {
    const before = this.services.length;
    this.services = this.services.filter((s) => s.id !== id);
    return this.services.length < before;
  }

  // ── Products ─────────────────────────────────────────────────────────────
  getProducts(): Product[] {
    return this.products;
  }
  createProduct(data: Omit<Product, "id">): Product {
    const product = { ...data, id: uid() };
    this.products = [product, ...this.products];
    return product;
  }
  updateProduct(id: string, data: Partial<Omit<Product, "id">>): Product | undefined {
    const idx = this.products.findIndex((p) => p.id === id);
    if (idx === -1) return undefined;
    this.products[idx] = { ...this.products[idx], ...data };
    return this.products[idx];
  }
  deleteProduct(id: string): boolean {
    const before = this.products.length;
    this.products = this.products.filter((p) => p.id !== id);
    return this.products.length < before;
  }

  // ── Appointments ──────────────────────────────────────────────────────────
  getAppointments(): Appointment[] {
    return this.appointments;
  }
  createAppointment(data: Omit<Appointment, "id">): Appointment {
    const appointment = { ...data, id: uid() };
    this.appointments = [appointment, ...this.appointments];
    return appointment;
  }
  updateAppointment(id: string, data: Partial<Omit<Appointment, "id">>): Appointment | undefined {
    const idx = this.appointments.findIndex((a) => a.id === id);
    if (idx === -1) return undefined;
    this.appointments[idx] = { ...this.appointments[idx], ...data };
    return this.appointments[idx];
  }
  deleteAppointment(id: string): boolean {
    const before = this.appointments.length;
    this.appointments = this.appointments.filter((a) => a.id !== id);
    return this.appointments.length < before;
  }

  // ── Settings ─────────────────────────────────────────────────────────────
  getSettings(): SalonSettings {
    return this.settings;
  }
  updateSettings(data: Partial<SalonSettings>): SalonSettings {
    this.settings = { ...this.settings, ...data };
    return this.settings;
  }
}

export const dataStore = new DataStore();
