import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './auth.jsx';
import { Spinner } from './ui.jsx';
import Layout from './components/Layout.jsx';
import Login from './pages/Login.jsx';
import Dashboard from './pages/Dashboard.jsx';
import MyGoals from './pages/MyGoals.jsx';
import Team from './pages/Team.jsx';
import SheetDetail from './pages/SheetDetail.jsx';
import SharedGoals from './pages/SharedGoals.jsx';
import Reports from './pages/Reports.jsx';
import Analytics from './pages/Analytics.jsx';
import Audit from './pages/Audit.jsx';
import Escalations from './pages/Escalations.jsx';
import CycleAdmin from './pages/CycleAdmin.jsx';

export default function App() {
  const { user, loading } = useAuth();
  if (loading) return <div className="h-full flex items-center justify-center"><Spinner /></div>;
  if (!user) {
    return (
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    );
  }
  return (
    <Layout>
      <Routes>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/my-goals" element={<MyGoals />} />
        <Route path="/team" element={<Team />} />
        <Route path="/sheet/:id" element={<SheetDetail />} />
        <Route path="/shared-goals" element={<SharedGoals />} />
        <Route path="/reports" element={<Reports />} />
        <Route path="/analytics" element={<Analytics />} />
        <Route path="/audit" element={<Audit />} />
        <Route path="/escalations" element={<Escalations />} />
        <Route path="/cycle" element={<CycleAdmin />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </Layout>
  );
}
