import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Layout } from '../../components/Layout';
import { DoctorSearch } from './DoctorSearch';
import { SlotPicker } from './SlotPicker';
import { MyAppointments } from './MyAppointments';
import { AppointmentDetail } from './AppointmentDetail';

export default function PatientLayout() {
  const { user } = useAuth();

  const navItems = [
    { label: 'Find a Doctor', path: '/patient/doctors', icon: '🔍' },
    { label: 'My Appointments', path: '/patient/appointments', icon: '📅' },
  ];

  return (
    <Layout navItems={navItems} title={`Welcome, ${user?.name || 'Patient'}`}>
      <Routes>
        <Route path="/" element={<Navigate to="doctors" replace />} />
        <Route path="doctors" element={<DoctorSearch />} />
        <Route path="doctors/:doctorId/book" element={<SlotPicker />} />
        <Route path="appointments" element={<MyAppointments />} />
        <Route path="appointments/:id" element={<AppointmentDetail />} />
      </Routes>
    </Layout>
  );
}
