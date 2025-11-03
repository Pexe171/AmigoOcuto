import { Link } from 'react-router-dom';

const FeatureCard: React.FC<{ title: string; description: string }> = ({ title, description }) => (
  <div className="shadow-card" style={{ flex: 1 }}>
    <h3 style={{ marginTop: 0 }}>{title}</h3>
    <p style={{ color: '#475569' }}>{description}</p>
  </div>
);

const HomePage: React.FC = () => {
  return (
    <div className="container" style={{ padding: '48px 0 80px' }}>
      <section className="banner">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <span className="badge">Amigo Ocuto 2025</span>
          <h1 style={{ fontSize: '2.5rem', margin: 0 }}>Experiência profissional para o seu amigo oculto</h1>
          <p style={{ fontSize: '1.1rem', color: '#475569', maxWidth: '620px' }}>
            Centralize as inscrições, valide e-mails automaticamente, colete listas de presentes e execute sorteios sigilosos com histórico auditável.
          </p>
          <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
            <Link to="/inscricao" className="primary-button">
              Começar inscrição
            </Link>
            <Link to="/listas" className="secondary-button">
              Construir lista de presentes
            </Link>
          </div>
        </div>
      </section>

      <section style={{ marginTop: '48px' }}>
        <h2 className="section-title">Tudo que você precisa em um só lugar</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap' }}>
            <FeatureCard
              title="Inscrição inteligente"
              description="Formulário adaptável para adultos e crianças, com coleta de apelidos, preferências e responsáveis."
            />
            <FeatureCard
              title="Verificação automática"
              description="Envio de código por e-mail para garantir que cada participante esteja realmente confirmado."
            />
          </div>
          <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap' }}>
            <FeatureCard
              title="Listas de presentes colaborativas"
              description="Organize as sugestões de presentes com prioridade, links e observações para evitar compras duplicadas."
            />
            <FeatureCard
              title="Sorteio transparente"
              description="O painel administrativo gera tickets e histórico sem revelar quem tirou quem, preservando o segredo."
            />
          </div>
        </div>
      </section>
    </div>
  );
};

export default HomePage;
