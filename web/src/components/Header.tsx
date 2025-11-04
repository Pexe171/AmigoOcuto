import { Link, NavLink } from 'react-router-dom';
import { useParticipant } from '../context/ParticipantContext';

const Header: React.FC = () => {
  const { participant } = useParticipant();

  return (
    <header style={{ background: '#fff', borderBottom: '1px solid #e2e8f0' }}>
      <div className="container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 0' }}>
        <Link to="/" style={{ textDecoration: 'none' }}>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontWeight: 700, fontSize: '1.25rem', color: '#4338ca' }}>Amigo Ocuto</span>
            <span style={{ fontSize: '0.85rem', color: '#475569' }}>Encontro Secreto</span>
          </div>
        </Link>
        <nav style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
          <NavLink
            to="/inscricao"
            style={({ isActive }) => ({
              color: isActive ? '#4338ca' : '#475569',
              fontWeight: 600,
              textDecoration: 'none'
            })}
          >
            Inscrição
          </NavLink>
          <NavLink
            to="/listas"
            style={({ isActive }) => ({
              color: isActive ? '#4338ca' : '#475569',
              fontWeight: 600,
              textDecoration: 'none'
            })}
          >
            Lista de Presentes
          </NavLink>
          <NavLink
            to="/consultar"
            style={({ isActive }) => ({
              color: isActive ? '#4338ca' : '#475569',
              fontWeight: 600,
              textDecoration: 'none'
            })}
          >
            Consultar Sorteio
          </NavLink>
          <NavLink
            to="/confirmacao"
            style={({ isActive }) => ({
              color: isActive ? '#4338ca' : '#475569',
              fontWeight: 600,
              textDecoration: 'none'
            })}
          >
            Confirmar E-mail
          </NavLink>
          <NavLink
            to="/admin"
            style={({ isActive }) => ({
              color: isActive ? '#4338ca' : '#475569',
              fontWeight: 600,
              textDecoration: 'none'
            })}
          >
            Painel Admin
          </NavLink>
        </nav>
        <div>
          {participant.id ? (
            <span className="badge">Inscrição ativa: {participant.firstName}</span>
          ) : (
            <span style={{ color: '#94a3b8', fontSize: '0.9rem' }}>Nenhuma inscrição selecionada</span>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;
