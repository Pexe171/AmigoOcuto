// Este ficheiro deve estar em web/src/pages/HomePage.tsx
import React from 'react';
import { Link } from 'react-router-dom';

// Componente auxiliar para estilização e comportamentos dos botões (Link)
const ButtonStyle: React.FC<{ to: string, className: string, children: React.ReactNode }> = ({ to, className, children }) => (
  <Link
    to={to}
    className={`
      w-full sm:w-auto font-bold py-3 px-8 rounded-full shadow-lg 
      transform transition-all duration-200 ease-in-out 
      hover:scale-[1.02] active:scale-[0.98] active:shadow-md 
      focus:outline-none focus:ring-4 focus:ring-offset-2
      ${className}
    `}
  >
    {children}
  </Link>
);

const HomePage: React.FC = () => {
  return (
    <div className="relative z-10 flex flex-col items-center justify-center text-center p-6">
      {/* CARD DE CONTEÚDO: Ajustado para maior opacidade e sombra mais suave */}
      <div className="w-full max-w-lg bg-white/15 backdrop-blur-sm p-8 md:p-12 rounded-3xl shadow-2xl border border-white/30">
        <h2 
          className="text-3xl md:text-4xl font-bold text-white mb-4"
          style={{ fontFamily: "'Merriweather', serif" }}
        >
          Bem-vindo!
        </h2>
        <p
          className="text-lg text-white/90 mb-8"
          style={{ fontFamily: "'Merriweather', serif" }}
        >
          Participe do nosso amigo oculto de Natal. Inscreva-se e monte sua lista de presentes.
        </p>
        
        <div className="flex flex-col sm:flex-row flex-wrap gap-4 justify-center">
          
          {/* Botão Primário: Inscrever-se (Vermelho Vibrante) */}
          <ButtonStyle 
            to="/inscricao"
            className="bg-red-600 text-white shadow-red-800/50 hover:bg-red-700 focus:ring-red-500"
          >
            Inscrever-se
          </ButtonStyle>
          
          {/* Botão Secundário: Construir Lista (Branco/Vermelho para contraste) */}
          <ButtonStyle
            to="/login"
            className="bg-white text-red-700 shadow-white/50 hover:bg-gray-100 focus:ring-white"
          >
            Construir Lista
          </ButtonStyle>
          
        </div>
        
        {/* Link Admin */}
        <p className="text-sm text-white/80 mt-6" style={{ fontFamily: "'Merriweather', serif" }}>
          Organização do evento?{' '}
          <Link
            to="/adm"
            className="underline underline-offset-4 decoration-white/60 hover:text-white transition-colors"
          >
            Acesse com ADM
          </Link>
        </p>
      </div>
    </div>
  );
};

export default HomePage;
