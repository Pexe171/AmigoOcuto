const Footer: React.FC = () => {
  return (
    <footer style={{ background: '#0f172a', color: '#e2e8f0', marginTop: '80px' }}>
      <div className="container" style={{ padding: '32px 0', display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <strong>Megacuto Domingo Oculto</strong>
          <p style={{ margin: '8px 0', color: '#94a3b8' }}>
            Plataforma profissional para organizar inscrições, listas de presentes e sorteios sigilosos.
          </p>
        </div>
        <div style={{ textAlign: 'right' }}>
          <p style={{ margin: 0 }}>Contato do comitê organizador</p>
          <small style={{ color: '#94a3b8' }}>Use o painel administrativo para criar e refazer eventos com segurança.</small>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
