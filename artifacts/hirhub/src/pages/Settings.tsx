import React, { useState, useEffect, useCallback } from 'react';
import { useGetSettings, useUpdateSettings, getGetSettingsQueryKey } from '@workspace/api-client-react';
import { useQueryClient } from '@tanstack/react-query';
import { Save, Loader2, CheckCircle2, Palette, Calendar, RotateCcw } from 'lucide-react';
import { cn } from '../lib/utils';
import { toast } from '../components/Toast';
import { FontSizeCard } from '../components/FontSizeCard';
import { ThemeCard } from '../components/ThemeCard';
import { CatalogCard } from '../components/CatalogCard';
import { ReminderTemplateCard } from '../components/ReminderTemplateCard';
import {
  BRAND_PRESETS,
  paletteFromCustomColor,
  applyBrandPalette,
  loadBrandPalette,
  mixWithWhite,
  type BrandPalette,
} from '../lib/brand-color';
import {
  BACKGROUND_PRESETS,
  DEFAULT_BACKGROUND,
  applyPageBackground,
  loadPageBackground,
  needsLightText,
  normalizeBackground,
} from '../lib/page-background';
import { GuideLink } from '../components/GuideLink';

const LS_INFO_KEY = 'hirhub_salon_info';

interface SalonInfo {
  salonName: string;
  logoUrl?: string | null;
  showSalonName?: boolean | null;
  address: string;
  phone: string;
  email: string;
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

function BrandPreview({ palette, background, salonName }: { palette: BrandPalette; background: string; salonName: string }) {
  const iconBg = mixWithWhite(palette.primary, 0.82);
  const onPage = needsLightText(background) ? '#fafaf9' : '#292524';
  return (
    <div className="rounded-2xl border border-stone-100 overflow-hidden" style={{ backgroundColor: background }}>
      <div
        className="px-4 py-3 flex items-center justify-between"
        style={{ backgroundColor: palette.dark }}
      >
        <div className="flex items-center gap-2">
          <span style={{ color: palette.muted, fontSize: '0.85rem', lineHeight: 1 }}>♥</span>
          <span className="text-white text-sm font-semibold" style={{ fontFamily: '"Playfair Display", serif' }}>
            {salonName}
          </span>
        </div>
        <div className="flex flex-col items-start gap-0.5 ml-4">
          {['Dashboard', 'Agenda', 'Clienti'].map(item => (
            <span key={item} className="text-[0.5625rem] font-medium" style={{ color: palette.muted }}>
              {item}
            </span>
          ))}
        </div>
      </div>

      <div className="p-4 flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-semibold" style={{ fontFamily: '"Playfair Display", serif', color: onPage }}>
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
            <span className="text-[0.6875rem] font-semibold">Giulia Bianchi</span>
            <span className="text-[0.5625rem] opacity-70 font-mono">10:00</span>
          </div>
          <span className="text-[0.625rem] opacity-70">Colore Base</span>
        </div>

        <div
          className="rounded-xl p-3 flex flex-col gap-1 border"
          style={{ backgroundColor: palette.light, borderColor: palette.muted }}
        >
          <div className="flex justify-between items-start">
            <span className="text-[0.6875rem] font-semibold" style={{ color: palette.dark }}>Marco Rossi</span>
            <span className="text-[0.5625rem] font-mono opacity-60" style={{ color: palette.dark }}>11:15</span>
          </div>
          <span className="text-[0.625rem] opacity-60" style={{ color: palette.dark }}>Taglio Uomo</span>
        </div>

        <div className="flex items-center gap-2 bg-white rounded-xl p-2.5 border border-stone-100">
          <div
            className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 text-[0.625rem] font-bold"
            style={{ backgroundColor: iconBg, color: palette.primary }}
          >
            EC
          </div>
          <div className="flex flex-col min-w-0">
            <span className="text-xs font-semibold text-stone-800 truncate">Elena Conti</span>
            <span className="text-[0.625rem] text-stone-400">333 123 4567</span>
          </div>
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
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [showSalonName, setShowSalonName] = useState(true);
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [infoSaved, setInfoSaved] = useState(false);

  const [activePalette, setActivePalette] = useState<BrandPalette>(() => loadBrandPalette());
  const [customColor, setCustomColor] = useState<string>(() => loadBrandPalette().primary);
  const [colorSaved, setColorSaved] = useState(false);
  const [background, setBackground] = useState<string>(() => loadPageBackground());

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
      setBackground(normalizeBackground(apiSettings.backgroundColor));
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

  const handleSelectBackground = useCallback((color: string) => {
    const bg = normalizeBackground(color);
    setBackground(bg);
    applyPageBackground(bg);
  }, []);

  const handleSaveColor = () => {
    const payload = {
      salonName: salonName || 'L\'Atelier',
      address: address || null,
      phone: phone || null,
      email: email || null,
      brandColor: activePalette.primary,
      // The default grey is stored as "no choice", so a future default change applies
      backgroundColor: background === DEFAULT_BACKGROUND ? null : background,
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
          toast.show('Errore durante il salvataggio dei colori', 'error');
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
        <span className="text-on-page-muted text-sm font-medium tracking-wide uppercase">Configurazione</span>
        <div className="flex items-center gap-3 flex-wrap mt-1 mb-6">
          <h1 className="text-3xl font-serif text-on-page">Impostazioni</h1>
          <GuideLink chapter="impostazioni" />
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-on-page-muted" />
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

            <ReminderTemplateCard />

            <FontSizeCard />

            <ThemeCard palette={activePalette} pageBackground={background} />

            {/* Brand color card */}
            <div className="bg-white rounded-2xl border border-stone-100 shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-stone-100">
                <div className="flex items-center gap-2">
                  <Palette className="w-4 h-4 text-stone-400" />
                  <h2 className="text-base font-semibold text-stone-900">Colori dell'app</h2>
                </div>
                <p className="text-sm text-stone-500 mt-0.5">
                  Colore principale di menu e pulsanti e colore dello sfondo. Le modifiche sono visibili subito.
                </p>
              </div>

              <div className="p-6 flex flex-col gap-5">
                <div>
                  <label className="block text-xs font-medium text-stone-600 mb-3 uppercase tracking-wide">
                    Colore principale · menu e pulsanti
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
                        <span className="text-[0.625rem] text-stone-500 leading-tight text-center">
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
                  <div className="flex items-center justify-between mb-3">
                    <label className="block text-xs font-medium text-stone-600 uppercase tracking-wide">
                      Sfondo
                    </label>
                    {background !== DEFAULT_BACKGROUND && (
                      <button
                        type="button"
                        onClick={() => handleSelectBackground(DEFAULT_BACKGROUND)}
                        className="flex items-center gap-1 text-xs text-stone-500 hover:text-stone-800 transition-colors"
                      >
                        <RotateCcw className="w-3.5 h-3.5" /> Ripristina
                      </button>
                    )}
                  </div>
                  <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                    {BACKGROUND_PRESETS.map(preset => (
                      <button
                        key={preset.key}
                        type="button"
                        onClick={() => handleSelectBackground(preset.color)}
                        title={preset.label}
                        className={cn(
                          'flex flex-col items-center gap-1.5 p-2 rounded-xl border-2 transition-all',
                          background === preset.color
                            ? 'border-stone-900 shadow-sm'
                            : 'border-transparent hover:border-stone-200'
                        )}
                      >
                        <span
                          className="w-10 h-8 rounded-lg block border border-stone-200"
                          style={{ backgroundColor: preset.color }}
                        />
                        <span className="text-[0.625rem] text-stone-500 leading-tight text-center">
                          {preset.label}
                        </span>
                      </button>
                    ))}
                  </div>
                  <div className="flex items-center gap-3 mt-4">
                    <input
                      type="color"
                      value={background}
                      onChange={e => handleSelectBackground(e.target.value)}
                      className="w-10 h-10 rounded-xl border border-stone-200 cursor-pointer p-0.5 bg-white"
                    />
                    <div className="flex flex-col">
                      <span className="text-sm text-stone-700 font-medium">
                        {BACKGROUND_PRESETS.find(p => p.color === background)?.label ?? 'Personalizzato'}
                      </span>
                      <span className="text-xs text-stone-400 font-mono">{background}</span>
                    </div>
                  </div>
                  {needsLightText(background) && (
                    <p className="text-xs text-stone-500 mt-3">
                      Sfondo scuro: i titoli e i testi scritti sullo sfondo diventano chiari automaticamente.
                    </p>
                  )}
                </div>

                <div className="border-t border-stone-100 pt-5">
                  <label className="block text-xs font-medium text-stone-600 mb-3 uppercase tracking-wide">
                    Anteprima
                  </label>
                  <BrandPreview palette={activePalette} background={background} salonName={salonName.trim() || 'Il tuo salone'} />
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
                    Salva colori
                  </button>
                </div>
              </div>
            </div>

            <CatalogCard />

          </div>
        )}
      </section>
    </div>
  );
};
