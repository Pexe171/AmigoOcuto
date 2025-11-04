import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import PageLayout from './components/PageLayout';
import HomePage from './pages/HomePage';
import RegistrationPage from './pages/RegistrationPage';
import VerificationPage from './pages/VerificationPage';
import GiftListPage from './pages/GiftListPage';
import GiftLookupPage from './pages/GiftLookupPage';
import AdminPage from './pages/AdminPage';
import ADMLoginPage from './pages/ADMLoginPage';

// --- Componente Decorativo: Neve ---
const Snowfall: React.FC = () => (
  <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
    {[...Array(50)].map((_, i) => (
      <div
        key={i}
        className="absolute bg-white rounded-full animate-snow"
        style={{
          width: `${Math.random() * 3 + 1}px`,
          height: `${Math.random() * 3 + 1}px`,
          left: `${Math.random() * 100}%`,
          animationDuration: `${Math.random() * 10 + 5}s`,
          animationDelay: `${Math.random() * 5}s`,
          opacity: Math.random() * 0.5 + 0.3,
        }}
      />
    ))}
  </div>
);

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

// --- Componente Principal da Aplicação ---
const App: React.FC = () => {
  return (
    <BrowserRouter>
      {/* Importa as animações da neve via CSS/Style */}
      <style>
        {`
          /* Estilos de Fallback (os principais estão em index.css) */
          @keyframes fall {
            0% { transform: translateY(-100px) translateX(0); opacity: 1; }
            100% { transform: translateY(100vh) translateX(100px); opacity: 0; }
          }
          .animate-snow {
            animation: fall linear infinite;
          }
        `}
      </style>

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
            <Route path="/listas" element={<GiftListPage />} />
            <Route path="/consultar" element={<GiftLookupPage />} />
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
    </BrowserRouter>
  );
};

export default App;
