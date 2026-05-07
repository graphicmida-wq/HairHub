import React from 'react';
import { Modal } from './Modal';
import { useStore } from '../lib/store';
import { Clock, Calendar as CalendarIcon, Phone, Mail, FileText, AlertTriangle, Edit } from 'lucide-react';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';

export const ClientDetailsModal = ({ isOpen, onClose, clientId, onEdit }: { isOpen: boolean, onClose: () => void, clientId: string | null, onEdit: (id: string) => void }) => {
  const { clients, appointments, services, products } = useStore();

  const client = clients.find(c => c.id === clientId);

  if (!client) return null;

  const clientAppointments = appointments
    .filter(a => a.clientId === client.id)
    .sort((a, b) => new Date(`${b.date}T${b.time}`).getTime() - new Date(`${a.date}T${a.time}`).getTime());

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Scheda Cliente">
      <div className="flex flex-col gap-6">

        <div className="flex items-start justify-between">
          <div className="flex gap-4 items-center">
            <div className="w-16 h-16 rounded-full bg-brand-light text-brand-dark flex items-center justify-center font-serif text-2xl shrink-0">
              {client.firstName.charAt(0)}{client.lastName.charAt(0)}
            </div>
            <div>
              <h3 className="font-serif text-2xl text-stone-900">{client.firstName} {client.lastName}</h3>
              <div className="flex items-center gap-2 text-stone-500 mt-1 flex-wrap">
                <span className="flex items-center gap-1 text-sm"><Phone className="w-3.5 h-3.5" /> {client.phone}</span>
                {client.email && <span className="flex items-center gap-1 text-sm"><Mail className="w-3.5 h-3.5" /> {client.email}</span>}
              </div>
            </div>
          </div>
          <button
            onClick={() => onEdit(client.id)}
            className="p-2 text-stone-400 hover:text-stone-900 bg-stone-50 rounded-full transition-colors"
          >
            <Edit className="w-4 h-4" />
          </button>
        </div>

        <div className="grid grid-cols-1 gap-3 bg-stone-50 p-4 rounded-xl border border-stone-100">
          {client.dob && (
            <div>
              <span className="text-xs uppercase font-semibold text-stone-400 tracking-wider">Data di Nascita</span>
              <p className="text-sm font-medium text-stone-900 mt-0.5">{format(new Date(client.dob), 'd MMMM yyyy', { locale: it })}</p>
            </div>
          )}
          {client.allergies && (
            <div className="text-red-700 bg-red-50 p-2 -mx-2 rounded-lg">
              <span className="text-xs uppercase font-semibold tracking-wider flex items-center gap-1"><AlertTriangle className="w-3 h-3" /> Allergie / Intolleranze</span>
              <p className="text-sm font-medium mt-0.5">{client.allergies}</p>
            </div>
          )}
          {client.notes && (
            <div>
              <span className="text-xs uppercase font-semibold text-stone-400 tracking-wider flex items-center gap-1"><FileText className="w-3 h-3" /> Note</span>
              <p className="text-sm text-stone-700 mt-0.5 whitespace-pre-line">{client.notes}</p>
            </div>
          )}
        </div>

        <div>
          <h4 className="font-medium text-stone-900 mb-3 flex items-center gap-2">
            <Clock className="w-4 h-4 text-stone-400" />
            Storico Appuntamenti
          </h4>

          <div className="flex flex-col gap-3">
            {clientAppointments.length === 0 ? (
              <p className="text-sm text-stone-500 italic px-2">Nessun appuntamento passato.</p>
            ) : (
              clientAppointments.map(app => {
                const service = services.find(s => s.id === app.serviceId);
                const usedProds = app.usedProductIds
                  ? app.usedProductIds.map(pid => products.find(p => p.id === pid)?.name).filter(Boolean)
                  : [];

                return (
                  <div key={app.id} className="bg-white border border-stone-200 rounded-xl p-3 flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <CalendarIcon className="w-4 h-4 text-stone-400" />
                        <span className="text-sm font-medium text-stone-900">
                          {format(new Date(app.date), 'dd/MM/yyyy')} alle {app.time}
                        </span>
                      </div>
                      <span className={`text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-sm ${
                        app.status === 'completato' ? 'bg-green-100 text-green-700' :
                        app.status === 'annullato' || app.status === 'no-show' ? 'bg-red-100 text-red-700' :
                        'bg-blue-100 text-blue-700'
                      }`}>
                        {app.status}
                      </span>
                    </div>

                    {service && (
                      <p className="text-sm text-stone-600 pl-6">{service.name}</p>
                    )}

                    {app.notes && (
                      <p className="text-xs text-stone-500 pl-6 border-l-2 border-stone-100 ml-1 mt-1 italic">
                        "{app.notes}"
                      </p>
                    )}

                    {usedProds.length > 0 && (
                      <div className="pl-6 mt-1 flex flex-wrap gap-1">
                        {usedProds.map((prodName, i) => (
                          <span key={i} className="text-[10px] bg-stone-100 text-stone-600 px-2 py-0.5 rounded-full border border-stone-200">
                            {prodName}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

      </div>
    </Modal>
  );
}
