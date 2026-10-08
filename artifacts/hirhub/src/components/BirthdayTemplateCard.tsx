import React, { useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Cake, CheckCircle2, Loader2, RotateCcw, Save } from 'lucide-react';
import { getGetSettingsQueryKey, useGetSettings, useUpdateSettings } from '@workspace/api-client-react';
import { toast } from './Toast';
import { REMINDER_MAX_LENGTH } from '../lib/whatsapp';
import {
  BIRTHDAY_FIELDS,
  BIRTHDAY_PROMO_MAX_LENGTH,
  DEFAULT_BIRTHDAY_PROMO_DAYS,
  DEFAULT_BIRTHDAY_TEMPLATE_PLAIN,
  DEFAULT_BIRTHDAY_TEMPLATE_PROMO,
  birthdayMessage,
  defaultBirthdayTemplate,
  promoUntil,
  shortDate,
  ymd,
} from '../lib/birthdays';

const inputClass =
  'w-full px-3 py-2 bg-white border border-stone-200 rounded-xl text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-stone-300 placeholder:text-stone-400 transition';
const isDefault = (text: string) => text === DEFAULT_BIRTHDAY_TEMPLATE_PROMO || text === DEFAULT_BIRTHDAY_TEMPLATE_PLAIN;

/** Impostazioni → Auguri di compleanno: the promotion, how long it holds and the message text */
export const BirthdayTemplateCard = () => {
  const queryClient = useQueryClient();
  const { data: settings } = useGetSettings();
  const updateSettings = useUpdateSettings();

  const [promo, setPromo] = useState('');
  const [days, setDays] = useState(String(DEFAULT_BIRTHDAY_PROMO_DAYS));
  const [text, setText] = useState(DEFAULT_BIRTHDAY_TEMPLATE_PLAIN);
  const [saved, setSaved] = useState(false);
  const loaded = useRef(false);
  useEffect(() => {
    if (!settings || loaded.current) return;
    loaded.current = true;
    setPromo(settings.birthdayPromo ?? '');
    setDays(String(settings.birthdayPromoDays ?? DEFAULT_BIRTHDAY_PROMO_DAYS));
    setText(settings.birthdayTemplate?.trim() || defaultBirthdayTemplate(settings.birthdayPromo));
  }, [settings]);

  // While the text is still one of the app's own, it follows the promotion being there or not
  const changePromo = (value: string) => {
    setPromo(value);
    if (isDefault(text.trim())) setText(defaultBirthdayTemplate(value));
  };

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const insertField = (key: string) => {
    const el = textareaRef.current;
    const token = `{${key}}`;
    const start = el?.selectionStart ?? text.length;
    const end = el?.selectionEnd ?? text.length;
    setText((text.slice(0, start) + token + text.slice(end)).slice(0, REMINDER_MAX_LENGTH));
    requestAnimationFrame(() => {
      el?.focus();
      el?.setSelectionRange(start + token.length, start + token.length);
    });
  };

  const daysNumber = Math.min(365, Math.max(1, Math.round(Number(days)) || DEFAULT_BIRTHDAY_PROMO_DAYS));
  const today = ymd(new Date());
  const preview = birthdayMessage(
    { id: '', firstName: 'Maria', lastName: '', phone: '', email: '' },
    today,
    settings,
    { template: text, promo, days: daysNumber },
  );
  const usesPromo = /\{(promozione|scadenza)\}/i.test(text);

  const stored = {
    promo: settings?.birthdayPromo ?? '',
    days: settings?.birthdayPromoDays ?? DEFAULT_BIRTHDAY_PROMO_DAYS,
    text: settings?.birthdayTemplate?.trim() || defaultBirthdayTemplate(settings?.birthdayPromo),
  };
  const dirty = promo.trim() !== stored.promo.trim() || daysNumber !== stored.days || (text.trim() || defaultBirthdayTemplate(promo)) !== stored.text;

  const handleSave = () => {
    if (!settings) return;
    const value = text.trim();
    updateSettings.mutate(
      {
        data: {
          salonName: settings.salonName,
          birthdayPromo: promo.trim() || null,
          birthdayPromoDays: daysNumber === DEFAULT_BIRTHDAY_PROMO_DAYS ? null : daysNumber,
          // The app's own text is stored as "no choice", so it keeps following the promotion
          birthdayTemplate: !value || isDefault(value) ? null : value,
        },
      },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getGetSettingsQueryKey() });
          setDays(String(daysNumber));
          setText(value || defaultBirthdayTemplate(promo));
          setSaved(true);
          setTimeout(() => setSaved(false), 2500);
        },
        onError: () => toast.show('Errore durante il salvataggio degli auguri', 'error'),
      },
    );
  };

  return (
    <div className="bg-white rounded-2xl border border-stone-100 shadow-sm overflow-hidden">
      <div className="px-6 py-4 border-b border-stone-100">
        <div className="flex items-center gap-2">
          <Cake className="w-4 h-4 text-stone-400" />
          <h2 className="text-base font-semibold text-stone-900">Auguri di compleanno</h2>
        </div>
        <p className="text-sm text-stone-500 mt-0.5">
          Il messaggio che si apre in WhatsApp quando mandi gli auguri dai Promemoria, con la promozione di compleanno.
        </p>
      </div>

      <div className="p-6 flex flex-col gap-5">
        <div className="grid grid-cols-1 sm:grid-cols-[minmax(0,1fr)_11rem] gap-4">
          <div>
            <label htmlFor="birthday-promo" className="block text-xs font-medium text-stone-600 mb-1.5 uppercase tracking-wide">
              Promozione <span className="normal-case tracking-normal font-normal text-stone-400">(facoltativa)</span>
            </label>
            <input
              id="birthday-promo"
              type="text"
              value={promo}
              maxLength={BIRTHDAY_PROMO_MAX_LENGTH}
              onChange={e => changePromo(e.target.value)}
              placeholder="Es. uno sconto del 20% su un trattamento"
              className={inputClass}
            />
          </div>
          <div>
            <label htmlFor="birthday-days" className="block text-xs font-medium text-stone-600 mb-1.5 uppercase tracking-wide">
              Valida per
            </label>
            <div className="flex items-center gap-2">
              <input
                id="birthday-days"
                type="number"
                min={1}
                max={365}
                value={days}
                onChange={e => setDays(e.target.value)}
                disabled={!promo.trim()}
                className={`${inputClass} w-20 disabled:opacity-50`}
              />
              <span className="text-sm text-stone-600">giorni</span>
            </div>
          </div>
        </div>
        <p className="text-xs text-stone-400 -mt-3">
          {promo.trim()
            ? `Conta dal giorno del compleanno: per un compleanno di oggi vale fino al ${shortDate(promoUntil(today, daysNumber))}. Quando la cliente torna entro la scadenza, nel suo appuntamento compare l'avviso «Promo compleanno».`
            : 'Lascia vuoto se non vuoi offrire nessuna promozione.'}
        </p>

        <div>
          <label htmlFor="birthday-template" className="block text-xs font-medium text-stone-600 mb-1.5 uppercase tracking-wide">
            Testo del messaggio
          </label>
          <textarea
            id="birthday-template"
            ref={textareaRef}
            value={text}
            onChange={e => setText(e.target.value.slice(0, REMINDER_MAX_LENGTH))}
            rows={4}
            className={`${inputClass} resize-y`}
          />
          <div className="flex flex-wrap items-center gap-1.5 mt-2">
            <span className="text-sm text-stone-500 mr-1">Inserisci:</span>
            {BIRTHDAY_FIELDS.map(key => (
              <button
                key={key}
                type="button"
                onClick={() => insertField(key)}
                className="px-2.5 py-1 rounded-full text-sm font-medium bg-stone-100 text-stone-700 hover:bg-stone-200 transition-colors"
              >
                {key}
              </button>
            ))}
          </div>
          {usesPromo && !promo.trim() && (
            <p className="text-sm text-amber-700 mt-2">Il testo usa {'{promozione}'} o {'{scadenza}'}, ma non hai scritto nessuna promozione.</p>
          )}
        </div>

        <div>
          <span className="block text-xs font-medium text-stone-600 mb-1.5 uppercase tracking-wide">Anteprima</span>
          <div className="bg-stone-50 border border-stone-100 rounded-xl px-4 py-3 text-sm text-stone-800 whitespace-pre-wrap">
            {preview}
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-stone-100">
          {saved ? (
            <span className="flex items-center gap-1.5 text-sm text-green-600 font-medium">
              <CheckCircle2 className="w-4 h-4" /> Salvato
            </span>
          ) : !isDefault(text.trim()) ? (
            <button
              type="button"
              onClick={() => setText(defaultBirthdayTemplate(promo))}
              className="flex items-center gap-1.5 text-sm text-stone-500 hover:text-stone-800"
            >
              <RotateCcw className="w-4 h-4" /> Testo iniziale
            </button>
          ) : (
            <span />
          )}
          <button
            type="button"
            onClick={handleSave}
            disabled={updateSettings.isPending || !settings || !dirty}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium bg-stone-900 text-white hover:bg-stone-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {updateSettings.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Salva auguri
          </button>
        </div>
      </div>
    </div>
  );
};
