import { useNavigate } from 'react-router-dom';

export const FestiveHeader = (): JSX.Element => {
  const navigate = useNavigate();

  return (
    <header className="relative z-10 text-center py-8">
      <button onClick={() => navigate('/')} className="text-white transition-opacity hover:opacity-80">
        <h1 className="font-bold text-5xl md:text-6xl" style={{ fontFamily: "'Mountains of Christmas', cursive" }}>
          Amigo Oculto
        </h1>
        <p className="text-xl text-white opacity-90" style={{ fontFamily: "'Merriweather', serif" }}>
          de Natal
        </p>
      </button>
    </header>
  );
};
