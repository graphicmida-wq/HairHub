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
import { Sales } from './pages/Sales';
import { Revenue } from './pages/Revenue';
import { Services } from './pages/Services';
import { Settings } from './pages/Settings';
import { Team } from './pages/Team';
import { GuideIndex, GuideChapterPage, GuidePrint } from './pages/Guide';
import { Login } from './pages/Login';
import { Toaster } from './components/Toast';
import { PwaReloadPrompt } from './components/PwaReloadPrompt';
import { AuthProvider, useAuth } from './lib/auth-context';
import { BRAND_PRESETS, DEFAULT_PALETTE, paletteFromCustomColor, applyBrandPalette, saveBrandPalette } from './lib/brand-color';
import { applyPageBackground, savePageBackground } from './lib/page-background';

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
  useEffect(() => {
    if (!settings) return;
    applyPageBackground(settings.backgroundColor);
    savePageBackground(settings.backgroundColor);
  }, [settings]);
  return null;
}

function AppGate() {
  const { user, isLoading, isAdmin, can } = useAuth();

  if (isLoading) {
    return (
      <div
        className="app-shell min-h-[100dvh] flex items-center justify-center bg-[var(--color-brand-surface)]"
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
        {can('agenda') && <Route path="/agenda" element={<Appointments />} />}
        {can('clienti') && <Route path="/clienti" element={<Clients />} />}
        {can('servizi') && <Route path="/servizi" element={<Services />} />}
        {can('vendite') && <Route path="/vendite" element={<Sales />} />}
        {can('incassi') && <Route path="/incassi" element={<Revenue />} />}
        {can('magazzino') && <Route path="/magazzino" element={<Inventory />} />}
        <Route path="/guida" element={<GuideIndex />} />
        <Route path="/guida/stampa" element={<GuidePrint />} />
        <Route path="/guida/:chapterId" element={<GuideChapterPage />} />
        {isAdmin && <Route path="/impostazioni" element={<Settings />} />}
        {isAdmin && <Route path="/team" element={<Team />} />}
        {isAdmin && <Route path="/utenti" element={<Navigate to="/team" replace />} />}
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
