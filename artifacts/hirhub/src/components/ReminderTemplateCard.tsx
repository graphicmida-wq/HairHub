import React, { useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { CheckCircle2, Loader2, MessageCircle, RotateCcw, Save } from 'lucide-react';
import {
  getGetSettingsQueryKey,
  useGetSettings,
  useListStaff,
  useUpdateSettings,
} from '@workspace/api-client-react';
import { cn } from '../lib/utils';
import { toast } from './Toast';
import {
  DEFAULT_REMINDER_TEMPLATE,
  REMINDER_FIELDS,
  REMINDER_MAX_LENGTH,
  fillReminder,
  isPhoneOrTablet,
  loadDesktopOpener,
  saveDesktopOpener,
  type DesktopOpener,
} from '../lib/whatsapp';

/** Impostazioni → Promemoria WhatsApp: the message text (for the salon) and how this computer opens WhatsApp */
export const ReminderTemplateCard = () => {
  const queryClient = useQueryClient();
  const { data: settings } = useGetSettings();
  const { data: staff = [] } = useListStaff();
  const updateSettings = useUpdateSettings();

  const [text, setText] = useState(DEFAULT_REMINDER_TEMPLATE);
  const [saved, setSaved] = useState(false);
  const loaded = useRef(false);
  useEffect(() => {
    if (!settings || loaded.current) return;
    loaded.current = true;
    setText(settings.reminderTemplate?.trim() || DEFAULT_REMINDER_TEMPLATE);
  }, [settings]);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const insertField = (key: string) => {
    const el = textareaRef.current;
    const token = `{${key}}`;
    const start = el?.selectionStart ?? text.length;
    const end = el?.selectionEnd ?? text.length;
    const next = (text.slice(0, start) + token + text.slice(end)).slice(0, REMINDER_MAX_LENGTH);
    setText(next);
    requestAnimationFrame(() => {
      el?.focus();
      el?.setSelectionRange(start + token.length, start + token.length);
    });
  };

  const operator = staff.find(m => m.inAgenda)?.name ?? 'Sara';
  const preview = fillReminder(text.trim() || DEFAULT_REMINDER_TEMPLATE, {
    nome: 'Maria',
    quando: 'domani',
    ora: '09:00',
    servizio: 'Piega',
    operatrice: operator,
    salone: settings?.salonName ?? '',
  });

  const storedText = settings?.reminderTemplate?.trim() || DEFAULT_REMINDER_TEMPLATE;
  const dirty = (text.trim() || DEFAULT_REMINDER_TEMPLATE) !== storedText;

  const handleSave = () => {
    if (!settings) return;
    const value = text.trim();
    updateSettings.mutate(
      // The default text is stored as "no choice", so an improved default reaches every salon
      { data: { salonName: settings.salonName, reminderTemplate: !value || value === DEFAULT_REMINDER_TEMPLATE ? null : value } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getGetSettingsQueryKey() });
          setText(value || DEFAULT_REMINDER_TEMPLATE);
          setSaved(true);
          setTimeout(() => setSaved(false), 2500);
        },
        onError: () => toast.show('Errore durante il salvataggio del testo', 'error'),
      },
    );
  };

  const [opener, setOpener] = useState<DesktopOpener>(() => loadDesktopOpener());
  const chooseOpener = (value: DesktopOpener) => {
    setOpener(value);
    saveDesktopOpener(value);
  };
  const onComputer = !isPhoneOrTablet();

  return (
    <div className="bg-white rounded-2xl border border-stone-100 shadow-sm overflow-hidden">
      <div className="px-6 py-4 border-b border-stone-100">
        <div className="flex items-center gap-2">
          <MessageCircle className="w-4 h-4 text-stone-400" />
          <h2 className="text-base font-semibold text-stone-900">Promemoria WhatsApp</h2>
        </div>
        <p className="text-sm text-stone-500 mt-0.5">
          Il messaggio che si apre in WhatsApp quando mandi un promemoria dall'Agenda. Prima di premere invio puoi sempre cambiarlo.
        </p>
      </div>

      <div className="p-6 flex flex-col gap-5">
        <div>
          <label htmlFor="reminder-template" className="block text-xs font-medium text-stone-600 mb-1.5 uppercase tracking-wide">
            Testo del messaggio
          </label>
          <textarea
            id="reminder-template"
            ref={textareaRef}
            value={text}
            onChange={e => setText(e.target.value.slice(0, REMINDER_MAX_LENGTH))}
            rows={4}
            className="w-full px-3 py-2 bg-white border border-stone-200 rounded-xl text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-stone-300 placeholder:text-stone-400 transition resize-y"
          />
          <div className="flex flex-wrap items-center gap-1.5 mt-2">
            <span className="text-sm text-stone-500 mr-1">Inserisci:</span>
            {REMINDER_FIELDS.map(f => (
              <button
                key={f.key}
                type="button"
                onClick={() => insertField(f.key)}
                title={`Diventa ad esempio «${f.key === 'operatrice' ? operator : f.key === 'salone' ? settings?.salonName ?? f.example : f.example}»`}
                className="px-2.5 py-1 rounded-full text-sm font-medium bg-stone-100 text-stone-700 hover:bg-stone-200 transition-colors"
              >
                {f.key}
              </button>
            ))}
          </div>
          <p className="text-xs text-stone-400 mt-2">
            Le parole tra parentesi graffe, come {'{nome}'}, vengono sostituite con i dati di ogni cliente. «quando» diventa «oggi», «domani» oppure il giorno, per esempio «lunedì 12 ottobre».
          </p>
        </div>

        <div>
          <span className="block text-xs font-medium text-stone-600 mb-1.5 uppercase tracking-wide">Anteprima</span>
          <div className="bg-stone-50 border border-stone-100 rounded-xl px-4 py-3 text-sm text-stone-800 whitespace-pre-wrap">
            {preview}
          </div>
        </div>

        {onComputer && (
          <div>
            <span className="block text-xs font-medium text-stone-600 mb-1.5 uppercase tracking-wide">Su questo computer apri</span>
            <div role="radiogroup" aria-label="Su questo computer apri" className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {([
                { value: 'app', label: 'App WhatsApp', hint: "L'app installata sul computer" },
                { value: 'web', label: 'WhatsApp Web', hint: 'Nel browser, in una nuova scheda' },
              ] as const).map(o => (
                <button
                  key={o.value}
                  type="button"
                  role="radio"
                  aria-checked={opener === o.value}
                  onClick={() => chooseOpener(o.value)}
                  className={cn(
                    'flex flex-col items-start px-4 py-2.5 rounded-xl border-2 text-left transition-all',
                    opener === o.value ? 'border-stone-900 bg-stone-50 shadow-sm' : 'border-stone-100 hover:border-stone-200',
                  )}
                >
                  <span className={cn('text-sm', opener === o.value ? 'font-semibold text-stone-900' : 'font-medium text-stone-700')}>{o.label}</span>
                  <span className="text-xs text-stone-500">{o.hint}</span>
                </button>
              ))}
            </div>
            <p className="text-xs text-stone-400 mt-2">Vale solo per questo computer. Sul telefono si apre sempre l'app WhatsApp.</p>
          </div>
        )}

        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-stone-100">
          {saved ? (
            <span className="flex items-center gap-1.5 text-sm text-green-600 font-medium">
              <CheckCircle2 className="w-4 h-4" /> Salvato
            </span>
          ) : text.trim() !== DEFAULT_REMINDER_TEMPLATE ? (
            <button
              type="button"
              onClick={() => setText(DEFAULT_REMINDER_TEMPLATE)}
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
            Salva testo
          </button>
        </div>
      </div>
    </div>
  );
};
