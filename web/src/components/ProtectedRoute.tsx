import React, { useEffect, useRef } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useParticipant } from '../context/ParticipantContext';
import { useNotification } from '../hooks/useNotification';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { participant, isReady } = useParticipant();
  const { show } = useNotification();
  const location = useLocation();
  const hasWarnedRef = useRef(false);

  const isAuthenticated = Boolean(participant.id);

  useEffect(() => {
    if (isReady && !isAuthenticated && !hasWarnedRef.current) {
      show('error', 'Você precisa estar logado para acessar esta página.');
      hasWarnedRef.current = true;
    }
    if (isAuthenticated) {
      hasWarnedRef.current = false;
    }
  }, [isAuthenticated, isReady, show]);

  if (!isReady) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <div className="rounded-3xl border border-white/20 bg-white/10 px-8 py-6 text-center text-white/80 shadow-lg shadow-black/30">
          Carregando sua sessão...
        </div>
      </div>
    );
  }
  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
