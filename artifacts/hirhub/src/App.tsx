import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useGetSettings } from '@workspace/api-client-react';
import { Loader2 } from 'lucide-react';
import { Layout } from './components/Layout';
import { Dashboard } from './pages/Dashboard';
import { Clients } from './pages/Clients';
import { Appointments } from './pages/Appointments';
import { Inventory } from './pages/Inventory';
import { Services } from './pages/Services';
import { Settings } from './pages/Settings';
import { Users } from './pages/Users';
import { Login } from './pages/Login';
import { Toaster } from './components/Toast';
import { PwaReloadPrompt } from './components/PwaReloadPrompt';
import { AuthProvider, useAuth } from './lib/auth-context';
import { BRAND_PRESETS, DEFAULT_PALETTE, paletteFromCustomColor, applyBrandPalette, saveBrandPalette } from './lib/brand-color';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 10_000,
      retry: 1,
    },
  },
});

function BrandColorSync() {
  const { data: settings } = useGetSettings();
  useEffect(() => {
    // Wait for settings to load; main.tsx already applied the cached palette to avoid flash.
    if (!settings) return;
    if (!settings.brandColor) {
      // No saved color → ensure the default palette wins (clears any stale override).
      applyBrandPalette(DEFAULT_PALETTE);
      saveBrandPalette(DEFAULT_PALETTE);
      return;
    }
    const preset = BRAND_PRESETS.find(p => p.primary.toLowerCase() === settings.brandColor!.toLowerCase());
    const palette = preset ?? paletteFromCustomColor(settings.brandColor);
    applyBrandPalette(palette);
    saveBrandPalette(palette);
  }, [settings?.brandColor]);
  return null;
}

function AppGate() {
  const { user, isLoading, isAdmin } = useAuth();

  if (isLoading) {
    return (
      <div
        className="min-h-[100dvh] flex items-center justify-center"
        style={{ background: 'var(--color-brand-dark)' }}
      >
        <Loader2 className="w-7 h-7 animate-spin" style={{ color: 'var(--color-brand-muted)' }} />
      </div>
    );
  }

  if (!user) {
    return <Login />;
  }

  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/agenda" element={<Appointments />} />
        <Route path="/clienti" element={<Clients />} />
        <Route path="/servizi" element={<Services />} />
        <Route path="/magazzino" element={<Inventory />} />
        {isAdmin && <Route path="/impostazioni" element={<Settings />} />}
        {isAdmin && <Route path="/utenti" element={<Users />} />}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Layout>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <BrandColorSync />
          <AppGate />
          <Toaster />
          <PwaReloadPrompt />
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
