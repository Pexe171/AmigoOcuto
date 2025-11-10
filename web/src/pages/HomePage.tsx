// Este ficheiro deve estar em web/src/pages/HomePage.tsx
import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';

const HomePage: React.FC = () => {
  return (
    <div className="relative z-10 flex flex-col items-center justify-center text-center p-6">
      <Card className="max-w-lg">
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
          <Button to="/inscricao" variant="primary" className="w-full sm:w-auto">
            Inscrever-se
          </Button>
          <Button to="/login" variant="secondary" className="w-full sm:w-auto">
            Construir Lista
          </Button>
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
      </Card>
    </div>
  );
};

export default HomePage;
