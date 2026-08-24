import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ToastProvider } from './components/Toast';
import ProtectedRoute from './components/ProtectedRoute';

import LoginPage from './pages/auth/LoginPage';
import RegisterPage from './pages/auth/RegisterPage';

import PatientLayout from './pages/patient/PatientLayout';
import DoctorLayout from './pages/doctor/DoctorLayout';
import AdminLayout from './pages/admin/AdminLayout';

function App() {
  return (
    <ToastProvider>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<Navigate to="/auth/login" replace />} />
          
          <Route path="/auth/login" element={<LoginPage />} />
          <Route path="/auth/register" element={<RegisterPage />} />
          
          <Route path="/patient/*" element={
            <ProtectedRoute requiredRole="patient">
              <PatientLayout />
            </ProtectedRoute>
          } />
          
          <Route path="/doctor/*" element={
            <ProtectedRoute requiredRole="doctor">
              <DoctorLayout />
            </ProtectedRoute>
          } />
          
          <Route path="/admin/*" element={
            <ProtectedRoute requiredRole="admin">
              <AdminLayout />
            </ProtectedRoute>
          } />
        </Routes>
      </AuthProvider>
    </ToastProvider>
  );
}

export default App;
