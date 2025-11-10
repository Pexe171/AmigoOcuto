import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import RegistrationPage from './pages/RegistrationPage';
import VerificationPage from './pages/VerificationPage';
import GiftListPage from './pages/GiftListPage';
import AdminPage from './pages/AdminPage';
import ADMLoginPage from './pages/ADMLoginPage';
import HomePage from './pages/HomePage';
import ParticipantLoginPage from './pages/ParticipantLoginPage';
import ProtectedRoute from './components/ProtectedRoute';
import { NotificationProvider } from './context/NotificationContext';
import { AppLayout } from './layouts/AppLayout';

const App: React.FC = () => {
  return (
    <BrowserRouter>
      <NotificationProvider>
        <AppLayout>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/inscricao" element={<RegistrationPage />} />
            <Route path="/confirmacao" element={<VerificationPage />} />
            <Route path="/login" element={<ParticipantLoginPage />} />
            <Route
              path="/listas"
              element={
                <ProtectedRoute>
                  <GiftListPage />
                </ProtectedRoute>
              }
            />
            <Route path="/adm" element={<ADMLoginPage />} />
            <Route path="/admin" element={<AdminPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </AppLayout>
      </NotificationProvider>
    </BrowserRouter>
  );
};

export default App;
