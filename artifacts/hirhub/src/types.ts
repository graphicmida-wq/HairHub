export type AppointmentStatus = 'prenotato' | 'confermato' | 'completato' | 'annullato' | 'no-show';

export interface Client {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  dob?: string;
  notes?: string;
  allergies?: string;
  hairSpecs?: string;
}

export interface Service {
  id: string;
  name: string;
  category: string;
  durationMins: number;
  price: number;
  notes?: string;
}

export interface Product {
  id: string;
  name: string;
  category: string;
  brand: string;
  quantity: number;
  minThreshold: number;
  supplier?: string;
  notes?: string;
}

export interface Appointment {
  id: string;
  clientId: string;
  serviceId: string;
  date: string;
  time: string;
  durationMins: number;
  status: AppointmentStatus;
  notes?: string;
  usedProductIds?: string[];
}
