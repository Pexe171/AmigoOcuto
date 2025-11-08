import React from 'react';
import { Navigate } from 'react-router-dom';
import { useParticipant } from '../context/ParticipantContext';
import { useNotification } from '../hooks/useNotification';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { participant } = useParticipant();
  const { show } = useNotification();

  if (!participant.token) {
    show('error', 'Você precisa estar logado para acessar esta página.');
    return <Navigate to="/participant-login" replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
