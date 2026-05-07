import React, { useState, useEffect, useCallback } from 'react';
import { useGetSettings, useUpdateSettings, getGetSettingsQueryKey } from '@workspace/api-client-react';
import { useQueryClient } from '@tanstack/react-query';
import { Save, Loader2, CheckCircle2, Palette, Scissors, Calendar, Star } from 'lucide-react';
import { cn } from '../lib/utils';
import { toast } from '../components/Toast';
import {
  BRAND_PRESETS,
  paletteFromCustomColor,
  applyBrandPalette,
  loadBrandPalette,
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
  return (
    <div
      className="rounded-2xl border overflow-hidden"
      style={{ borderColor: palette.muted, backgroundColor: palette.light }}
    >
      <div
        className="px-4 py-2.5 flex items-center justify-between"
        style={{ backgroundColor: palette.primary }}
      >
        <div className="flex items-center gap-2">
          <Scissors className="w-4 h-4 text-white opacity-90" />
          <span className="text-white text-sm font-semibold tracking-wide">HirHub</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span
            className="w-2 h-2 rounded-full opacity-60"
            style={{ backgroundColor: palette.muted }}
          />
          <span
            className="w-2 h-2 rounded-full opacity-60"
            style={{ backgroundColor: palette.muted }}
          />
        </div>
      </div>

      <div className="p-4 flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-stone-500 uppercase tracking-wide">Oggi</p>
            <p className="text-sm font-semibold text-stone-800 mt-0.5">3 appuntamenti</p>
          </div>
          <button
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-white shadow-sm transition-opacity"
            style={{ backgroundColor: palette.primary }}
          >
            <Calendar className="w-3 h-3" />
            Nuovo
          </button>
        </div>

        <div className="flex flex-wrap gap-1.5">
          <span
            className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium"
            style={{ backgroundColor: palette.muted, color: palette.dark }}
          >
            <Star className="w-3 h-3" />
            Taglio
          </span>
          <span
            className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium"
            style={{ backgroundColor: palette.muted, color: palette.dark }}
          >
            Colore
          </span>
          <span
            className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium"
            style={{ backgroundColor: palette.muted, color: palette.dark }}
          >
            Piega
          </span>
        </div>

        <div
          className="rounded-xl px-3 py-2.5 flex items-center gap-2 border"
          style={{ backgroundColor: palette.light, borderColor: palette.muted }}
        >
          <div
            className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 text-white text-[10px] font-bold"
            style={{ backgroundColor: palette.primary }}
          >
            MR
          </div>
          <div className="flex flex-col min-w-0">
            <span className="text-xs font-semibold text-stone-800 truncate">Maria Rossi</span>
            <span className="text-[10px] text-stone-400">10:30 · Taglio & Colore</span>
          </div>
          <span
            className="ml-auto text-[10px] font-medium px-2 py-0.5 rounded-full"
            style={{ backgroundColor: palette.muted, color: palette.dark }}
          >
            Confermato
          </span>
        </div>
      </div>
    </div>
  );
}

export const Settings = () => {
  const queryClient = useQueryClient();
  const { data: apiSettings, isLoading } = useGetSettings();
  const updateSettings = useUpdateSettings();

  const [salonName, setSalonName] = useState('');
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
    const payload = { salonName, address: address || null, phone: phone || null, email: email || null };
    queryClient.setQueryData(getGetSettingsQueryKey(), payload);
    updateSettings.mutate(
      { data: payload },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getGetSettingsQueryKey() });
          saveInfoFallback({ salonName, address, phone, email });
          setInfoSaved(true);
          setTimeout(() => setInfoSaved(false), 2500);
        },
        onError: () => {
          queryClient.invalidateQueries({ queryKey: getGetSettingsQueryKey() });
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
