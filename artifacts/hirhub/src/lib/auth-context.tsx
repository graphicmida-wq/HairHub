import { createContext, useContext, type ReactNode } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  useGetCurrentUser,
  useLogout,
  getGetCurrentUserQueryKey,
  type AuthUser,
} from '@workspace/api-client-react';

interface AuthContextValue {
  user: AuthUser | null;
  isLoading: boolean;
  isAdmin: boolean;
  isLoggingOut: boolean;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const { data, isLoading } = useGetCurrentUser({
    query: { queryKey: getGetCurrentUserQueryKey(), retry: false, staleTime: 5 * 60_000 },
  });
  const { mutate: logoutMutate, isPending: isLoggingOut } = useLogout();

  const user = data ?? null;

  const logout = () => {
    logoutMutate(undefined, {
      onSettled: () => {
        // Wipe all cached (protected) data, then mark the session as logged-out
        // so the gate switches to the login screen without a refetch flash.
        queryClient.clear();
        queryClient.setQueryData(getGetCurrentUserQueryKey(), null);
      },
    });
  };

  return (
    <AuthContext.Provider
      value={{ user, isLoading, isAdmin: user?.role === 'admin', isLoggingOut, logout }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
