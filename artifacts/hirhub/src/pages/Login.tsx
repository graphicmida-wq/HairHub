import { useState, type FormEvent } from 'react';
import { useLogin, useGetSettings, getGetCurrentUserQueryKey } from '@workspace/api-client-react';
import { useQueryClient } from '@tanstack/react-query';
import { Loader2, Lock } from 'lucide-react';
import lumiiLogo from '../assets/lumii-logo.png';

const inputClass =
  'w-full px-3 py-2.5 bg-white border border-stone-200 rounded-xl text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-stone-300 placeholder:text-stone-400 transition';

export const Login = () => {
  const queryClient = useQueryClient();
  const { data: settings } = useGetSettings();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  const { mutate: doLogin, isPending } = useLogin({
    mutation: {
      onSuccess: (user) => {
        queryClient.setQueryData(getGetCurrentUserQueryKey(), user);
      },
      onError: () => setError('Nome utente o password non validi'),
    },
  });

  const salonName = settings?.salonName ?? 'Lumii';
  const logoUrl = settings?.logoUrl ?? null;

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!username.trim() || !password) return;
    doLogin({ data: { username: username.trim(), password } });
  };

  return (
    <div
      className="min-h-[100dvh] flex items-center justify-center p-6"
      style={{ background: 'var(--color-brand-dark)' }}
    >
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center text-center mb-8">
          {logoUrl ? (
            <img src={logoUrl} alt="Logo salone" className="w-20 h-20 rounded-2xl object-contain mb-4" />
          ) : (
            <img src={lumiiLogo} alt="Lumii" className="w-20 h-20 object-contain mb-4" />
          )}
          <h1
            className="text-2xl font-semibold text-[#F5F0E3]"
            style={{ fontFamily: '"Playfair Display", serif' }}
          >
            {salonName}
          </h1>
          <p
            className="text-[11px] uppercase tracking-[0.2em] mt-1"
            style={{ color: 'var(--color-brand-muted)' }}
          >
            Gestione Salone
          </p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-xl p-6 flex flex-col gap-4">
          <div>
            <label className="block text-xs font-medium text-stone-600 mb-1.5 uppercase tracking-wide">
              Nome utente
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoFocus
              autoComplete="username"
              className={inputClass}
              placeholder="Es. admin"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-stone-600 mb-1.5 uppercase tracking-wide">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              className={inputClass}
              placeholder="••••••••"
            />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button
            type="submit"
            disabled={isPending || !username.trim() || !password}
            className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium bg-stone-900 text-white hover:bg-stone-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors mt-1"
          >
            {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />}
            Accedi
          </button>
        </form>
      </div>
    </div>
  );
};
