import React, { useState, useEffect, useCallback } from 'react';
import {
  useGetSettings, useUpdateSettings, getGetSettingsQueryKey,
  useListStaff, useCreateStaffMember, useUpdateStaffMember, useDeleteStaffMember,
  getListStaffQueryKey,
} from '@workspace/api-client-react';
import { useQueryClient } from '@tanstack/react-query';
import { Save, Loader2, CheckCircle2, Palette, Calendar, Users, Plus, Pencil, Trash2, X, Check } from 'lucide-react';
import { cn } from '../lib/utils';
import { toast } from '../components/Toast';
import {
  BRAND_PRESETS,
  paletteFromCustomColor,
  applyBrandPalette,
  loadBrandPalette,
  mixWithWhite,
  type BrandPalette,
} from '../lib/brand-color';

const DAYS = [
  { key: 'monday', label: 'Lunedì' },
  { key: 'tuesday', label: 'Martedì' },
  { key: 'wednesday', label: 'Mercoledì' },
  { key: 'thursday', label: 'Giovedì' },
  { key: 'friday', label: 'Venerdì' },
  { key: 'saturday', label: 'Sabato' },
  { key: 'sunday', label: 'Domenica' },
] as const;

type DayKey = (typeof DAYS)[number]['key'];

interface DaySchedule {
  isOpen: boolean;
  openTime: string;
  closeTime: string;
}

type WorkingHours = Record<DayKey, DaySchedule>;

const DEFAULT_HOURS: WorkingHours = {
  monday: { isOpen: true, openTime: '09:00', closeTime: '19:00' },
  tuesday: { isOpen: true, openTime: '09:00', closeTime: '19:00' },
  wednesday: { isOpen: true, openTime: '09:00', closeTime: '19:00' },
  thursday: { isOpen: true, openTime: '09:00', closeTime: '19:00' },
  friday: { isOpen: true, openTime: '09:00', closeTime: '19:00' },
  saturday: { isOpen: true, openTime: '09:00', closeTime: '18:00' },
  sunday: { isOpen: false, openTime: '09:00', closeTime: '13:00' },
};

const LS_KEY = 'hirhub_working_hours';
const LS_INFO_KEY = 'hirhub_salon_info';

interface SalonInfo {
  salonName: string;
  logoUrl?: string | null;
  showSalonName?: boolean | null;
  address: string;
  phone: string;
  email: string;
}

function loadHours(): WorkingHours {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (raw) {
      return { ...DEFAULT_HOURS, ...JSON.parse(raw) } as WorkingHours;
    }
  } catch {}
  return DEFAULT_HOURS;
}

function loadInfoFallback(): SalonInfo | null {
  try {
    const raw = localStorage.getItem(LS_INFO_KEY);
    if (raw) return JSON.parse(raw) as SalonInfo;
  } catch {}
  return null;
}

function saveInfoFallback(info: SalonInfo) {
  try {
    localStorage.setItem(LS_INFO_KEY, JSON.stringify(info));
  } catch {}
}

const inputClass =
  'w-full px-3 py-2 bg-white border border-stone-200 rounded-xl text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-stone-300 placeholder:text-stone-400 transition';

function BrandPreview({ palette }: { palette: BrandPalette }) {
  const iconBg = mixWithWhite(palette.primary, 0.82);
  return (
    <div className="rounded-2xl border border-stone-100 overflow-hidden bg-[#f8f8f7]">
      <div
        className="px-4 py-3 flex items-center justify-between"
        style={{ backgroundColor: palette.dark }}
      >
        <div className="flex items-center gap-2">
          <span style={{ color: palette.muted, fontSize: '0.85rem', lineHeight: 1 }}>♥</span>
          <span className="text-white text-sm font-semibold" style={{ fontFamily: '"Playfair Display", serif' }}>
            Capelli &amp; Vanità
          </span>
        </div>
        <div className="flex flex-col items-start gap-0.5 ml-4">
          {['Dashboard', 'Agenda', 'Clienti'].map(item => (
            <span key={item} className="text-[9px] font-medium" style={{ color: palette.muted }}>
              {item}
            </span>
          ))}
        </div>
      </div>

      <div className="p-4 flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-semibold text-stone-800" style={{ fontFamily: '"Playfair Display", serif' }}>
            Agenda
          </h3>
          <button
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-white"
            style={{ backgroundColor: palette.dark }}
          >
            <Calendar className="w-3 h-3" />
            Nuovo
          </button>
        </div>

        <div
          className="rounded-xl p-3 flex flex-col gap-1 border text-white"
          style={{ backgroundColor: palette.dark, borderColor: palette.dark }}
        >
          <div className="flex justify-between items-start">
            <span className="text-[11px] font-semibold">Giulia Bianchi</span>
            <span className="text-[9px] opacity-70 font-mono">10:00</span>
          </div>
          <span className="text-[10px] opacity-70">Colore Base</span>
        </div>

        <div
          className="rounded-xl p-3 flex flex-col gap-1 border"
          style={{ backgroundColor: palette.light, borderColor: palette.muted }}
        >
          <div className="flex justify-between items-start">
            <span className="text-[11px] font-semibold" style={{ color: palette.dark }}>Marco Rossi</span>
            <span className="text-[9px] font-mono opacity-60" style={{ color: palette.dark }}>11:15</span>
          </div>
          <span className="text-[10px] opacity-60" style={{ color: palette.dark }}>Taglio Uomo</span>
        </div>

        <div className="flex items-center gap-2 bg-white rounded-xl p-2.5 border border-stone-100">
          <div
            className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 text-[10px] font-bold"
            style={{ backgroundColor: iconBg, color: palette.primary }}
          >
            EC
          </div>
          <div className="flex flex-col min-w-0">
            <span className="text-xs font-semibold text-stone-800 truncate">Elena Conti</span>
            <span className="text-[10px] text-stone-400">333 123 4567</span>
          </div>
        </div>
      </div>
    </div>
  );
}

const STAFF_COLORS = [
  '#6b7280', '#ef4444', '#f97316', '#eab308', '#22c55e',
  '#06b6d4', '#3b82f6', '#8b5cf6', '#ec4899', '#14b8a6',
];

export const Settings = () => {
  const queryClient = useQueryClient();
  const { data: apiSettings, isLoading } = useGetSettings();
  const updateSettings = useUpdateSettings();

  // Team
  const { data: staffList = [] } = useListStaff();
  const [newMember, setNewMember] = useState({ name: '', role: '', color: '#6b7280' });
  const [addingMember, setAddingMember] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editData, setEditData] = useState({ name: '', role: '', color: '#6b7280' });

  const { mutate: createMember, isPending: isCreating } = useCreateStaffMember({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListStaffQueryKey() });
        setNewMember({ name: '', role: '', color: '#6b7280' });
        setAddingMember(false);
        toast.show('Membro aggiunto');
      },
      onError: () => toast.show('Errore durante il salvataggio', 'error'),
    },
  });

  const { mutate: updateMember, isPending: isUpdating } = useUpdateStaffMember({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListStaffQueryKey() });
        setEditingId(null);
        toast.show('Membro aggiornato');
      },
      onError: () => toast.show('Errore durante il salvataggio', 'error'),
    },
  });

  const { mutate: deleteMember } = useDeleteStaffMember({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListStaffQueryKey() });
        toast.show('Membro rimosso');
      },
      onError: () => toast.show('Errore durante la rimozione', 'error'),
    },
  });

  const startEdit = (member: { id: string; name: string; role?: string | null; color: string }) => {
    setEditingId(member.id);
    setEditData({ name: member.name, role: member.role ?? '', color: member.color });
  };

  const [salonName, setSalonName] = useState('');
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [showSalonName, setShowSalonName] = useState(true);
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [infoSaved, setInfoSaved] = useState(false);

  const [hours, setHours] = useState<WorkingHours>(DEFAULT_HOURS);
  const [hoursSaved, setHoursSaved] = useState(false);

  const [activePalette, setActivePalette] = useState<BrandPalette>(() => loadBrandPalette());
  const [customColor, setCustomColor] = useState<string>(() => loadBrandPalette().primary);
  const [colorSaved, setColorSaved] = useState(false);

  useEffect(() => {
    if (apiSettings) {
      setSalonName(apiSettings.salonName ?? '');
      setLogoUrl(apiSettings.logoUrl ?? null);
      setShowSalonName(apiSettings.showSalonName ?? true);
      setAddress(apiSettings.address ?? '');
      setPhone(apiSettings.phone ?? '');
      setEmail(apiSettings.email ?? '');
      // Sync brand color UI state from server (CSS/LS handled by BrandColorSync in App.tsx)
      if (apiSettings.brandColor) {
        const preset = BRAND_PRESETS.find(p => p.primary.toLowerCase() === apiSettings.brandColor!.toLowerCase());
        const palette = preset ?? paletteFromCustomColor(apiSettings.brandColor);
        setActivePalette(palette);
        setCustomColor(palette.primary);
      }
    } else if (!isLoading) {
      const fallback = loadInfoFallback();
      if (fallback) {
        setSalonName(fallback.salonName);
        setLogoUrl(fallback.logoUrl ?? null);
        setShowSalonName(fallback.showSalonName ?? true);
        setAddress(fallback.address);
        setPhone(fallback.phone);
        setEmail(fallback.email);
      }
    }
  }, [apiSettings, isLoading]);

  useEffect(() => {
    setHours(loadHours());
  }, []);

  const handleSaveInfo = () => {
    const payload = {
      salonName,
      logoUrl,
      showSalonName,
      address: address || null,
      phone: phone || null,
      email: email || null,
    };
    queryClient.setQueryData(getGetSettingsQueryKey(), payload);
    updateSettings.mutate(
      { data: payload },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getGetSettingsQueryKey() });
          saveInfoFallback({ salonName, logoUrl, showSalonName, address, phone, email });
          setInfoSaved(true);
          setTimeout(() => setInfoSaved(false), 2500);
        },
        onError: () => {
          queryClient.invalidateQueries({ queryKey: getGetSettingsQueryKey() });
          toast.show('Errore durante il salvataggio delle informazioni', 'error');
        },
      }
    );
  };

  const handleSaveHours = () => {
    localStorage.setItem(LS_KEY, JSON.stringify(hours));
    setHoursSaved(true);
    setTimeout(() => setHoursSaved(false), 2500);
  };

  const updateDay = (day: DayKey, patch: Partial<DaySchedule>) => {
    setHours(prev => ({ ...prev, [day]: { ...prev[day], ...patch } }));
  };

  const handleSelectPreset = useCallback((preset: BrandPalette) => {
    setActivePalette(preset);
    setCustomColor(preset.primary);
    applyBrandPalette(preset);
  }, []);

  const handleCustomColorChange = useCallback((hex: string) => {
    setCustomColor(hex);
    const palette = paletteFromCustomColor(hex);
    setActivePalette(palette);
    applyBrandPalette(palette);
  }, []);

  const handleSaveColor = () => {
    const payload = {
      salonName: salonName || 'L\'Atelier',
      address: address || null,
      phone: phone || null,
      email: email || null,
      brandColor: activePalette.primary,
    };
    queryClient.setQueryData(getGetSettingsQueryKey(), payload);
    updateSettings.mutate(
      { data: payload },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getGetSettingsQueryKey() });
          setColorSaved(true);
          setTimeout(() => setColorSaved(false), 2500);
        },
        onError: () => {
          queryClient.invalidateQueries({ queryKey: getGetSettingsQueryKey() });
          toast.show('Errore durante il salvataggio del colore', 'error');
        },
      }
    );
  };

  const isPresetActive = (preset: BrandPalette) =>
    activePalette.key === preset.key;

  const isCustomActive = activePalette.key === 'custom';

  return (
    <div className="flex flex-col gap-8 page-enter">
      <section>
        <span className="text-stone-500 text-sm font-medium tracking-wide uppercase">Configurazione</span>
        <h1 className="text-3xl font-serif text-stone-900 mt-1 mb-6">Impostazioni</h1>

        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-stone-400" />
          </div>
        ) : (
          <div className="flex flex-col gap-6">

            {/* Salon info card */}
            <div className="bg-white rounded-2xl border border-stone-100 shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-stone-100">
                <h2 className="text-base font-semibold text-stone-900">Informazioni Salone</h2>
                <p className="text-sm text-stone-500 mt-0.5">Nome e contatti del tuo salone.</p>
              </div>

              <div className="p-6 flex flex-col gap-4">
                <div>
                  <label className="block text-xs font-medium text-stone-600 mb-1.5 uppercase tracking-wide">
                    Nome del salone *
                  </label>
                  <input
                    type="text"
                    value={salonName}
                    onChange={e => setSalonName(e.target.value)}
                    placeholder="Es. L'Atelier"
                    className={inputClass}
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-stone-600 mb-1.5 uppercase tracking-wide">
                    Logo (opzionale)
                  </label>
                  <div className="flex items-center gap-3">
                    <div className="w-14 h-14 rounded-2xl border border-stone-200 bg-stone-50 flex items-center justify-center overflow-hidden shrink-0">
                      {logoUrl ? (
                        <img src={logoUrl} alt="Logo salone" className="w-full h-full object-contain" />
                      ) : (
                        <span className="text-stone-400 text-sm">—</span>
                      )}
                    </div>
                    <div className="flex flex-col gap-2">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          e.currentTarget.value = '';
                          if (!file) return;
                          if (!file.type.startsWith('image/')) {
                            toast.show('Seleziona un file immagine (PNG/JPG)', 'error');
                            return;
                          }
                          if (file.size > 500_000) {
                            toast.show('Logo troppo grande (max 500 KB)', 'error');
                            return;
                          }
                          const reader = new FileReader();
                          reader.onload = () => {
                            const result = reader.result;
                            if (typeof result === 'string') setLogoUrl(result);
                          };
                          reader.readAsDataURL(file);
                        }}
                        className="text-sm text-stone-700"
                      />
                      {logoUrl ? (
                        <button
                          type="button"
                          onClick={() => setLogoUrl(null)}
                          className="text-xs font-medium text-stone-600 hover:text-stone-900 transition-colors text-left"
                        >
                          Rimuovi logo
                        </button>
                      ) : null}
                    </div>
                  </div>
                </div>

                <label className="flex items-center gap-2 text-sm text-stone-700">
                  <input
                    type="checkbox"
                    checked={showSalonName}
                    onChange={(e) => setShowSalonName(e.target.checked)}
                    className="w-4 h-4 rounded border-stone-300 accent-stone-900"
                  />
                  Mostra nome del salone nell'header
                </label>

                <div>
                  <label className="block text-xs font-medium text-stone-600 mb-1.5 uppercase tracking-wide">
                    Indirizzo
                  </label>
                  <input
                    type="text"
                    value={address}
                    onChange={e => setAddress(e.target.value)}
                    placeholder="Es. Via Roma 12, Milano"
                    className={inputClass}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-stone-600 mb-1.5 uppercase tracking-wide">
                      Telefono
                    </label>
                    <input
                      type="tel"
                      value={phone}
                      onChange={e => setPhone(e.target.value)}
                      placeholder="Es. 02 1234 5678"
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-stone-600 mb-1.5 uppercase tracking-wide">
                      Email di contatto
                    </label>
                    <input
                      type="email"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      placeholder="Es. info@latelier.it"
                      className={inputClass}
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-stone-100 mt-2">
                  {infoSaved ? (
                    <span className="flex items-center gap-1.5 text-sm text-green-600 font-medium">
                      <CheckCircle2 className="w-4 h-4" /> Salvato
                    </span>
                  ) : (
                    <span />
                  )}
                  <button
                    onClick={handleSaveInfo}
                    disabled={updateSettings.isPending || !salonName.trim()}
                    className={cn(
                      'flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-colors',
                      'bg-stone-900 text-white hover:bg-stone-800 disabled:opacity-50 disabled:cursor-not-allowed'
                    )}
                  >
                    {updateSettings.isPending ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Save className="w-4 h-4" />
                    )}
                    Salva informazioni
                  </button>
                </div>
              </div>
            </div>

            {/* Brand color card */}
            <div className="bg-white rounded-2xl border border-stone-100 shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-stone-100">
                <div className="flex items-center gap-2">
                  <Palette className="w-4 h-4 text-stone-400" />
                  <h2 className="text-base font-semibold text-stone-900">Colore Brand</h2>
                </div>
                <p className="text-sm text-stone-500 mt-0.5">
                  Scegli il colore principale dell'interfaccia. La modifica è visibile subito.
                </p>
              </div>

              <div className="p-6 flex flex-col gap-5">
                <div>
                  <label className="block text-xs font-medium text-stone-600 mb-3 uppercase tracking-wide">
                    Palette predefinite
                  </label>
                  <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
                    {BRAND_PRESETS.map(preset => (
                      <button
                        key={preset.key}
                        type="button"
                        onClick={() => handleSelectPreset(preset)}
                        title={preset.label}
                        className={cn(
                          'flex flex-col items-center gap-1.5 p-2 rounded-xl border-2 transition-all',
                          isPresetActive(preset)
                            ? 'border-stone-900 shadow-sm'
                            : 'border-transparent hover:border-stone-200'
                        )}
                      >
                        <span
                          className="w-8 h-8 rounded-full shadow-sm block"
                          style={{ backgroundColor: preset.primary }}
                        />
                        <span className="text-[10px] text-stone-500 leading-tight text-center">
                          {preset.label}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="border-t border-stone-100 pt-5">
                  <label className="block text-xs font-medium text-stone-600 mb-3 uppercase tracking-wide">
                    Colore personalizzato
                  </label>
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <input
                        type="color"
                        value={customColor}
                        onChange={e => handleCustomColorChange(e.target.value)}
                        className="w-10 h-10 rounded-xl border border-stone-200 cursor-pointer p-0.5 bg-white"
                      />
                    </div>
                    <div className="flex flex-col">
                      <span className="text-sm text-stone-700 font-medium">
                        {isCustomActive ? 'Personalizzato' : (activePalette.label)}
                      </span>
                      <span className="text-xs text-stone-400 font-mono">{activePalette.primary}</span>
                    </div>
                    <div className="flex items-center gap-2 ml-2">
                      <span
                        className="w-5 h-5 rounded-full shadow-sm"
                        style={{ backgroundColor: activePalette.primary }}
                      />
                      <span
                        className="w-5 h-5 rounded-full shadow-sm"
                        style={{ backgroundColor: activePalette.dark }}
                      />
                      <span
                        className="w-5 h-5 rounded-full shadow-sm"
                        style={{ backgroundColor: activePalette.muted }}
                      />
                      <span
                        className="w-5 h-5 rounded-full shadow-sm border border-stone-100"
                        style={{ backgroundColor: activePalette.light }}
                      />
                    </div>
                  </div>
                </div>

                <div className="border-t border-stone-100 pt-5">
                  <label className="block text-xs font-medium text-stone-600 mb-3 uppercase tracking-wide">
                    Anteprima
                  </label>
                  <BrandPreview palette={activePalette} />
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-stone-100">
                  {colorSaved ? (
                    <span className="flex items-center gap-1.5 text-sm text-green-600 font-medium">
                      <CheckCircle2 className="w-4 h-4" /> Salvato
                    </span>
                  ) : (
                    <span className="text-xs text-stone-400">
                      Le modifiche sono visibili subito ma vanno salvate per essere mantenute.
                    </span>
                  )}
                  <button
                    onClick={handleSaveColor}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium bg-stone-900 text-white hover:bg-stone-800 transition-colors"
                  >
                    <Save className="w-4 h-4" />
                    Salva colore
                  </button>
                </div>
              </div>
            </div>

            {/* Team card */}
            <div className="bg-white rounded-2xl border border-stone-100 shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-stone-100">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-stone-400" />
                  <h2 className="text-base font-semibold text-stone-900">Team</h2>
                </div>
                <p className="text-sm text-stone-500 mt-0.5">Gestisci gli operatori del salone.</p>
              </div>

              <div className="divide-y divide-stone-50">
                {staffList.map(member => (
                  <div key={member.id} className="px-6 py-3 flex items-center gap-3">
                    {editingId === member.id ? (
                      <>
                        <input
                          type="color"
                          value={editData.color}
                          onChange={e => setEditData(p => ({ ...p, color: e.target.value }))}
                          className="w-8 h-8 rounded-lg border border-stone-200 cursor-pointer p-0.5 bg-white shrink-0"
                        />
                        <input
                          type="text"
                          value={editData.name}
                          onChange={e => setEditData(p => ({ ...p, name: e.target.value }))}
                          placeholder="Nome"
                          className="flex-1 min-w-0 px-2.5 py-1.5 bg-stone-50 border border-stone-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-stone-300"
                        />
                        <input
                          type="text"
                          value={editData.role}
                          onChange={e => setEditData(p => ({ ...p, role: e.target.value }))}
                          placeholder="Ruolo (opz.)"
                          className="w-28 shrink-0 px-2.5 py-1.5 bg-stone-50 border border-stone-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-stone-300"
                        />
                        <button
                          onClick={() => updateMember({ id: member.id, data: { name: editData.name, role: editData.role || null, color: editData.color } })}
                          disabled={isUpdating || !editData.name.trim()}
                          className="p-1.5 rounded-lg bg-stone-900 text-white hover:bg-stone-700 disabled:opacity-50 shrink-0"
                        >
                          <Check className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => setEditingId(null)} className="p-1.5 rounded-lg text-stone-400 hover:text-stone-700 shrink-0">
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </>
                    ) : (
                      <>
                        <span className="w-8 h-8 rounded-full shrink-0 border border-stone-100" style={{ backgroundColor: member.color }} />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-stone-900 truncate">{member.name}</p>
                          {member.role && <p className="text-xs text-stone-400 truncate">{member.role}</p>}
                        </div>
                        <button onClick={() => startEdit(member)} className="p-1.5 rounded-lg text-stone-400 hover:text-stone-700 transition-colors shrink-0">
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => window.confirm(`Rimuovere ${member.name}?`) && deleteMember({ id: member.id })}
                          className="p-1.5 rounded-lg text-red-300 hover:text-red-500 transition-colors shrink-0"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </>
                    )}
                  </div>
                ))}

                {addingMember ? (
                  <div className="px-6 py-3 flex items-center gap-3 bg-stone-50">
                    <input
                      type="color"
                      value={newMember.color}
                      onChange={e => setNewMember(p => ({ ...p, color: e.target.value }))}
                      className="w-8 h-8 rounded-lg border border-stone-200 cursor-pointer p-0.5 bg-white shrink-0"
                    />
                    <div className="flex gap-1.5 flex-wrap mb-0">
                      {STAFF_COLORS.map(c => (
                        <button
                          key={c}
                          type="button"
                          onClick={() => setNewMember(p => ({ ...p, color: c }))}
                          className={cn('w-5 h-5 rounded-full border-2 shrink-0 transition-all', newMember.color === c ? 'border-stone-900 scale-110' : 'border-transparent')}
                          style={{ backgroundColor: c }}
                        />
                      ))}
                    </div>
                    <input
                      autoFocus
                      type="text"
                      value={newMember.name}
                      onChange={e => setNewMember(p => ({ ...p, name: e.target.value }))}
                      placeholder="Nome operatore"
                      className="flex-1 min-w-0 px-2.5 py-1.5 bg-white border border-stone-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-stone-300"
                    />
                    <input
                      type="text"
                      value={newMember.role}
                      onChange={e => setNewMember(p => ({ ...p, role: e.target.value }))}
                      placeholder="Ruolo (opz.)"
                      className="w-28 shrink-0 px-2.5 py-1.5 bg-white border border-stone-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-stone-300"
                    />
                    <button
                      onClick={() => createMember({ data: { name: newMember.name, role: newMember.role || null, color: newMember.color } })}
                      disabled={isCreating || !newMember.name.trim()}
                      className="p-1.5 rounded-lg bg-stone-900 text-white hover:bg-stone-700 disabled:opacity-50 shrink-0"
                    >
                      <Check className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => setAddingMember(false)} className="p-1.5 rounded-lg text-stone-400 hover:text-stone-700 shrink-0">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <div className="px-6 py-3">
                    <button
                      onClick={() => setAddingMember(true)}
                      className="flex items-center gap-2 text-sm text-stone-500 hover:text-stone-900 transition-colors"
                    >
                      <Plus className="w-4 h-4" />
                      Aggiungi operatore
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Working hours card */}
            <div className="bg-white rounded-2xl border border-stone-100 shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-stone-100">
                <h2 className="text-base font-semibold text-stone-900">Orari di Apertura</h2>
                <p className="text-sm text-stone-500 mt-0.5">Imposta gli orari di apertura per ogni giorno della settimana.</p>
              </div>

              <div className="divide-y divide-stone-100">
                {DAYS.map(({ key, label }) => {
                  const day = hours[key];
                  return (
                    <div key={key} className="px-6 py-4 flex flex-col sm:flex-row sm:items-center gap-3">
                      <div className="w-28 shrink-0">
                        <span className="text-sm font-medium text-stone-800">{label}</span>
                      </div>

                      <div className="flex items-center gap-3 flex-1">
                        <button
                          type="button"
                          onClick={() => updateDay(key, { isOpen: !day.isOpen })}
                          className={cn(
                            'relative inline-flex h-5 w-9 items-center rounded-full transition-colors shrink-0',
                            day.isOpen ? 'bg-stone-800' : 'bg-stone-200'
                          )}
                        >
                          <span
                            className={cn(
                              'inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform',
                              day.isOpen ? 'translate-x-4' : 'translate-x-1'
                            )}
                          />
                        </button>

                        {day.isOpen ? (
                          <div className="flex items-center gap-2 flex-1">
                            <input
                              type="time"
                              value={day.openTime}
                              onChange={e => updateDay(key, { openTime: e.target.value })}
                              className="px-2.5 py-1.5 bg-stone-50 border border-stone-200 rounded-lg text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-stone-300"
                            />
                            <span className="text-stone-400 text-sm">–</span>
                            <input
                              type="time"
                              value={day.closeTime}
                              onChange={e => updateDay(key, { closeTime: e.target.value })}
                              className="px-2.5 py-1.5 bg-stone-50 border border-stone-200 rounded-lg text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-stone-300"
                            />
                          </div>
                        ) : (
                          <span className="text-sm text-stone-400 italic">Chiuso</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="px-6 py-4 border-t border-stone-100 flex items-center justify-between">
                {hoursSaved ? (
                  <span className="flex items-center gap-1.5 text-sm text-green-600 font-medium">
                    <CheckCircle2 className="w-4 h-4" /> Salvato
                  </span>
                ) : (
                  <span />
                )}
                <button
                  onClick={handleSaveHours}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium bg-stone-900 text-white hover:bg-stone-800 transition-colors"
                >
                  <Save className="w-4 h-4" />
                  Salva orari
                </button>
              </div>
            </div>

          </div>
        )}
      </section>
    </div>
  );
};
