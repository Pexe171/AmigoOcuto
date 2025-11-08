import React, { useState, FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { adminLogin } from '../services/api';
import { useNotification } from '../context/NotificationContext';

const ADMLoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { showNotification } = useNotification();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!email || !password) {
      showNotification('Por favor, preencha o e-mail e a senha.', 'error');
      return;
    }
    setIsLoading(true);
    try {
      const { token } = await adminLogin(email, password);
      localStorage.setItem('amigoocuto.adminToken', token);
      showNotification('Login bem-sucedido! Redirecionando...', 'success');
      navigate('/admin');
    } catch (error) {
      showNotification(error instanceof Error ? error.message : 'Ocorreu um erro desconhecido', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <section className="relative z-10 flex flex-col items-center justify-center px-6 pb-16">
      <div className="w-full max-w-xl bg-white/15 backdrop-blur-sm border border-white/30 rounded-3xl shadow-2xl p-8 md:p-10">
        <header className="text-center mb-8">
          <p
            className="inline-flex items-center gap-2 px-4 py-1.5 text-sm font-semibold rounded-full bg-emerald-600/80 text-white shadow-lg"
            style={{ fontFamily: "'Merriweather', serif" }}
          >
            🎄 Portal Administrativo
          </p>
          <h2
            className="mt-4 text-3xl md:text-4xl font-bold text-white"
            style={{ fontFamily: "'Merriweather', serif" }}
          >
            Faça login
          </h2>
          <p className="mt-2 text-white/80" style={{ fontFamily: "'Merriweather', serif" }}>
            Utilize o e-mail e a senha de administrador para continuar.
          </p>
        </header>

        <form className="space-y-6" onSubmit={handleSubmit}>
          <div className="flex flex-col gap-2">
            <label
              htmlFor="adm-email"
              className="text-sm font-semibold uppercase tracking-wider text-white/90"
              style={{ fontFamily: "'Merriweather', serif" }}
            >
              E-mail
            </label>
            <input
              id="adm-email"
              type="email"
              inputMode="email"
              autoComplete="email"
              placeholder="admin@amigooculto.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-2xl border border-white/40 bg-white/85 px-4 py-3 text-gray-800 placeholder:text-gray-500 focus:border-emerald-500 focus:outline-none focus:ring-4 focus:ring-emerald-400/40 transition"
              disabled={isLoading}
            />
          </div>

          <div className="flex flex-col gap-2">
            <label
              htmlFor="adm-password"
              className="text-sm font-semibold uppercase tracking-wider text-white/90"
              style={{ fontFamily: "'Merriweather', serif" }}
            >
              Senha
            </label>
            <input
              id="adm-password"
              type="password"
              autoComplete="current-password"
              placeholder="Digite sua senha"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-2xl border border-white/40 bg-white/85 px-4 py-3 text-gray-800 placeholder:text-gray-500 focus:border-red-500 focus:outline-none focus:ring-4 focus:ring-red-400/40 transition"
              disabled={isLoading}
            />
          </div>

          <div className="flex items-center justify-between text-sm text-white/80" style={{ fontFamily: "'Merriweather', serif" }}>
            <label className="inline-flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={remember}
                onChange={(e) => setRemember(e.target.checked)}
                className="h-4 w-4 rounded border border-white/60 bg-white/80 text-emerald-600 focus:ring-emerald-500"
                disabled={isLoading}
              />
              <span>Lembrar sessão</span>
            </label>
            <button
              type="button"
              className="text-white underline underline-offset-4 decoration-white/60 hover:text-white transition-colors"
              onClick={() => showNotification('Funcionalidade ainda não implementada.', 'info')}
            >
              Esqueci a senha
            </button>
          </div>

          <button
            type="submit"
            className="w-full flex items-center justify-center gap-2 rounded-full bg-emerald-600 py-3 text-lg font-semibold text-white shadow-lg shadow-emerald-900/60 transition hover:bg-emerald-500 focus:outline-none focus:ring-4 focus:ring-emerald-400/60 disabled:bg-gray-500"
            disabled={isLoading}
          >
            {isLoading ? 'Entrando...' : 'Entrar'}
          </button>
        </form>

        <div className="mt-8 rounded-2xl border border-white/20 bg-black/20 p-4 text-sm text-white/80" style={{ fontFamily: "'Merriweather', serif" }}>
          <h3 className="text-base font-semibold text-white mb-2">Acesso restrito</h3>
          <p>
            Apenas administradores do evento podem acessar o painel de gestão.
          </p>
        </div>
        
        <p className="mt-6 text-center text-sm text-white/70" style={{ fontFamily: "'Merriweather', serif" }}>
          Não é um administrador?{' '}
          <Link
            to="/"
            className="font-semibold text-white underline underline-offset-4 decoration-white/60 hover:text-red-200 transition-colors"
          >
            Voltar para a página inicial
          </Link>
        </p>
      </div>
    </section>
  );
};

export default ADMLoginPage;
