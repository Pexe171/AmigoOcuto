import { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { useMutation, useQuery } from '@tanstack/react-query';
import FestiveCard from '../components/FestiveCard';
import { api, extractErrorMessage } from '../services/api';
import Notification from '../components/Notification';
import { useNotification } from '../hooks/useNotification';
import {
  inputClass,
  labelClass,
  primaryButtonClass,
  secondaryButtonClass,
  ghostButtonClass
} from '../styles/theme';

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

type TestEmailResult = {
  participants: number;
  recipients: number;
  message: string;
};

const TOKEN_KEY = 'amigoocuto.adminToken';

const AdminPage: React.FC = () => {
  const { notification, show, clear } = useNotification();
  const [token, setToken] = useState<string>(() => localStorage.getItem(TOKEN_KEY) ?? '');
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [shouldRestoreSession, setShouldRestoreSession] = useState<boolean>(() => Boolean(localStorage.getItem(TOKEN_KEY)));
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

  const testEmailMutation = useMutation<TestEmailResult>({
    mutationFn: async () => {
      const response = await api.post('/admin/emails/test', null, authHeaders);
      return response.data as TestEmailResult;
    },
    onSuccess: (data) => {
      const detail = `${data.participants} participante(s), ${data.recipients} destinatário(s).`;
      show('success', `${data.message} ${detail}`);
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

  const getDrawButtonState = (event: EventSummary): { disabled: boolean; reason?: string } => {
    if (event.status !== 'ativo') {
      return { disabled: true, reason: 'Sorteios só podem ser feitos em eventos ativos.' };
    }
    if (event.participantes < 2) {
      return { disabled: true, reason: 'É necessário ter pelo menos duas pessoas confirmadas.' };
    }
    if (event.participantes % 2 !== 0) {
      return { disabled: true, reason: 'Confirme um número par de participantes antes de sortear.' };
    }
    return { disabled: false };
  };

  return (
    <FestiveCard
      title="Painel administrativo"
      eyebrow="🛠️ Organização do Amigo Ocuto"
      description={
        <>
          <p>
            Utilize o token administrativo para consultar participantes confirmados, acompanhar eventos e disparar sorteios com
            segurança.
          </p>
          <p className="text-sm text-white/70">
            Acesse também as ferramentas de teste para validar o envio de e-mails antes do grande dia.
          </p>
        </>
      }
      maxWidth="max-w-6xl"
    >
      {notification && <Notification type={notification.type} message={notification.message} onClose={clear} />}

      <section className="space-y-4">
        <h3 className="text-lg font-semibold text-white">Autenticação</h3>
        <div className="grid gap-4 md:grid-cols-[minmax(0,2fr)_auto] md:items-end">
          <div className="space-y-2">
            <label htmlFor="adminToken" className={labelClass}>
              Token administrativo
            </label>
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
              className={inputClass}
              placeholder="Informe o token definido no backend"
            />
            <small className="block text-sm text-white/70">
              Status: <span className="font-semibold text-white">{isAuthenticated ? 'Sessão autenticada' : 'Sessão não autenticada'}</span>
            </small>
          </div>
          <button
            type="button"
            className={primaryButtonClass}
            onClick={handleLogin}
            disabled={loginMutation.isPending}
          >
            {loginMutation.isPending ? 'Validando...' : 'Entrar'}
          </button>
        </div>
      </section>

      {isAuthenticated ? (
        <>
          <section className="space-y-4">
            <div className="flex flex-col gap-3 rounded-2xl border border-white/20 bg-black/20 p-6 text-white/85 text-sm md:flex-row md:items-center md:justify-between">
              <div>
                <h3 className="text-lg font-semibold text-white">Ferramentas de disparo</h3>
                <p className="text-white/70">
                  Envie um e-mail de teste para todos os participantes confirmados e responsáveis cadastrados.
                </p>
              </div>
              <button
                type="button"
                className={secondaryButtonClass}
                onClick={() => testEmailMutation.mutate()}
                disabled={testEmailMutation.isPending}
              >
                {testEmailMutation.isPending ? 'Enviando teste...' : 'Disparar e-mail de teste'}
              </button>
            </div>
          </section>

          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-white">Participantes confirmados</h3>
              <button
                type="button"
                className={ghostButtonClass}
                onClick={() => {
                  void participantsQuery.refetch();
                }}
                disabled={participantsQuery.isFetching}
              >
                {participantsQuery.isFetching ? 'Atualizando...' : 'Atualizar'}
              </button>
            </div>
            {participantsQuery.isLoading ? (
              <p className="text-white/80">Carregando participantes...</p>
            ) : participants.length > 0 ? (
              <div className="overflow-x-auto rounded-2xl border border-white/15 bg-black/20">
                <table className="min-w-full divide-y divide-white/15 text-left text-sm text-white/85">
                  <thead className="uppercase text-xs tracking-[0.25em] text-white/60">
                    <tr>
                      <th className="px-4 py-3">Nome</th>
                      <th className="px-4 py-3">Apelido</th>
                      <th className="px-4 py-3">Tipo</th>
                      <th className="px-4 py-3">Presença</th>
                      <th className="px-4 py-3">Itens</th>
                      <th className="px-4 py-3">Inscrito em</th>
                      <th className="px-4 py-3">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/10">
                    {participants.map((participantSummary) => (
                      <tr key={participantSummary.id}>
                        <td className="px-4 py-3">
                          {participantSummary.firstName} {participantSummary.secondName}
                        </td>
                        <td className="px-4 py-3">{participantSummary.nickname ?? '—'}</td>
                        <td className="px-4 py-3 capitalize">{participantSummary.isChild ? 'Criança' : 'Adulto'}</td>
                        <td className="px-4 py-3">
                          {participantSummary.attendingInPerson ? 'Presencial' : 'Remoto/indefinido'}
                        </td>
                        <td className="px-4 py-3">{participantSummary.giftCount}</td>
                        <td className="px-4 py-3">
                          {new Date(participantSummary.createdAt).toLocaleDateString()}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex gap-2">
                            <button
                              type="button"
                              className={secondaryButtonClass}
                              onClick={() => setSelectedParticipantId(participantSummary.id)}
                            >
                              Ver detalhes
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-white/80">Nenhum participante confirmado até o momento.</p>
            )}
          </section>

          {selectedParticipantId && (
            <section className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-white">Detalhes do participante</h3>
                <button
                  type="button"
                  className={ghostButtonClass}
                  onClick={() => setSelectedParticipantId(null)}
                >
                  Fechar
                </button>
              </div>
              {participantDetailsQuery.isLoading ? (
                <p className="text-white/80">Carregando informações...</p>
              ) : selectedParticipant ? (
                <div className="space-y-4 rounded-2xl border border-white/20 bg-black/20 p-6 text-white/85">
                  <div>
                    <p className="text-xl font-semibold text-white">
                      {selectedParticipant.firstName} {selectedParticipant.secondName}
                      {selectedParticipant.nickname ? ` (${selectedParticipant.nickname})` : ''}
                    </p>
                    <p className="text-white/70">
                      Tipo: {selectedParticipant.isChild ? 'Criança' : 'Adulto'} · Presença:{' '}
                      {selectedParticipant.attendingInPerson ? 'Confirmada no encontro presencial' : 'Remota ou indefinida'}
                    </p>
                    {selectedParticipant.primaryGuardianEmail && (
                      <p className="text-sm text-white/70">
                        Responsável principal: {selectedParticipant.primaryGuardianEmail}
                      </p>
                    )}
                    {selectedParticipant.guardianEmails.length > 0 && (
                      <p className="text-sm text-white/70">
                        Outros e-mails notificados: {selectedParticipant.guardianEmails.join(', ')}
                      </p>
                    )}
                  </div>

                  <div>
                    <h4 className="text-lg font-semibold text-white">Lista de presentes ({selectedParticipant.gifts.length})</h4>
                    {selectedParticipant.gifts.length === 0 ? (
                      <p className="text-white/80">Este participante ainda não cadastrou preferências.</p>
                    ) : (
                      <ul className="mt-3 space-y-3">
                        {selectedParticipant.gifts.map((gift, index) => (
                          <li key={`${gift.name}-${index}`} className="rounded-2xl bg-black/25 px-4 py-3">
                            <p className="font-semibold text-white">
                              {gift.name}
                              {gift.priority ? ` · prioridade ${gift.priority}` : ''}
                            </p>
                            {gift.description && <p className="text-sm text-white/70">{gift.description}</p>}
                            {gift.url && (
                              <a
                                href={gift.url}
                                target="_blank"
                                rel="noreferrer"
                                className="text-sm text-emerald-200 underline underline-offset-4"
                              >
                                Link
                              </a>
                            )}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              ) : (
                <p className="text-white/80">Não foi possível carregar os detalhes deste participante.</p>
              )}
            </section>
          )}

          <section className="space-y-4">
            <h3 className="text-lg font-semibold text-white">Eventos cadastrados</h3>
            <p className="text-sm text-white/70">
              Os eventos são exibidos apenas para consulta. Utilize o botão “Sortear” quando todos os participantes estiverem
              confirmados e em número par.
            </p>
            {eventsQuery.isLoading ? (
              <p className="text-white/80">Carregando eventos...</p>
            ) : events.length > 0 ? (
              <div className="overflow-x-auto rounded-2xl border border-white/15 bg-black/20">
                <table className="min-w-full divide-y divide-white/15 text-left text-sm text-white/85">
                  <thead className="uppercase text-xs tracking-[0.25em] text-white/60">
                    <tr>
                      <th className="px-4 py-3">Nome</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3">Participantes</th>
                      <th className="px-4 py-3">Sorteios</th>
                      <th className="px-4 py-3">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/10">
                    {events.map((event) => {
                      const drawState = getDrawButtonState(event);
                      return (
                        <tr key={event.id}>
                          <td className="px-4 py-3">{event.name}</td>
                          <td className="px-4 py-3 capitalize">{event.status}</td>
                          <td className="px-4 py-3">{event.participantes}</td>
                          <td className="px-4 py-3">{event.sorteios}</td>
                          <td className="px-4 py-3">
                            <div className="flex flex-wrap gap-2">
                              <button
                                type="button"
                                className={secondaryButtonClass}
                                onClick={() => setSelectedEvent(event.id)}
                              >
                                Histórico
                              </button>
                              <button
                                type="button"
                                className={primaryButtonClass}
                                onClick={() => drawEventMutation.mutate(event.id)}
                                disabled={drawEventMutation.isPending || drawState.disabled}
                                title={drawState.reason ?? undefined}
                              >
                                {drawEventMutation.isPending ? 'Sorteando...' : 'Sortear'}
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-white/80">Nenhum evento encontrado.</p>
            )}
          </section>

          {selectedEvent && history && (
            <section className="space-y-3">
              <h3 className="text-lg font-semibold text-white">Histórico do evento</h3>
              <p className="text-white/80">
                <strong>{history.name}</strong> — status atual: <strong>{history.status}</strong>
              </p>
              <ul className="space-y-2 text-white/80">
                {history.sorteios.map((entry, index) => (
                  <li key={index} className="rounded-2xl bg-black/20 px-4 py-2">
                    {new Date(entry.drawnAt).toLocaleString()} · {entry.participantes} ticket(s) emitido(s)
                  </li>
                ))}
              </ul>
            </section>
          )}
        </>
      ) : (
        <div className="rounded-2xl border border-white/20 bg-black/20 p-6 text-white/80">
          Informe o token administrativo e clique em “Entrar” para acessar os recursos.
        </div>
      )}
    </FestiveCard>
  );
};

export default AdminPage;
