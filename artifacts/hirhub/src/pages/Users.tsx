import { useState } from 'react';
import {
  useListUsers,
  useCreateUser,
  useUpdateUser,
  useDeleteUser,
  getListUsersQueryKey,
  type AuthUser,
} from '@workspace/api-client-react';
import { useQueryClient } from '@tanstack/react-query';
import { UserPlus, Loader2, Pencil, Trash2, X, Check, Shield, User as UserIcon } from 'lucide-react';
import { cn } from '../lib/utils';
import { toast } from '../components/Toast';
import { useAuth } from '../lib/auth-context';

const inputClass =
  'w-full px-3 py-2 bg-white border border-stone-200 rounded-xl text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-stone-300 placeholder:text-stone-400 transition';

type Role = 'admin' | 'user';

const ROLE_LABEL: Record<Role, string> = {
  admin: 'Amministratore',
  user: 'Utente',
};

export const Users = () => {
  const queryClient = useQueryClient();
  const { user: currentUser } = useAuth();
  const { data: users = [], isLoading } = useListUsers();

  const [adding, setAdding] = useState(false);
  const [newUser, setNewUser] = useState<{ username: string; password: string; name: string; role: Role }>({
    username: '',
    password: '',
    name: '',
    role: 'user',
  });

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editData, setEditData] = useState<{ name: string; role: Role; password: string }>({
    name: '',
    role: 'user',
    password: '',
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: getListUsersQueryKey() });

  const { mutate: createUser, isPending: isCreating } = useCreateUser({
    mutation: {
      onSuccess: () => {
        invalidate();
        setNewUser({ username: '', password: '', name: '', role: 'user' });
        setAdding(false);
        toast.show('Utente creato');
      },
      onError: () => toast.show('Errore: nome utente già esistente?', 'error'),
    },
  });

  const { mutate: updateUser, isPending: isUpdating } = useUpdateUser({
    mutation: {
      onSuccess: () => {
        invalidate();
        setEditingId(null);
        toast.show('Utente aggiornato');
      },
      onError: () => toast.show('Errore durante il salvataggio', 'error'),
    },
  });

  const { mutate: deleteUser } = useDeleteUser({
    mutation: {
      onSuccess: () => {
        invalidate();
        toast.show('Utente eliminato');
      },
      onError: () => toast.show('Impossibile eliminare questo utente', 'error'),
    },
  });

  const startEdit = (u: AuthUser) => {
    setEditingId(u.id);
    setEditData({ name: u.name ?? '', role: u.role, password: '' });
  };

  const handleCreate = () => {
    if (!newUser.username.trim() || newUser.password.length < 8) return;
    createUser({
      data: {
        username: newUser.username.trim(),
        password: newUser.password,
        role: newUser.role,
        name: newUser.name.trim() || null,
      },
    });
  };

  const handleSaveEdit = (id: string) => {
    if (editData.password && editData.password.length < 8) return;
    updateUser({
      id,
      data: {
        name: editData.name.trim() || null,
        role: editData.role,
        ...(editData.password ? { password: editData.password } : {}),
      },
    });
  };

  const handleDelete = (u: AuthUser) => {
    if (!window.confirm(`Eliminare l'utente "${u.username}"?`)) return;
    deleteUser({ id: u.id });
  };

  return (
    <div className="flex flex-col gap-8 page-enter">
      <section>
        <span className="text-stone-500 text-sm font-medium tracking-wide uppercase">Amministrazione</span>
        <div className="flex items-center justify-between mt-1 mb-6">
          <h1 className="text-3xl font-serif text-stone-900">Utenti</h1>
          {!adding && (
            <button
              onClick={() => setAdding(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium bg-stone-900 text-white hover:bg-stone-800 transition-colors"
            >
              <UserPlus className="w-4 h-4" />
              Nuovo utente
            </button>
          )}
        </div>

        {adding && (
          <div className="bg-white rounded-2xl border border-stone-100 shadow-sm p-6 mb-6 flex flex-col gap-4">
            <h2 className="text-base font-semibold text-stone-900">Nuovo utente</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-stone-600 mb-1.5 uppercase tracking-wide">
                  Nome utente *
                </label>
                <input
                  type="text"
                  value={newUser.username}
                  onChange={(e) => setNewUser((s) => ({ ...s, username: e.target.value }))}
                  autoComplete="off"
                  className={inputClass}
                  placeholder="Es. maria"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-stone-600 mb-1.5 uppercase tracking-wide">
                  Password *
                </label>
                <input
                  type="password"
                  value={newUser.password}
                  onChange={(e) => setNewUser((s) => ({ ...s, password: e.target.value }))}
                  autoComplete="new-password"
                  minLength={8}
                  className={inputClass}
                  placeholder="••••••••"
                />
                <p className="mt-1 text-xs text-stone-400">Minimo 8 caratteri</p>
              </div>
              <div>
                <label className="block text-xs font-medium text-stone-600 mb-1.5 uppercase tracking-wide">
                  Nome completo
                </label>
                <input
                  type="text"
                  value={newUser.name}
                  onChange={(e) => setNewUser((s) => ({ ...s, name: e.target.value }))}
                  className={inputClass}
                  placeholder="Es. Maria Rossi"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-stone-600 mb-1.5 uppercase tracking-wide">
                  Ruolo
                </label>
                <select
                  value={newUser.role}
                  onChange={(e) => setNewUser((s) => ({ ...s, role: e.target.value as Role }))}
                  className={inputClass}
                >
                  <option value="user">Utente</option>
                  <option value="admin">Amministratore</option>
                </select>
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                onClick={() => {
                  setAdding(false);
                  setNewUser({ username: '', password: '', name: '', role: 'user' });
                }}
                className="px-4 py-2 rounded-xl text-sm font-medium text-stone-600 hover:bg-stone-100 transition-colors"
              >
                Annulla
              </button>
              <button
                onClick={handleCreate}
                disabled={isCreating || !newUser.username.trim() || newUser.password.length < 8}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium bg-stone-900 text-white hover:bg-stone-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isCreating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                Crea utente
              </button>
            </div>
          </div>
        )}

        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-stone-400" />
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-stone-100 shadow-sm overflow-hidden divide-y divide-stone-100">
            {users.map((u) => {
              const isSelf = currentUser?.id === u.id;
              const isEditing = editingId === u.id;
              return (
                <div key={u.id} className="p-4 md:px-6">
                  {isEditing ? (
                    <div className="flex flex-col gap-3">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-stone-900">{u.username}</span>
                        {isSelf && <span className="text-[11px] text-stone-400">(tu)</span>}
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <input
                          type="text"
                          value={editData.name}
                          onChange={(e) => setEditData((s) => ({ ...s, name: e.target.value }))}
                          className={inputClass}
                          placeholder="Nome completo"
                        />
                        <select
                          value={editData.role}
                          onChange={(e) => setEditData((s) => ({ ...s, role: e.target.value as Role }))}
                          disabled={isSelf}
                          className={cn(inputClass, isSelf && 'opacity-60 cursor-not-allowed')}
                        >
                          <option value="user">Utente</option>
                          <option value="admin">Amministratore</option>
                        </select>
                        <input
                          type="password"
                          value={editData.password}
                          onChange={(e) => setEditData((s) => ({ ...s, password: e.target.value }))}
                          autoComplete="new-password"
                          className={inputClass}
                          placeholder="Nuova password (opzionale)"
                        />
                      </div>
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => setEditingId(null)}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-stone-600 hover:bg-stone-100 transition-colors"
                        >
                          <X className="w-4 h-4" />
                          Annulla
                        </button>
                        <button
                          onClick={() => handleSaveEdit(u.id)}
                          disabled={isUpdating}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium bg-stone-900 text-white hover:bg-stone-800 disabled:opacity-50 transition-colors"
                        >
                          {isUpdating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                          Salva
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className={cn(
                            'w-9 h-9 rounded-full flex items-center justify-center shrink-0',
                            u.role === 'admin' ? 'bg-stone-900 text-white' : 'bg-stone-100 text-stone-500'
                          )}
                        >
                          {u.role === 'admin' ? <Shield className="w-4 h-4" /> : <UserIcon className="w-4 h-4" />}
                        </div>
                        <div className="flex flex-col min-w-0">
                          <span className="text-sm font-semibold text-stone-900 truncate">
                            {u.name?.trim() || u.username}
                            {isSelf && <span className="ml-2 text-[11px] font-normal text-stone-400">(tu)</span>}
                          </span>
                          <span className="text-xs text-stone-400 truncate">
                            @{u.username} · {ROLE_LABEL[u.role]}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={() => startEdit(u)}
                          className="p-2 rounded-lg text-stone-500 hover:bg-stone-100 hover:text-stone-900 transition-colors"
                          title="Modifica"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(u)}
                          disabled={isSelf}
                          className={cn(
                            'p-2 rounded-lg transition-colors',
                            isSelf
                              ? 'text-stone-300 cursor-not-allowed'
                              : 'text-stone-500 hover:bg-red-50 hover:text-red-600'
                          )}
                          title={isSelf ? 'Non puoi eliminare il tuo account' : 'Elimina'}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
            {users.length === 0 && (
              <div className="p-8 text-center text-sm text-stone-400">Nessun utente.</div>
            )}
          </div>
        )}
      </section>
    </div>
  );
};
