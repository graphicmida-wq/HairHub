import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Layout } from './components/Layout';
import { Dashboard } from './pages/Dashboard';
import { Clients } from './pages/Clients';
import { Appointments } from './pages/Appointments';
import { Inventory } from './pages/Inventory';

export default function App() {
  return (
    <BrowserRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/agenda" element={<Appointments />} />
          <Route path="/clienti" element={<Clients />} />
          <Route path="/magazzino" element={<Inventory />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  );
}
