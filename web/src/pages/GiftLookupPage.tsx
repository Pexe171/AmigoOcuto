import { FormEvent, useState } from 'react';
import { api, extractErrorMessage } from '../services/api';
import { useNotification } from '../hooks/useNotification';
import Notification from '../components/Notification';

const objectIdRegex = /^[0-9a-fA-F]{24}$/;

type ParticipantResult = {
  id: string;
  firstName: string;
  secondName: string;
  nickname?: string;
  isChild: boolean;
};

type ParticipantStatus = {
  id: string;
  firstName: string;
  secondName: string;
  nickname?: string;
  emailVerified: boolean;
  isChild: boolean;
  attendingInPerson?: boolean;
};

type GiftItem = {
  name: string;
  description?: string;
  url?: string;
  priority?: 'alta' | 'media' | 'baixa';
};

type GiftResponse = {
  items: GiftItem[];
};

const GiftLookupPage: React.FC = () => {
  const { notification, show, clear } = useNotification();
  const [query, setQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [results, setResults] = useState<ParticipantResult[]>([]);
  const [selectedParticipant, setSelectedParticipant] = useState<ParticipantStatus | null>(null);
  const [gifts, setGifts] = useState<GiftItem[]>([]);
  const [loadingParticipant, setLoadingParticipant] = useState(false);

  const resetSelection = (): void => {
    setSelectedParticipant(null);
    setGifts([]);
  };

  const fetchParticipantData = async (participantId: string): Promise<void> => {
    setLoadingParticipant(true);
    clear();
    try {
      const [statusResponse, giftsResponse] = await Promise.all([
        api.get(`/participants/${participantId}`),
        api.get(`/participants/${participantId}/gifts`)
      ]);

      const status = statusResponse.data as ParticipantStatus;
      const giftData = giftsResponse.data as GiftResponse;

      if (!status.emailVerified) {
        show('error', 'Este participante ainda não confirmou o e-mail. Solicite a verificação antes de consultar a lista.');
        resetSelection();
        return;
      }

      setSelectedParticipant(status);
      setGifts(giftData.items ?? []);
      if (giftData.items.length === 0) {
        show('info', `Nenhum presente cadastrado por ${status.firstName} ${status.secondName} até o momento.`);
      } else {
        show('success', `Lista carregada para ${status.firstName} ${status.secondName}.`);
      }
    } catch (error) {
      show('error', extractErrorMessage(error));
      resetSelection();
    } finally {
      setLoadingParticipant(false);
    }
  };

  const handleSearch = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    clear();
    resetSelection();

    const trimmed = query.trim();
    if (!trimmed) {
      show('error', 'Informe o nome completo ou o ID do participante.');
      return;
    }

    if (objectIdRegex.test(trimmed)) {
      setResults([]);
      await fetchParticipantData(trimmed);
      return;
    }

    setIsSearching(true);
    try {
      const response = await api.get('/participants/search', { params: { q: trimmed } });
      const data = response.data as { results: ParticipantResult[] };
      setResults(data.results);
      if (data.results.length === 0) {
        show('info', 'Nenhum participante encontrado para o nome informado.');
      } else {
        show('success', `${data.results.length} participante(s) encontrado(s). Selecione abaixo.`);
      }
    } catch (error) {
      show('error', extractErrorMessage(error));
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <div className="container" style={{ padding: '48px 0' }}>
      <div className="shadow-card" style={{ maxWidth: '860px', margin: '0 auto' }}>
        <h2 style={{ marginTop: 0 }}>Consulte a lista de presentes</h2>
        <p style={{ color: '#475569' }}>
          Pesquise pelo nome completo do participante que você sorteou ou cole diretamente o ID informado no e-mail do sorteio.
        </p>

        {notification && <Notification type={notification.type} message={notification.message} onClose={clear} />}

        <form onSubmit={handleSearch} className="form-grid" style={{ marginTop: '24px', gap: '16px' }}>
          <div>
            <label htmlFor="lookupQuery">Nome ou ID do participante</label>
            <input
              id="lookupQuery"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Ex.: Ana Beatriz ou 65f3b2c1..."
            />
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button type="submit" className="primary-button" disabled={isSearching}>
              {isSearching ? 'Pesquisando...' : 'Buscar'}
            </button>
          </div>
        </form>

        {results.length > 0 && (
          <section style={{ marginTop: '24px' }}>
            <h3>Participantes encontrados</h3>
            <table className="table">
              <thead>
                <tr>
                  <th>Nome</th>
                  <th>Apelido</th>
                  <th>Tipo</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {results.map((participant) => (
                  <tr key={participant.id}>
                    <td>
                      {participant.firstName} {participant.secondName}
                    </td>
                    <td>{participant.nickname ?? '—'}</td>
                    <td style={{ textTransform: 'capitalize' }}>{participant.isChild ? 'Criança' : 'Adulto'}</td>
                    <td>
                      <button
                        type="button"
                        className="secondary-button"
                        onClick={() => void fetchParticipantData(participant.id)}
                        disabled={loadingParticipant}
                      >
                        Ver lista
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        )}

        {loadingParticipant && <p>Carregando lista selecionada...</p>}

        {selectedParticipant && !loadingParticipant && (
          <section style={{ marginTop: '24px' }}>
            <h3 style={{ marginTop: 0 }}>
              Lista de {selectedParticipant.firstName} {selectedParticipant.secondName}
              {selectedParticipant.nickname ? ` (${selectedParticipant.nickname})` : ''}
            </h3>
            <p style={{ color: '#475569' }}>
              Participação: {selectedParticipant.isChild ? 'Criança' : 'Adulto'} · Presença:{' '}
              {selectedParticipant.attendingInPerson ? 'Confirmada no encontro presencial' : 'Remota ou indefinida'}
            </p>
            {gifts.length === 0 ? (
              <p>Este participante ainda não cadastrou preferências de presente.</p>
            ) : (
              <ul>
                {gifts.map((gift, index) => (
                  <li key={`${gift.name}-${index}`} style={{ marginBottom: '12px' }}>
                    <strong>{gift.name}</strong>
                    {gift.priority ? ` · prioridade ${gift.priority}` : ''}
                    {gift.description ? ` — ${gift.description}` : ''}
                    {gift.url ? (
                      <>
                        {' '}
                        <a href={gift.url} target="_blank" rel="noreferrer">
                          Link de referência
                        </a>
                      </>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}
      </div>
    </div>
  );
};

export default GiftLookupPage;
