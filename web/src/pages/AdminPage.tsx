import { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { useMutation, useQuery } from '@tanstack/react-query';
import { z } from 'zod';
import { api, extractErrorMessage } from '../services/api';
import Notification from '../components/Notification';
import { useNotification } from '../hooks/useNotification';

const eventSchema = z.object({
  name: z.string().min(4, 'Informe o nome do evento'),
  participantIds: z.array(z.string()).optional()
});

type EventForm = {
  name: string;
  participantIds: string;
};

type EventSummary = {
  id: string;
  name: string;
  status: string;
  participantes: number;
  sorteios: number;
  criadoEm: string;
};

type EventHistory = {
  name: string;
  status: string;
  sorteios: { drawnAt: string; participantes: number }[];
};

type DrawResult = {
  tickets: number;
};

type ParticipantSummary = {
  id: string;
  firstName: string;
  secondName: string;
  nickname?: string;
  email?: string;
  isChild: boolean;
  emailVerified: boolean;
  attendingInPerson?: boolean;
  primaryGuardianEmail?: string;
  giftCount: number;
  createdAt: string;
};

type GiftItem = {
  name: string;
  description?: string;
  url?: string;
  priority?: 'alta' | 'media' | 'baixa';
};

type ParticipantDetail = {
  id: string;
  firstName: string;
  secondName: string;
  nickname?: string;
  email?: string;
  isChild: boolean;
  emailVerified: boolean;
  attendingInPerson?: boolean;
  primaryGuardianEmail?: string;
  guardianEmails: string[];
  gifts: GiftItem[];
  createdAt: string;
  updatedAt: string;
};

const TOKEN_KEY = 'amigoocuto.adminToken';

const AdminPage: React.FC = () => {
  const { notification, show, clear } = useNotification();
  const [token, setToken] = useState<string>(() => localStorage.getItem(TOKEN_KEY) ?? '');
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [shouldRestoreSession, setShouldRestoreSession] = useState<boolean>(() => Boolean(localStorage.getItem(TOKEN_KEY)));
  const [form, setForm] = useState<EventForm>({ name: '', participantIds: '' });
  const [selectedEvent, setSelectedEvent] = useState<string | null>(null);
  const [selectedParticipantId, setSelectedParticipantId] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      setIsAuthenticated(false);
    }
  }, [token]);

  useEffect(() => {
    if (isAuthenticated && token) {
      localStorage.setItem(TOKEN_KEY, token);
    } else if (!token) {
      localStorage.removeItem(TOKEN_KEY);
    }
  }, [isAuthenticated, token]);

  useEffect(() => {
    if (!isAuthenticated) {
      setSelectedEvent(null);
      setSelectedParticipantId(null);
    }
  }, [isAuthenticated]);

  const authHeaders = useMemo(() => ({ headers: { 'x-admin-token': token } }), [token]);

  const loginMutation = useMutation<void, unknown, string>({
    mutationFn: async (tokenValue) => {
      await api.post('/admin/login', { token: tokenValue });
    },
    onSuccess: (_, tokenValue) => {
      setToken(tokenValue);
      setIsAuthenticated(true);
      setShouldRestoreSession((restore) => {
        show('success', restore ? 'Sessão administrativa restaurada.' : 'Acesso administrativo autorizado.');
        return false;
      });
    },
    onError: (error) => {
      setIsAuthenticated(false);
      setShouldRestoreSession(false);
      show('error', extractErrorMessage(error));
    }
  });

  useEffect(() => {
    if (shouldRestoreSession && token && !isAuthenticated && !loginMutation.isPending) {
      loginMutation.mutate(token);
    }
  }, [shouldRestoreSession, token, isAuthenticated, loginMutation]);

  const handleLogin = (): void => {
    if (!token) {
      show('error', 'Informe o token administrativo antes de conectar.');
      return;
    }
    clear();
    loginMutation.mutate(token);
  };

  const eventsQuery = useQuery<EventSummary[]>({
    queryKey: ['admin-events', token],
    queryFn: async () => {
      const response = await api.get('/admin/events', authHeaders);
      return response.data as EventSummary[];
    },
    enabled: isAuthenticated,
    staleTime: 1000 * 30,
    refetchOnWindowFocus: false
  });

  const participantsQuery = useQuery<ParticipantSummary[]>({
    queryKey: ['admin-participants', token],
    queryFn: async () => {
      const response = await api.get('/admin/participants', authHeaders);
      return response.data as ParticipantSummary[];
    },
    enabled: isAuthenticated,
    staleTime: 1000 * 30,
    refetchOnWindowFocus: false
  });

  const participantDetailsQuery = useQuery<ParticipantDetail>({
    queryKey: ['admin-participant-detail', selectedParticipantId, token],
    queryFn: async () => {
      const response = await api.get(`/admin/participants/${selectedParticipantId}`, authHeaders);
      return response.data as ParticipantDetail;
    },
    enabled: isAuthenticated && Boolean(selectedParticipantId),
    refetchOnWindowFocus: false
  });

  const createEventMutation = useMutation<{ id: string }, unknown, void>({
    mutationFn: async () => {
      const parsed = eventSchema.safeParse({
        name: form.name,
        participantIds: form.participantIds
          .split(/\s|,/)
          .map((id) => id.trim())
          .filter(Boolean)
      });
      if (!parsed.success) {
        throw new Error(parsed.error.issues[0]?.message ?? 'Dados inválidos');
      }
      const response = await api.post(
        '/admin/events',
        {
          name: parsed.data.name,
          participantIds: parsed.data.participantIds?.length ? parsed.data.participantIds : undefined
        },
        authHeaders
      );
      return response.data as { id: string };
    },
    onSuccess: () => {
      show('success', 'Evento criado e ativado com sucesso.');
      setForm({ name: '', participantIds: '' });
      void eventsQuery.refetch();
    },
    onError: (error) => {
      if (axios.isAxiosError(error) && error.response?.status === 401) {
        setIsAuthenticated(false);
      }
      show('error', extractErrorMessage(error));
    }
  });

  const cancelEventMutation = useMutation<void, unknown, string>({
    mutationFn: async (eventId) => {
      await api.post(`/admin/events/${eventId}/cancel`, null, authHeaders);
    },
    onSuccess: () => {
      show('success', 'Evento cancelado.');
      void eventsQuery.refetch();
    },
    onError: (error) => {
      if (axios.isAxiosError(error) && error.response?.status === 401) {
        setIsAuthenticated(false);
      }
      show('error', extractErrorMessage(error));
    }
  });

  const drawEventMutation = useMutation<DrawResult, unknown, string>({
    mutationFn: async (eventId) => {
      const response = await api.post(`/admin/events/${eventId}/draw`, null, authHeaders);
      return response.data as DrawResult;
    },
    onSuccess: (data) => {
      show('success', `Sorteio concluído. ${data.tickets} tickets emitidos.`);
      void eventsQuery.refetch();
    },
    onError: (error) => {
      if (axios.isAxiosError(error) && error.response?.status === 401) {
        setIsAuthenticated(false);
      }
      show('error', extractErrorMessage(error));
    }
  });

  const historyQuery = useQuery<EventHistory>({
    queryKey: ['event-history', selectedEvent, token],
    queryFn: async () => {
      const response = await api.get(`/admin/events/${selectedEvent}/history`, authHeaders);
      return response.data as EventHistory;
    },
    enabled: isAuthenticated && Boolean(selectedEvent),
    refetchOnWindowFocus: false
  });

  useEffect(() => {
    const error = eventsQuery.error;
    if (!error) {
      return;
    }
    if (axios.isAxiosError(error) && error.response?.status === 401) {
      setIsAuthenticated(false);
    }
    show('error', extractErrorMessage(error));
  }, [eventsQuery.error, show, setIsAuthenticated]);

  useEffect(() => {
    const error = participantsQuery.error;
    if (!error) {
      return;
    }
    if (axios.isAxiosError(error) && error.response?.status === 401) {
      setIsAuthenticated(false);
    }
    show('error', extractErrorMessage(error));
  }, [participantsQuery.error, show, setIsAuthenticated]);

  useEffect(() => {
    const error = participantDetailsQuery.error;
    if (!error) {
      return;
    }
    show('error', extractErrorMessage(error));
  }, [participantDetailsQuery.error, show]);

  useEffect(() => {
    const error = historyQuery.error;
    if (!error) {
      return;
    }
    show('error', extractErrorMessage(error));
  }, [historyQuery.error, show]);

  const participants: ParticipantSummary[] = participantsQuery.data ?? [];
  const events: EventSummary[] = eventsQuery.data ?? [];
  const history: EventHistory | undefined = historyQuery.data;
  const selectedParticipant: ParticipantDetail | null = participantDetailsQuery.data ?? null;

  return (
    <div className="container" style={{ padding: '48px 0' }}>
      <div className="shadow-card">
        <h2 style={{ marginTop: 0 }}>Painel administrativo</h2>
        <p style={{ color: '#475569' }}>
          Faça login com o token definido no backend, acompanhe os participantes confirmados e execute sorteios com segurança.
        </p>

        {notification && <Notification type={notification.type} message={notification.message} onClose={clear} />}

        <section style={{ marginBottom: '32px' }}>
          <h3>Autenticação</h3>
          <div className="form-grid two-columns">
            <div>
              <label htmlFor="adminToken">Token administrativo</label>
              <input
                id="adminToken"
                value={token}
                onChange={(event) => {
                  const value = event.target.value;
                  setToken(value);
                  setIsAuthenticated(false);
                  if (!value) {
                    setShouldRestoreSession(false);
                  }
                }}
                placeholder="Informe o token definido no backend"
              />
              <small style={{ color: isAuthenticated ? '#15803d' : '#f97316' }}>
                {isAuthenticated ? 'Sessão autenticada.' : 'Sessão não autenticada.'}
              </small>
            </div>
            <div>
              <label>&nbsp;</label>
              <button
                type="button"
                className="primary-button"
                onClick={handleLogin}
                disabled={loginMutation.isPending}
              >
                {loginMutation.isPending ? 'Validando...' : 'Entrar'}
              </button>
            </div>
          </div>
        </section>

        {isAuthenticated ? (
          <>
            <section style={{ marginBottom: '32px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ margin: 0 }}>Participantes confirmados</h3>
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => {
                    void participantsQuery.refetch();
                  }}
                  disabled={participantsQuery.isFetching}
                >
                  {participantsQuery.isFetching ? 'Atualizando...' : 'Atualizar'}
                </button>
              </div>
              {participantsQuery.isLoading ? (
                <p>Carregando participantes...</p>
              ) : participants.length > 0 ? (
                <table className="table" style={{ marginTop: '16px' }}>
                  <thead>
                    <tr>
                      <th>Nome</th>
                      <th>Apelido</th>
                      <th>Tipo</th>
                      <th>Presença</th>
                      <th>Itens</th>
                      <th>Inscrito em</th>
                      <th>Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {participants.map((participant: ParticipantSummary) => (
                      <tr key={participant.id}>
                        <td>
                          {participant.firstName} {participant.secondName}
                        </td>
                        <td>{participant.nickname ?? '—'}</td>
                        <td style={{ textTransform: 'capitalize' }}>{participant.isChild ? 'Criança' : 'Adulto'}</td>
                        <td>{participant.attendingInPerson ? 'Presencial' : 'Remoto/indefinido'}</td>
                        <td>{participant.giftCount}</td>
                        <td>{new Date(participant.createdAt).toLocaleDateString()}</td>
                        <td>
                          <div style={{ display: 'flex', gap: '8px' }}>
                            <button
                              type="button"
                              className="secondary-button"
                              onClick={() => setSelectedParticipantId(participant.id)}
                            >
                              Ver detalhes
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <p>Nenhum participante confirmado até o momento.</p>
              )}
            </section>

            {selectedParticipantId && (
              <section style={{ marginBottom: '32px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h3 style={{ margin: 0 }}>Detalhes do participante</h3>
                  <button
                    type="button"
                    className="secondary-button"
                    onClick={() => setSelectedParticipantId(null)}
                  >
                    Fechar
                  </button>
                </div>
                {participantDetailsQuery.isLoading ? (
                  <p>Carregando informações...</p>
                ) : selectedParticipant ? (
                  <div className="shadow-card" style={{ marginTop: '16px', background: '#f8fafc' }}>
                    <p style={{ marginTop: 0 }}>
                      <strong>{selectedParticipant.firstName} {selectedParticipant.secondName}</strong>
                      {selectedParticipant.nickname ? ` (${selectedParticipant.nickname})` : ''}
                    </p>
                    <p style={{ color: '#475569' }}>
                      Tipo: {selectedParticipant.isChild ? 'Criança' : 'Adulto'} · Presença:{' '}
                      {selectedParticipant.attendingInPerson ? 'Confirmada no encontro presencial' : 'Remota ou indefinida'}
                    </p>
                    {selectedParticipant.primaryGuardianEmail && (
                      <p style={{ color: '#475569' }}>
                        Responsável principal: {selectedParticipant.primaryGuardianEmail}
                      </p>
                    )}
                    {selectedParticipant.guardianEmails.length > 0 && (
                      <p style={{ color: '#475569' }}>
                        Outros e-mails notificados: {selectedParticipant.guardianEmails.join(', ')}
                      </p>
                    )}

                    <h4>Lista de presentes ({selectedParticipant.gifts.length})</h4>
                    {selectedParticipant.gifts.length === 0 ? (
                      <p>Este participante ainda não cadastrou preferências.</p>
                    ) : (
                      <ul>
                        {selectedParticipant.gifts.map((gift: GiftItem, index: number) => (
                          <li key={`${gift.name}-${index}`} style={{ marginBottom: '8px' }}>
                            <strong>{gift.name}</strong>
                            {gift.priority ? ` · prioridade ${gift.priority}` : ''}
                            {gift.description ? ` — ${gift.description}` : ''}
                            {gift.url ? (
                              <>
                                {' '}
                                <a href={gift.url} target="_blank" rel="noreferrer">
                                  Link
                                </a>
                              </>
                            ) : null}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                ) : (
                  <p>Não foi possível carregar os detalhes deste participante.</p>
                )}
              </section>
            )}

            <section style={{ marginBottom: '32px' }}>
              <h3>Novo evento</h3>
              <div className="form-grid">
                <div>
                  <label htmlFor="eventName">Nome do evento</label>
                  <input
                    id="eventName"
                    value={form.name}
                    onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
                    placeholder="Ex.: Amigo Ocuto 2025"
                  />
                </div>
                <div>
                  <label htmlFor="participantIds">IDs de participantes (opcional)</label>
                  <textarea
                    id="participantIds"
                    value={form.participantIds}
                    onChange={(event) => setForm((prev) => ({ ...prev, participantIds: event.target.value }))}
                    placeholder="Cole IDs separados por vírgula ou espaço para restringir o sorteio"
                    rows={3}
                  />
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <button
                    type="button"
                    className="primary-button"
                    onClick={() => createEventMutation.mutate()}
                    disabled={createEventMutation.isPending}
                  >
                    {createEventMutation.isPending ? 'Criando...' : 'Criar evento'}
                  </button>
                </div>
              </div>
            </section>

            <section>
              <h3>Eventos cadastrados</h3>
              {eventsQuery.isLoading ? (
                <p>Carregando eventos...</p>
              ) : events.length > 0 ? (
                <table className="table">
                  <thead>
                    <tr>
                      <th>Nome</th>
                      <th>Status</th>
                      <th>Participantes</th>
                      <th>Sorteios</th>
                      <th>Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {events.map((event: EventSummary) => (
                      <tr key={event.id}>
                        <td>{event.name}</td>
                        <td style={{ textTransform: 'capitalize' }}>{event.status}</td>
                        <td>{event.participantes}</td>
                        <td>{event.sorteios}</td>
                        <td style={{ display: 'flex', gap: '8px' }}>
                          <button
                            type="button"
                            className="secondary-button"
                            onClick={() => setSelectedEvent(event.id)}
                          >
                            Histórico
                          </button>
                          <button
                            type="button"
                            className="primary-button"
                            onClick={() => drawEventMutation.mutate(event.id)}
                            disabled={drawEventMutation.isPending}
                          >
                            Sortear
                          </button>
                          <button
                            type="button"
                            className="secondary-button"
                            onClick={() => cancelEventMutation.mutate(event.id)}
                            disabled={cancelEventMutation.isPending}
                          >
                            Cancelar
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <p>Nenhum evento encontrado.</p>
              )}
            </section>

            {selectedEvent && history && (
              <section style={{ marginTop: '32px' }}>
                <h3>Histórico do evento</h3>
                <p>
                  <strong>{history.name}</strong> — status atual: <strong>{history.status}</strong>
                </p>
                <ul>
                  {history.sorteios.map((entry: EventHistory['sorteios'][number], index: number) => (
                    <li key={index}>
                      {new Date(entry.drawnAt).toLocaleString()} · {entry.participantes} tickets emitidos
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </>
        ) : (
          <div className="alert info">Informe o token administrativo e clique em “Entrar” para acessar os recursos.</div>
        )}
      </div>
    </div>
  );
};

export default AdminPage;
