import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Layout } from '../../components/Layout';
import { DoctorManager } from './DoctorManager';
import { DoctorDetail } from './DoctorDetail';
import { NotificationsPage } from './NotificationsPage';

export default function AdminLayout() {
  const { user } = useAuth();

  const navItems = [
    { label: 'Manage Doctors', path: '/admin/doctors', icon: '👨‍⚕️' },
    { label: 'Notifications', path: '/admin/notifications', icon: '🔔' },
  ];

  return (
    <Layout navItems={navItems} title="Admin Portal">
      <Routes>
        <Route path="/" element={<Navigate to="doctors" replace />} />
        <Route path="doctors" element={<DoctorManager />} />
        <Route path="doctors/:id" element={<DoctorDetail />} />
        <Route path="notifications" element={<NotificationsPage />} />
      </Routes>
    </Layout>
  );
}
