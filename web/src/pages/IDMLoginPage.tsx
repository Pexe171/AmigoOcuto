import React from 'react';
import { Link } from 'react-router-dom';

const IDMLoginPage: React.FC = () => {
  return (
    <section className="relative z-10 flex flex-col items-center justify-center px-6 pb-16">
      <div className="w-full max-w-xl bg-white/15 backdrop-blur-sm border border-white/30 rounded-3xl shadow-2xl p-8 md:p-10">
        <header className="text-center mb-8">
          <p
            className="inline-flex items-center gap-2 px-4 py-1.5 text-sm font-semibold rounded-full bg-emerald-600/80 text-white shadow-lg"
            style={{ fontFamily: "'Merriweather', serif" }}
          >
            🎄 Portal Administrativo IDM
          </p>
          <h2
            className="mt-4 text-3xl md:text-4xl font-bold text-white"
            style={{ fontFamily: "'Merriweather', serif" }}
          >
            Faça login com o seu IDM
          </h2>
          <p className="mt-2 text-white/80" style={{ fontFamily: "'Merriweather', serif" }}>
            Utilize o e-mail corporativo e a senha do IDM para continuar.
          </p>
        </header>

        <form className="space-y-6">
          <div className="flex flex-col gap-2">
            <label
              htmlFor="idm-email"
              className="text-sm font-semibold uppercase tracking-wider text-white/90"
              style={{ fontFamily: "'Merriweather', serif" }}
            >
              E-mail IDM
            </label>
            <input
              id="idm-email"
              type="email"
              inputMode="email"
              autoComplete="email"
              placeholder="seu.nome@empresa.com"
              className="w-full rounded-2xl border border-white/40 bg-white/85 px-4 py-3 text-gray-800 placeholder:text-gray-500 focus:border-emerald-500 focus:outline-none focus:ring-4 focus:ring-emerald-400/40 transition"
            />
          </div>

          <div className="flex flex-col gap-2">
            <label
              htmlFor="idm-password"
              className="text-sm font-semibold uppercase tracking-wider text-white/90"
              style={{ fontFamily: "'Merriweather', serif" }}
            >
              Senha IDM
            </label>
            <input
              id="idm-password"
              type="password"
              autoComplete="current-password"
              placeholder="Digite sua senha"
              className="w-full rounded-2xl border border-white/40 bg-white/85 px-4 py-3 text-gray-800 placeholder:text-gray-500 focus:border-red-500 focus:outline-none focus:ring-4 focus:ring-red-400/40 transition"
            />
          </div>

          <div className="flex items-center justify-between text-sm text-white/80" style={{ fontFamily: "'Merriweather', serif" }}>
            <label className="inline-flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border border-white/60 bg-white/80 text-emerald-600 focus:ring-emerald-500"
              />
              <span>Lembrar sessão neste dispositivo</span>
            </label>
            <button
              type="button"
              className="text-white underline underline-offset-4 decoration-white/60 hover:text-white transition-colors"
            >
              Esqueci a senha
            </button>
          </div>

          <button
            type="submit"
            className="w-full flex items-center justify-center gap-2 rounded-full bg-emerald-600 py-3 text-lg font-semibold text-white shadow-lg shadow-emerald-900/60 transition hover:bg-emerald-500 focus:outline-none focus:ring-4 focus:ring-emerald-400/60"
          >
            Entrar
          </button>
        </form>

        <div className="mt-8 rounded-2xl border border-white/20 bg-black/20 p-4 text-sm text-white/80" style={{ fontFamily: "'Merriweather', serif" }}>
          <h3 className="text-base font-semibold text-white mb-2">Acesso restrito</h3>
          <p>
            Apenas administradores do evento com credenciais IDM válidas podem
            avançar para o painel de gestão. Se você precisa de acesso, contate a equipe
            organizadora.
          </p>
        </div>

        <p className="mt-6 text-center text-sm text-white/70" style={{ fontFamily: "'Merriweather', serif" }}>
          Preferia usar o token administrativo antigo?{' '}
          <Link
            to="/admin"
            className="font-semibold text-white underline underline-offset-4 decoration-white/60 hover:text-red-200 transition-colors"
          >
            Acesse aqui
          </Link>
        </p>
      </div>
    </section>
  );
};

export default IDMLoginPage;
