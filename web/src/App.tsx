import React from 'react';
import { BrowserRouter, Routes, Route, useNavigate, Navigate } from 'react-router-dom';
import RegistrationPage from './pages/RegistrationPage';
import VerificationPage from './pages/VerificationPage';
import GiftListPage from './pages/GiftListPage';
import AdminPage from './pages/AdminPage';
import ADMLoginPage from './pages/ADMLoginPage';
import HomePage from './pages/HomePage';
import ParticipantLoginPage from './pages/ParticipantLoginPage'; // Import ParticipantLoginPage
import ProtectedRoute from './components/ProtectedRoute'; // Import ProtectedRoute

// --- Componente Decorativo: Neve ---
const Snowfall: React.FC = () => {
  const flakes = React.useMemo(
    () =>
      Array.from({ length: 120 }, (_, index) => ({
        id: index,
        size: `${(index % 6) + 3}px`,
        left: `${(index * 13) % 100}%`,
        delay: `${(index % 12) * 0.6}s`,
        duration: `${8 + (index % 10)}s`,
        opacity: 0.35 + ((index % 5) * 0.1),
      })),
    [],
  );

  return (
    <div className="snow pointer-events-none">
      {flakes.map((flake) => (
        <div
          key={flake.id}
          className="snowflake"
          style={{
            width: flake.size,
            height: flake.size,
            left: flake.left,
            animationDelay: flake.delay,
            animationDuration: flake.duration,
            opacity: flake.opacity,
          }}
        />
      ))}
    </div>
  );
};

// --- Componente: Cabeçalho Festivo (usará a navegação do React Router) ---
const FestiveHeader: React.FC = () => {
  const navigate = useNavigate();
  return (
    <header className="relative z-10 text-center py-8">
      {/* Usamos navigate('/') para ir para a home, o que funciona dentro do BrowserRouter */}
      <button
        onClick={() => navigate('/')} 
        className="text-white transition-opacity hover:opacity-80"
      >
        <h1
          className="font-bold text-5xl md:text-6xl"
          style={{ fontFamily: "'Mountains of Christmas', cursive" }}
        >
          Amigo Oculto
        </h1>
        <p className="text-xl text-white opacity-90" style={{ fontFamily: "'Merriweather', serif" }}>
          de Natal
        </p>
      </button>
    </header>
  );
};

import { NotificationProvider } from './context/NotificationContext';

// --- Componente Principal da Aplicação ---
const App: React.FC = () => {
  return (
    <BrowserRouter>
      <NotificationProvider>
        {/* Container com o fundo gradiente e a neve */}
        <div className="relative min-h-screen w-full bg-gradient-to-br from-red-800 to-red-900 overflow-x-hidden">
          <Snowfall />
          
          {/* Cabeçalho Festivo - agora com navegação correta */}
          <FestiveHeader />

          {/* Rotas */}
          <main className="relative z-10">
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/inscricao" element={<RegistrationPage />} />
              <Route path="/confirmacao" element={<VerificationPage />} />
              <Route path="/login" element={<ParticipantLoginPage />} /> {/* Changed to ParticipantLoginPage */}
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
              
              {/* Redireciona qualquer rota não encontrada para a Home */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </main>
          
          {/* Rodapé Festivo */}
          <footer className="relative z-10 text-center py-6 mt-12">
              <p className="text-sm text-white/50" style={{ fontFamily: "'Merriweather', serif" }}>
                Feito com 🎄 por David.
              </p>
          </footer>
        </div>
      </NotificationProvider>
    </BrowserRouter>
  );
};

export default App;