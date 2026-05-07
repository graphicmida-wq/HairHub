import React from 'react';
import { 
  Home, 
  Calendar, 
  Users, 
  Package, 
  Settings, 
  TrendingUp, 
  Clock, 
  Plus,
  Scissors,
  CheckCircle2,
  MoreHorizontal,
  ChevronRight
} from 'lucide-react';

export function PergamenaScura() {
  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,600;1,400&family=Inter:wght@300;400;500;600&display=swap');
      `}</style>
      <div style={{ display: 'flex', minHeight: '100vh', background: '#3A3748', fontFamily: 'Inter, sans-serif' }}>
        
        {/* Sidebar */}
        <aside className="w-[220px] flex-shrink-0 flex flex-col justify-between" style={{ backgroundColor: '#3A3748', borderRight: '1px solid rgba(245,240,227,0.05)' }}>
          <div>
            <div className="p-6">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-[#C4AA7E] text-xl">♥</span>
                <h2 className="text-[#F5F0E3] text-xl font-semibold tracking-wide" style={{ fontFamily: '"Playfair Display", serif' }}>
                  Capelli & Vanitá
                </h2>
              </div>
              <p className="text-[#C8C4D4] text-xs uppercase tracking-widest ml-7">Gestione Salone</p>
            </div>
            
            <nav className="px-3 mt-6 space-y-1">
              <a href="#" className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-[rgba(245,240,227,0.15)] text-[#F5F0E3] font-medium transition-colors">
                <Home size={18} />
                <span>Dashboard</span>
              </a>
              <a href="#" className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-[#C8C4D4] hover:text-[#F5F0E3] hover:bg-[rgba(245,240,227,0.05)] transition-colors">
                <Calendar size={18} />
                <span>Appuntamenti</span>
              </a>
              <a href="#" className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-[#C8C4D4] hover:text-[#F5F0E3] hover:bg-[rgba(245,240,227,0.05)] transition-colors">
                <Users size={18} />
                <span>Clienti</span>
              </a>
              <a href="#" className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-[#C8C4D4] hover:text-[#F5F0E3] hover:bg-[rgba(245,240,227,0.05)] transition-colors">
                <Scissors size={18} />
                <span>Servizi</span>
              </a>
              <a href="#" className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-[#C8C4D4] hover:text-[#F5F0E3] hover:bg-[rgba(245,240,227,0.05)] transition-colors">
                <Package size={18} />
                <span>Inventario</span>
              </a>
            </nav>
          </div>
          
          <div className="p-6">
            <a href="#" className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-[#C8C4D4] hover:text-[#F5F0E3] hover:bg-[rgba(245,240,227,0.05)] transition-colors mb-4">
              <Settings size={18} />
              <span>Impostazioni</span>
            </a>
            <div className="px-3 pt-4 border-t border-[rgba(245,240,227,0.1)]">
              <p className="text-[#C8C4D4] text-sm">24 Ottobre 2023</p>
              <p className="text-[#9B98A8] text-xs mt-1">Giusy Ferro</p>
            </div>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 overflow-auto p-8 rounded-l-2xl" style={{ backgroundColor: '#FAF7EE' }}>
          <div className="max-w-6xl mx-auto">
            
            {/* Header */}
            <header className="flex justify-between items-end mb-10">
              <div>
                <p className="text-[#9B98A8] text-xs uppercase tracking-[0.2em] font-medium mb-2">Bentornato</p>
                <h1 className="text-[#3A3748] text-4xl" style={{ fontFamily: '"Playfair Display", serif' }}>Panoramica del Mese</h1>
              </div>
              
              <div className="flex gap-3">
                <button className="px-5 py-2.5 rounded-full border border-[#E8E3D8] text-[#5C5870] bg-white hover:bg-[#F5F0E3] transition-colors font-medium text-sm shadow-sm flex items-center gap-2">
                  <Calendar size={16} />
                  Vedi Agenda
                </button>
                <button className="px-5 py-2.5 rounded-full bg-[#3A3748] text-white hover:bg-[#5C5870] transition-colors font-medium text-sm shadow-sm flex items-center gap-2">
                  <Plus size={16} />
                  Nuovo Appuntamento
                </button>
              </div>
            </header>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-10">
              {[
                { label: 'Fatturato', value: '€3.240', trend: '+12.5%', icon: <TrendingUp size={20} className="text-[#3A3748]" /> },
                { label: 'Appuntamenti', value: '47', trend: 'In linea', icon: <Calendar size={20} className="text-[#3A3748]" /> },
                { label: 'No-show', value: '3.2%', trend: '-1.1%', icon: <CheckCircle2 size={20} className="text-[#3A3748]" /> },
                { label: 'Nuovi Clienti', value: '8', trend: '+2', icon: <Users size={20} className="text-[#3A3748]" /> }
              ].map((kpi, i) => (
                <div key={i} className="bg-white p-6 rounded-2xl border border-[#E8E3D8] shadow-[0_2px_10px_rgba(92,88,112,0.03)] flex flex-col relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-6 opacity-10 pointer-events-none">
                    {kpi.icon}
                  </div>
                  <div className="w-10 h-10 rounded-full bg-[#F5F0E3] flex items-center justify-center mb-4">
                    {kpi.icon}
                  </div>
                  <p className="text-[#9B98A8] text-xs uppercase tracking-wider font-medium mb-1">{kpi.label}</p>
                  <p className="text-[#3A3748] text-3xl font-semibold mb-2" style={{ fontFamily: '"Playfair Display", serif' }}>{kpi.value}</p>
                  <p className="text-[#5C5870] text-sm font-medium">{kpi.trend}</p>
                </div>
              ))}
            </div>

            {/* 2-Column Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              
              {/* Prossimi Appuntamenti */}
              <div className="bg-white p-6 rounded-2xl border border-[#E8E3D8] shadow-[0_2px_10px_rgba(92,88,112,0.03)]">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-[#3A3748] text-xl" style={{ fontFamily: '"Playfair Display", serif' }}>Prossimi Appuntamenti</h3>
                  <button className="text-[#5C5870] hover:text-[#3A3748] p-1"><MoreHorizontal size={20}/></button>
                </div>
                
                <div className="space-y-4">
                  {[
                    { time: '09:00', client: 'Elena Rossi', service: 'Taglio & Piega', duration: '1h 30m' },
                    { time: '11:00', client: 'Martina Bianchi', service: 'Colore + Balayage', duration: '2h 15m' },
                    { time: '14:30', client: 'Chiara Verdi', service: 'Trattamento Ristrutturante', duration: '45m' },
                    { time: '16:00', client: 'Giulia Neri', service: 'Piega Gloss', duration: '45m' }
                  ].map((apt, i) => (
                    <div key={i} className="flex items-center p-3 rounded-xl hover:bg-[#FAF7EE] transition-colors group cursor-pointer border border-transparent hover:border-[#E8E3D8]">
                      <div className="w-16 flex flex-col items-center justify-center border-r border-[#E8E3D8] pr-3 mr-4">
                        <span className="text-[#3A3748] font-semibold">{apt.time}</span>
                        <span className="text-[#9B98A8] text-xs flex items-center gap-1 mt-0.5"><Clock size={10} /> {apt.duration}</span>
                      </div>
                      <div className="flex-1">
                        <p className="text-[#3A3748] font-medium">{apt.client}</p>
                        <p className="text-[#6B6880] text-sm">{apt.service}</p>
                      </div>
                      <div className="w-8 h-8 rounded-full border border-[#E8E3D8] flex items-center justify-center text-[#5C5870] group-hover:bg-white group-hover:shadow-sm transition-all">
                        <ChevronRight size={16} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Servizi più richiesti */}
              <div className="bg-white p-6 rounded-2xl border border-[#E8E3D8] shadow-[0_2px_10px_rgba(92,88,112,0.03)]">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-[#3A3748] text-xl" style={{ fontFamily: '"Playfair Display", serif' }}>Servizi più richiesti</h3>
                  <button className="text-[#5C5870] text-sm hover:underline font-medium">Vedi tutti</button>
                </div>
                
                <div className="space-y-6 mt-2">
                  {[
                    { name: 'Piega', count: 124, percent: 85 },
                    { name: 'Taglio Donna', count: 98, percent: 70 },
                    { name: 'Colore Base', count: 76, percent: 55 },
                    { name: 'Balayage / Schiariture', count: 42, percent: 35 },
                    { name: 'Trattamento SPA Capelli', count: 28, percent: 20 }
                  ].map((service, i) => (
                    <div key={i}>
                      <div className="flex justify-between text-sm mb-2">
                        <span className="text-[#3A3748] font-medium">{service.name}</span>
                        <span className="text-[#6B6880]">{service.count} esecuzioni</span>
                      </div>
                      <div className="w-full h-2 bg-[#FAF7EE] rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-[#3A3748] rounded-full" 
                          style={{ width: `${service.percent}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
                
                <div className="mt-8 pt-6 border-t border-[#E8E3D8]">
                  <div className="flex items-center justify-between p-4 bg-[#FAF7EE] rounded-xl border border-[#E8E3D8]">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-[#F5F0E3] flex items-center justify-center text-[#C4AA7E]">
                        <span className="text-xl">♥</span>
                      </div>
                      <div>
                        <p className="text-[#3A3748] font-medium">Nuova Collezione Prodotti</p>
                        <p className="text-[#6B6880] text-xs">Aggiungi i nuovi arrivi all'inventario</p>
                      </div>
                    </div>
                    <button className="text-[#3A3748] font-semibold text-sm hover:underline">Gestisci</button>
                  </div>
                </div>
                
              </div>
            </div>
            
          </div>
        </main>
      </div>
    </>
  );
}
