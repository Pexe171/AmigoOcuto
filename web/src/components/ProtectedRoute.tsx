import React, { useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { useParticipant } from '../context/ParticipantContext';
import { useNotification } from '../hooks/useNotification';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { participant } = useParticipant();
  const { show } = useNotification();

  const isAuthenticated = Boolean(participant.token);

  useEffect(() => {
    if (!isAuthenticated) {
      show('error', 'Você precisa estar logado para acessar esta página.');
    }
  }, [isAuthenticated, show]);

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
