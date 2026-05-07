import React from 'react';
import { 
  Heart, 
  LayoutDashboard, 
  Calendar, 
  Users, 
  Package, 
  Scissors, 
  Settings,
  Plus,
  ArrowUpRight,
  UserPlus,
  Box
} from 'lucide-react';

export function CremaAntracite() {
  const currentDate = new Date().toLocaleDateString('it-IT', { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#F5F0E3' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,600;1,400&family=Inter:wght@300;400;500;600&display=swap');
        
        .font-playfair { font-family: 'Playfair Display', serif; }
        .font-inter { font-family: 'Inter', sans-serif; }
        
        .crema-shadow {
          box-shadow: 0 4px 20px -2px rgba(92, 88, 112, 0.05), 0 2px 4px -2px rgba(92, 88, 112, 0.03);
        }
      `}</style>

      {/* Sidebar */}
      <aside style={{ width: '240px', borderRight: '1px solid #EDE8D8' }} className="flex flex-col h-screen sticky top-0 font-inter">
        <div className="p-8 flex flex-col items-center border-b border-[#EDE8D8]">
          <Heart className="w-8 h-8 text-[#5C5870] mb-3 stroke-[1.5]" />
          <h1 className="font-playfair text-[#3A3748] text-xl font-semibold tracking-wide text-center leading-tight">
            Capelli &<br />Vanitá
          </h1>
        </div>

        <nav className="flex-1 px-4 py-8 space-y-2">
          <a href="#" className="flex items-center gap-3 px-4 py-3 rounded-lg bg-[#5C5870] text-white">
            <LayoutDashboard className="w-5 h-5 opacity-90" />
            <span className="font-medium tracking-wide text-sm">Dashboard</span>
          </a>
          <a href="#" className="flex items-center gap-3 px-4 py-3 rounded-lg text-[#6B6880] hover:bg-[#EDE8D8] hover:text-[#5C5870] transition-colors">
            <Calendar className="w-5 h-5 opacity-70" />
            <span className="font-medium tracking-wide text-sm">Agenda</span>
          </a>
          <a href="#" className="flex items-center gap-3 px-4 py-3 rounded-lg text-[#6B6880] hover:bg-[#EDE8D8] hover:text-[#5C5870] transition-colors">
            <Users className="w-5 h-5 opacity-70" />
            <span className="font-medium tracking-wide text-sm">Clienti</span>
          </a>
          <a href="#" className="flex items-center gap-3 px-4 py-3 rounded-lg text-[#6B6880] hover:bg-[#EDE8D8] hover:text-[#5C5870] transition-colors">
            <Package className="w-5 h-5 opacity-70" />
            <span className="font-medium tracking-wide text-sm">Magazzino</span>
          </a>
          <a href="#" className="flex items-center gap-3 px-4 py-3 rounded-lg text-[#6B6880] hover:bg-[#EDE8D8] hover:text-[#5C5870] transition-colors">
            <Scissors className="w-5 h-5 opacity-70" />
            <span className="font-medium tracking-wide text-sm">Servizi</span>
          </a>
          <a href="#" className="flex items-center gap-3 px-4 py-3 rounded-lg text-[#6B6880] hover:bg-[#EDE8D8] hover:text-[#5C5870] transition-colors">
            <Settings className="w-5 h-5 opacity-70" />
            <span className="font-medium tracking-wide text-sm">Impostazioni</span>
          </a>
        </nav>

        <div className="p-6 border-t border-[#EDE8D8]">
          <p className="text-[#9B98A8] text-xs font-medium uppercase tracking-widest text-center">
            {currentDate}
          </p>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 bg-[#FAF7EE] p-10 lg:p-12 font-inter h-screen overflow-y-auto">
        <div className="max-w-5xl mx-auto space-y-10">
          
          {/* Header */}
          <div>
            <p className="text-[#9B98A8] text-xs font-semibold uppercase tracking-[0.2em] mb-2">
              Bentornato
            </p>
            <h2 className="font-playfair text-[#3A3748] text-4xl font-semibold">
              Panoramica del Mese
            </h2>
          </div>

          {/* KPIs */}
          <div className="grid grid-cols-4 gap-6">
            <div className="bg-[#FFFFFF] border border-[#E8E3D8] rounded-xl p-6 crema-shadow">
              <p className="text-[#9B98A8] text-xs font-medium uppercase tracking-widest mb-4">Fatturato</p>
              <p className="text-[#3A3748] text-3xl font-playfair font-semibold">€3.240</p>
              <p className="text-[#5C5870] text-sm mt-2 flex items-center gap-1 font-medium">
                <ArrowUpRight className="w-4 h-4" /> +12% rispetto al mese scorso
              </p>
            </div>
            <div className="bg-[#FFFFFF] border border-[#E8E3D8] rounded-xl p-6 crema-shadow">
              <p className="text-[#9B98A8] text-xs font-medium uppercase tracking-widest mb-4">Appuntamenti</p>
              <p className="text-[#3A3748] text-3xl font-playfair font-semibold">47</p>
              <p className="text-[#6B6880] text-sm mt-2">12 questa settimana</p>
            </div>
            <div className="bg-[#FFFFFF] border border-[#E8E3D8] rounded-xl p-6 crema-shadow">
              <p className="text-[#9B98A8] text-xs font-medium uppercase tracking-widest mb-4">No-show</p>
              <p className="text-[#3A3748] text-3xl font-playfair font-semibold">3.2%</p>
              <p className="text-[#6B6880] text-sm mt-2">In lieve aumento</p>
            </div>
            <div className="bg-[#FFFFFF] border border-[#E8E3D8] rounded-xl p-6 crema-shadow">
              <p className="text-[#9B98A8] text-xs font-medium uppercase tracking-widest mb-4">Nuovi Clienti</p>
              <p className="text-[#3A3748] text-3xl font-playfair font-semibold">8</p>
              <p className="text-[#5C5870] text-sm mt-2 font-medium">Ottimo andamento</p>
            </div>
          </div>

          {/* Azioni Rapide */}
          <div>
            <h3 className="text-[#9B98A8] text-xs font-semibold uppercase tracking-[0.2em] mb-4">
              Azioni Rapide
            </h3>
            <div className="flex gap-4">
              <button className="flex items-center gap-2 bg-[#5C5870] text-white px-5 py-3 rounded-lg font-medium text-sm hover:bg-[#4A475C] transition-colors crema-shadow">
                <Plus className="w-4 h-4" />
                Nuovo Appuntamento
              </button>
              <button className="flex items-center gap-2 bg-[#FFFFFF] border border-[#E8E3D8] text-[#5C5870] px-5 py-3 rounded-lg font-medium text-sm hover:bg-[#F5F0E3] transition-colors crema-shadow">
                <UserPlus className="w-4 h-4" />
                Nuovo Cliente
              </button>
              <button className="flex items-center gap-2 bg-[#FFFFFF] border border-[#E8E3D8] text-[#5C5870] px-5 py-3 rounded-lg font-medium text-sm hover:bg-[#F5F0E3] transition-colors crema-shadow">
                <Box className="w-4 h-4" />
                Nuovo Prodotto
              </button>
            </div>
          </div>

          {/* Grid Layout */}
          <div className="grid grid-cols-3 gap-8">
            
            {/* Prossimi Appuntamenti */}
            <div className="col-span-2">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-playfair text-[#3A3748] text-xl font-semibold">
                  Prossimi Appuntamenti
                </h3>
                <a href="#" className="text-[#5C5870] text-sm font-medium hover:underline">Vedi tutti</a>
              </div>
              <div className="bg-[#FFFFFF] border border-[#E8E3D8] rounded-xl crema-shadow overflow-hidden">
                <div className="divide-y divide-[#EDE8D8]">
                  {[
                    { time: '14:30', client: 'Martina Rossi', service: 'Taglio & Piega', duration: '1h 30m' },
                    { time: '16:00', client: 'Giulia Bianchi', service: 'Colore (Balayage)', duration: '2h 15m' },
                    { time: '18:15', client: 'Elena Ferrari', service: 'Piega Veloce', duration: '45m' }
                  ].map((apt, i) => (
                    <div key={i} className="p-5 flex items-center justify-between hover:bg-[#F9F7F1] transition-colors">
                      <div className="flex items-center gap-6">
                        <div className="text-center w-16">
                          <span className="block text-[#3A3748] font-playfair font-semibold text-lg">{apt.time}</span>
                          <span className="block text-[#9B98A8] text-xs mt-1">{apt.duration}</span>
                        </div>
                        <div className="w-px h-10 bg-[#EDE8D8]"></div>
                        <div>
                          <p className="text-[#3A3748] font-medium mb-1">{apt.client}</p>
                          <p className="text-[#8B8199] text-sm">{apt.service}</p>
                        </div>
                      </div>
                      <button className="text-[#5C5870] hover:bg-[#EDE8D8] p-2 rounded-md transition-colors">
                        <Settings className="w-5 h-5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Servizi più richiesti */}
            <div>
              <h3 className="font-playfair text-[#3A3748] text-xl font-semibold mb-4">
                Servizi più richiesti
              </h3>
              <div className="bg-[#FFFFFF] border border-[#E8E3D8] rounded-xl p-6 crema-shadow">
                <div className="space-y-6">
                  {[
                    { name: 'Piega', value: 85 },
                    { name: 'Taglio Donna', value: 65 },
                    { name: 'Colore Base', value: 45 },
                    { name: 'Balayage', value: 30 }
                  ].map((service, i) => (
                    <div key={i}>
                      <div className="flex justify-between text-sm mb-2">
                        <span className="text-[#3A3748] font-medium">{service.name}</span>
                        <span className="text-[#8B8199]">{service.value}%</span>
                      </div>
                      <div className="w-full h-2 bg-[#F5F0E3] rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-[#5C5870] rounded-full"
                          style={{ width: `${service.value}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

          </div>
        </div>
      </main>
    </div>
  );
}
