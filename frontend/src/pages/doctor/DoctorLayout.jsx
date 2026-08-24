import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Layout } from '../../components/Layout';
import { TodayQueue } from './TodayQueue';
import { DoctorAppointments } from './DoctorAppointments';
import { DoctorAppointmentDetail } from './DoctorAppointmentDetail';

export default function DoctorLayout() {
  const { user } = useAuth();

  const navItems = [
    { label: 'Today\'s Queue', path: '/doctor/today', icon: '🩺' },
    { label: 'All Appointments', path: '/doctor/appointments', icon: '📅' },
  ];

  return (
    <Layout navItems={navItems} title={`Dr. ${user?.name || ''}`}>
      <Routes>
        <Route path="/" element={<Navigate to="today" replace />} />
        <Route path="today" element={<TodayQueue />} />
        <Route path="appointments" element={<DoctorAppointments />} />
        <Route path="appointments/:id" element={<DoctorAppointmentDetail />} />
      </Routes>
    </Layout>
  );
}
