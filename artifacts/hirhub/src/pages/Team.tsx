import React, { useEffect, useState } from 'react';
import {
  useListTeam,
  useCreateTeamMember,
  useUpdateTeamMember,
  useDeleteTeamMember,
  getListTeamQueryKey,
  getListStaffQueryKey,
  getGetCurrentUserQueryKey,
  type AppSection,
  type TeamMember,
} from '@workspace/api-client-react';
import { useQueryClient } from '@tanstack/react-query';
import { UserPlus, Loader2, Pencil, Trash2, Shield, Calendar, KeyRound } from 'lucide-react';
import { cn } from '../lib/utils';
import { toast } from '../components/Toast';
import { Modal } from '../components/Modal';
import { useAuth } from '../lib/auth-context';
import { SECTIONS, DEFAULT_USER_SECTIONS } from '../lib/sections';
import { GuideLink } from '../components/GuideLink';

const STAFF_COLORS = [
  '#6b7280', '#ef4444', '#f97316', '#eab308', '#22c55e',
  '#06b6d4', '#3b82f6', '#8b5cf6', '#ec4899', '#14b8a6',
];

const INPUT = 'bg-stone-50 border border-stone-200 rounded-xl px-4 py-2.5 outline-none focus:border-brand-dark transition-colors w-full';
const LABEL = 'text-sm font-medium text-stone-700';

type Level = 'admin' | 'user';

const errorMessage = (err: unknown, fallback: string) =>
  (err as { data?: { message?: string } })?.data?.message ?? fallback;

function sectionsSummary(permissions: AppSection[]) {
  if (permissions.length === SECTIONS.length) return 'vede tutto';
  if (permissions.length === 0) return 'vede solo la Dashboard';
  return 'vede ' + SECTIONS.filter(s => permissions.includes(s.key)).map(s => s.label).join(', ');
}

export const Team = () => {
  const queryClient = useQueryClient();
  const { user: currentUser } = useAuth();
  const { data: people = [], isLoading } = useListTeam();
  // null = closed, 'new' = adding, otherwise the person being edited
  const [editing, setEditing] = useState<TeamMember | 'new' | null>(null);

  const { mutate: deletePerson } = useDeleteTeamMember({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListTeamQueryKey() });
        queryClient.invalidateQueries({ queryKey: getListStaffQueryKey() });
        toast.show('Persona eliminata');
      },
      onError: (err: unknown) => toast.show(errorMessage(err, 'Impossibile eliminare questa persona'), 'error'),
    },
  });

  const handleDelete = (p: TeamMember) => {
    const notes = [
      p.access && `@${p.access.username} non potrà più entrare nell'app.`,
      p.inAgenda && `I suoi appuntamenti resteranno, senza operatore. Per toglierla solo dall'agenda, modificala e spegni "Compare in agenda".`,
    ].filter(Boolean);
    if (!window.confirm([`Eliminare ${p.name}?`, ...notes].join('\n\n'))) return;
    deletePerson({ id: p.id });
  };

  return (
    <div className="flex flex-col gap-8 page-enter">
      <section>
        <span className="text-on-page-muted text-sm font-medium tracking-wide uppercase">Amministrazione</span>
        <div className="flex items-center justify-between gap-4 mt-1 mb-2">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-3xl font-serif text-on-page">Team</h1>
            <GuideLink chapter="team" />
          </div>
          <button
            onClick={() => setEditing('new')}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium bg-stone-900 text-white hover:bg-stone-800 transition-colors"
          >
            <UserPlus className="w-4 h-4" />
            Nuova persona
          </button>
        </div>
        <p className="text-sm text-on-page-muted mb-6 max-w-2xl">
          Le persone del salone. Chi è <strong className="font-semibold">in agenda</strong> ha la sua colonna e riceve
          appuntamenti; chi ha l'<strong className="font-semibold">accesso</strong> entra nell'app con il suo nome utente
          e la sua password.
        </p>

        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-on-page-muted" />
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-stone-100 shadow-sm overflow-hidden divide-y divide-stone-100">
            {people.map(p => {
              const isSelf = !!p.access && currentUser?.id === p.access.userId;
              return (
                <div key={p.id} className="p-4 md:px-6 flex items-center gap-3">
                  <button
                    onClick={() => setEditing(p)}
                    className="flex items-center gap-3 min-w-0 flex-1 text-left"
                  >
                    <span
                      className="w-10 h-10 rounded-full shrink-0 flex items-center justify-center text-white border border-stone-100"
                      style={{ backgroundColor: p.color }}
                    >
                      {p.access?.level === 'admin' && <Shield className="w-4 h-4" />}
                    </span>
                    <span className="flex flex-col min-w-0 gap-0.5">
                      <span className="text-sm font-semibold text-stone-900 truncate">
                        {p.name}
                        {isSelf && <span className="ml-2 text-xs font-normal text-stone-400">(tu)</span>}
                        {p.role && <span className="ml-2 text-xs font-normal text-stone-400">{p.role}</span>}
                      </span>
                      <span className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-stone-500">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5 shrink-0" />
                          {p.inAgenda ? 'In agenda' : 'Non in agenda'}
                        </span>
                        <span className="flex items-start gap-1 min-w-0">
                          <KeyRound className="w-3.5 h-3.5 shrink-0 mt-px" />
                          {p.access
                            ? <span>
                                @{p.access.username} · {p.access.level === 'admin'
                                  ? 'Amministratore'
                                  : `Utente, ${sectionsSummary(p.access.permissions)}`}
                              </span>
                            : 'Nessun accesso'}
                        </span>
                      </span>
                    </span>
                  </button>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => setEditing(p)}
                      className="p-2 rounded-lg text-stone-500 hover:bg-stone-100 hover:text-stone-900 transition-colors"
                      title="Modifica"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(p)}
                      disabled={isSelf}
                      className={cn(
                        'p-2 rounded-lg transition-colors',
                        isSelf ? 'text-stone-300 cursor-not-allowed' : 'text-stone-500 hover:bg-red-50 hover:text-red-600'
                      )}
                      title={isSelf ? 'Non puoi eliminare te stesso' : 'Elimina'}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
            {people.length === 0 && (
              <div className="p-8 text-center text-sm text-stone-400">Nessuna persona.</div>
            )}
          </div>
        )}
      </section>

      <PersonModal
        person={editing}
        isSelf={editing !== null && editing !== 'new' && !!editing.access && currentUser?.id === editing.access.userId}
        onClose={() => setEditing(null)}
      />
    </div>
  );
};

interface FormState {
  name: string;
  role: string;
  color: string;
  inAgenda: boolean;
  hasAccess: boolean;
  username: string;
  password: string;
  level: Level;
  permissions: AppSection[];
}

function formFor(person: TeamMember | null): FormState {
  return {
    name: person?.name ?? '',
    role: person?.role ?? '',
    color: person?.color ?? STAFF_COLORS[6]!,
    inAgenda: person?.inAgenda ?? true,
    hasAccess: !!person?.access,
    username: person?.access?.username ?? '',
    password: '',
    level: person?.access?.level ?? 'user',
    permissions: person?.access?.level === 'user' ? person.access.permissions : DEFAULT_USER_SECTIONS,
  };
}

const PersonModal = ({
  person,
  isSelf,
  onClose,
}: {
  person: TeamMember | 'new' | null;
  isSelf: boolean;
  onClose: () => void;
}) => {
  const queryClient = useQueryClient();
  const existing = person && person !== 'new' ? person : null;
  const [form, setForm] = useState<FormState>(() => formFor(existing));
  const set = (patch: Partial<FormState>) => setForm(f => ({ ...f, ...patch }));

  // Fresh form each time the modal opens
  useEffect(() => {
    if (person) setForm(formFor(person === 'new' ? null : person));
  }, [person]);

  const onSaved = (message: string) => {
    queryClient.invalidateQueries({ queryKey: getListTeamQueryKey() });
    queryClient.invalidateQueries({ queryKey: getListStaffQueryKey() });
    if (isSelf) queryClient.invalidateQueries({ queryKey: getGetCurrentUserQueryKey() });
    toast.show(message);
    onClose();
  };
  const onError = (err: unknown) => toast.show(errorMessage(err, 'Errore durante il salvataggio'), 'error');

  const { mutate: createPerson, isPending: isCreating } = useCreateTeamMember({
    mutation: { onSuccess: () => onSaved('Persona aggiunta'), onError },
  });
  const { mutate: updatePerson, isPending: isUpdating } = useUpdateTeamMember({
    mutation: { onSuccess: () => onSaved('Modifiche salvate'), onError },
  });

  const needsPassword = form.hasAccess && !existing?.access;
  const passwordTooShort = form.password.length > 0 && form.password.length < 8;
  const canSave =
    form.name.trim().length > 0 &&
    (!form.hasAccess || form.username.trim().length > 0) &&
    (!needsPassword || form.password.length >= 8) &&
    !passwordTooShort;

  const togglePermission = (key: AppSection) =>
    set({ permissions: form.permissions.includes(key) ? form.permissions.filter(k => k !== key) : [...form.permissions, key] });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSave) return;
    const base = {
      name: form.name.trim(),
      role: form.role.trim() || null,
      color: form.color,
      inAgenda: form.inAgenda,
    };
    const permissions = form.level === 'user' ? form.permissions : undefined;
    if (!existing) {
      createPerson({
        data: {
          ...base,
          access: form.hasAccess
            ? { username: form.username.trim(), password: form.password, level: form.level, permissions }
            : null,
        },
      });
      return;
    }
    updatePerson({
      id: existing.id,
      data: {
        ...base,
        access: form.hasAccess
          ? {
              username: form.username.trim(),
              level: form.level,
              permissions,
              ...(form.password ? { password: form.password } : {}),
            }
          : null,
      },
    });
  };

  const removingAccess = !!existing?.access && !form.hasAccess;

  return (
    <Modal isOpen={person !== null} onClose={onClose} title={existing ? existing.name : 'Nuova persona'}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="flex flex-col gap-1">
            <label className={LABEL}>Nome</label>
            <input
              required
              autoFocus={!existing}
              type="text"
              placeholder="Es. Sissi"
              value={form.name}
              onChange={e => set({ name: e.target.value })}
              className={INPUT}
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className={LABEL}>Mansione <span className="text-stone-400 font-normal">(opzionale)</span></label>
            <input
              type="text"
              placeholder="Es. Colorista"
              value={form.role}
              onChange={e => set({ role: e.target.value })}
              className={INPUT}
            />
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <label className={LABEL}>Colore</label>
          <div className="flex items-center gap-2 flex-wrap">
            {STAFF_COLORS.map(c => (
              <button
                key={c}
                type="button"
                onClick={() => set({ color: c })}
                aria-label={`Colore ${c}`}
                className={cn(
                  'w-8 h-8 rounded-full border-2 transition-all',
                  form.color.toLowerCase() === c ? 'border-stone-900 scale-110' : 'border-transparent'
                )}
                style={{ backgroundColor: c }}
              />
            ))}
            <input
              type="color"
              value={form.color}
              onChange={e => set({ color: e.target.value })}
              title="Altro colore"
              className="w-9 h-9 rounded-lg border border-stone-200 cursor-pointer p-0.5 bg-white"
            />
          </div>
        </div>

        <ToggleRow
          checked={form.inAgenda}
          onChange={v => set({ inAgenda: v })}
          title="Compare in agenda"
          description="Ha la sua colonna in agenda e le si possono assegnare appuntamenti."
        />

        <div className="flex flex-col gap-3">
          <ToggleRow
            checked={form.hasAccess}
            onChange={v => set({ hasAccess: v })}
            disabled={isSelf}
            title="Può entrare nell'app"
            description={isSelf
              ? "È il tuo accesso: non puoi toglierlo né cambiarne il livello."
              : "Con il suo nome utente e la sua password, da qualsiasi dispositivo."}
          />
          {removingAccess && (
            <p className="text-sm text-red-600 px-1">
              Salvando, @{existing!.access!.username} non potrà più entrare nell'app.
            </p>
          )}

          {form.hasAccess && (
            <div className="flex flex-col gap-4 border border-stone-200 rounded-xl p-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1">
                  <label className={LABEL}>Nome utente</label>
                  <input
                    type="text"
                    autoComplete="off"
                    autoCapitalize="none"
                    placeholder="Es. sissi"
                    value={form.username}
                    onChange={e => set({ username: e.target.value })}
                    className={INPUT}
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className={LABEL}>
                    {existing?.access ? 'Nuova password' : 'Password'}
                    {existing?.access && <span className="text-stone-400 font-normal"> (opzionale)</span>}
                  </label>
                  <input
                    type="password"
                    autoComplete="new-password"
                    placeholder={existing?.access ? '' : '••••••••'}
                    value={form.password}
                    onChange={e => set({ password: e.target.value })}
                    className={INPUT}
                  />
                  <p className={cn('text-xs', passwordTooShort ? 'text-red-600' : 'text-stone-400')}>
                    {existing?.access ? 'Lascia vuoto per non cambiarla. ' : ''}Minimo 8 caratteri.
                  </p>
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <label className={LABEL}>Livello</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {([
                    { value: 'admin', title: 'Amministratore', description: 'Vede e gestisce tutto, anche Team e Impostazioni.' },
                    { value: 'user', title: 'Utente', description: 'Vede solo le sezioni che scegli qui sotto.' },
                  ] as const).map(opt => (
                    <button
                      key={opt.value}
                      type="button"
                      disabled={isSelf}
                      onClick={() => set({ level: opt.value })}
                      className={cn(
                        'text-left rounded-xl border px-3 py-2.5 transition-colors disabled:cursor-not-allowed',
                        form.level === opt.value
                          ? 'bg-stone-900 text-white border-stone-900'
                          : 'bg-white text-stone-700 border-stone-200 hover:border-stone-400',
                        isSelf && form.level !== opt.value && 'opacity-50'
                      )}
                    >
                      <span className="block text-sm font-semibold">{opt.title}</span>
                      <span className={cn('block text-xs mt-0.5', form.level === opt.value ? 'text-white/80' : 'text-stone-500')}>
                        {opt.description}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {form.level === 'user' && (
                <div className="flex flex-col gap-2">
                  <label className={LABEL}>Cosa può vedere</label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {SECTIONS.map(section => (
                      <label
                        key={section.key}
                        className="flex items-start gap-3 rounded-xl border border-stone-200 px-3 py-2.5 cursor-pointer hover:border-stone-400 transition-colors"
                      >
                        <input
                          type="checkbox"
                          checked={form.permissions.includes(section.key)}
                          onChange={() => togglePermission(section.key)}
                          className="w-5 h-5 mt-0.5 shrink-0 rounded border-stone-300 accent-stone-900"
                        />
                        <span className="flex flex-col">
                          <span className="text-sm font-medium text-stone-800">{section.label}</span>
                          {section.hint && <span className="text-xs text-stone-500">{section.hint}</span>}
                        </span>
                      </label>
                    ))}
                  </div>
                  <p className="text-xs text-stone-500">
                    La Dashboard si vede sempre, ma solo con i riquadri delle sezioni scelte.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        <button
          type="submit"
          disabled={!canSave || isCreating || isUpdating}
          className="btn-brand mt-2 text-white font-medium py-3 rounded-xl disabled:opacity-60 flex items-center justify-center gap-2"
        >
          {(isCreating || isUpdating) && <Loader2 className="w-4 h-4 animate-spin" />}
          {existing ? 'Salva modifiche' : 'Aggiungi persona'}
        </button>
      </form>
    </Modal>
  );
};

const ToggleRow = ({
  checked,
  onChange,
  title,
  description,
  disabled,
}: {
  checked: boolean;
  onChange: (value: boolean) => void;
  title: string;
  description: string;
  disabled?: boolean;
}) => (
  <label
    className={cn(
      'flex items-start gap-3 rounded-xl border border-stone-200 px-4 py-3 transition-colors',
      disabled ? 'opacity-70 cursor-not-allowed' : 'cursor-pointer hover:border-stone-400'
    )}
  >
    <input
      type="checkbox"
      checked={checked}
      disabled={disabled}
      onChange={e => onChange(e.target.checked)}
      className="w-5 h-5 mt-0.5 shrink-0 rounded border-stone-300 accent-stone-900"
    />
    <span className="flex flex-col">
      <span className="text-sm font-semibold text-stone-900">{title}</span>
      <span className="text-xs text-stone-500">{description}</span>
    </span>
  </label>
);
