import { Appointment, Client, Product, Service } from '../types';

export const mockClients: Client[] = [
  { id: 'c1', firstName: 'Giulia', lastName: 'Bianchi', phone: '+39 333 1234567', email: 'giulia@example.com', allergies: 'Nessuna', hairSpecs: 'Capelli fini, trattati. Preferisce colorazione senza ammoniaca.' },
  { id: 'c2', firstName: 'Marco', lastName: 'Rossi', phone: '+39 345 9876543', email: 'marco.r@example.com' },
  { id: 'c3', firstName: 'Elena', lastName: 'Verdi', phone: '+39 328 5556667', email: 'elena.v@example.com', dob: '1990-05-14' },
];

export const mockServices: Service[] = [
  { id: 's1', name: 'Taglio Donna', category: 'Taglio', durationMins: 45, price: 35 },
  { id: 's2', name: 'Piega Corti', category: 'Piega', durationMins: 30, price: 18 },
  { id: 's3', name: 'Colore Base', category: 'Colore', durationMins: 60, price: 45 },
  { id: 's4', name: 'Taglio Uomo', category: 'Taglio', durationMins: 30, price: 25 },
];

export const mockProducts: Product[] = [
  { id: 'p1', name: 'Shampoo Ristrutturante 1L', category: 'Lavaggio', brand: 'Kerastase', quantity: 12, minThreshold: 5 },
  { id: 'p2', name: 'Balsamo Idratante', category: 'Lavaggio', brand: 'Olaplex', quantity: 3, minThreshold: 6 },
  { id: 'p3', name: 'Tinta Tubo 6.0', category: 'Colore', brand: 'Wella', quantity: 1, minThreshold: 10 },
  { id: 'p4', name: 'Olio Illuminante', category: 'Finish', brand: 'Moroccanoil', quantity: 8, minThreshold: 4 },
];

const today = new Date();
const tomorrow = new Date(today);
tomorrow.setDate(tomorrow.getDate() + 1);

const formatDate = (date: Date) => date.toISOString().split('T')[0];

export const mockAppointments: Appointment[] = [
  { id: 'a1', clientId: 'c1', serviceId: 's3', date: formatDate(today), time: '10:00', durationMins: 60, status: 'confermato' },
  { id: 'a2', clientId: 'c2', serviceId: 's4', date: formatDate(today), time: '11:15', durationMins: 30, status: 'completato' },
  { id: 'a3', clientId: 'c3', serviceId: 's1', date: formatDate(today), time: '15:30', durationMins: 45, status: 'prenotato' },
  { id: 'a4', clientId: 'c1', serviceId: 's2', date: formatDate(tomorrow), time: '09:00', durationMins: 30, status: 'prenotato' },
];
