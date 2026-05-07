import { useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useGetSettings } from '@workspace/api-client-react';
import { Layout } from './components/Layout';
import { Dashboard } from './pages/Dashboard';
import { Clients } from './pages/Clients';
import { Appointments } from './pages/Appointments';
import { Inventory } from './pages/Inventory';
import { Services } from './pages/Services';
import { Settings } from './pages/Settings';
import { Toaster } from './components/Toast';
import { BRAND_PRESETS, paletteFromCustomColor, applyBrandPalette, saveBrandPalette } from './lib/brand-color';

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
    if (!settings?.brandColor) return;
    const preset = BRAND_PRESETS.find(p => p.primary.toLowerCase() === settings.brandColor!.toLowerCase());
    const palette = preset ?? paletteFromCustomColor(settings.brandColor);
    applyBrandPalette(palette);
    saveBrandPalette(palette);
  }, [settings?.brandColor]);
  return null;
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <BrandColorSync />
        <Layout>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/agenda" element={<Appointments />} />
            <Route path="/clienti" element={<Clients />} />
            <Route path="/servizi" element={<Services />} />
            <Route path="/magazzino" element={<Inventory />} />
            <Route path="/impostazioni" element={<Settings />} />
          </Routes>
        </Layout>
        <Toaster />
      </BrowserRouter>
    </QueryClientProvider>
  );
}
