import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
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
  dangerButtonClass,
  ghostButtonClass
} from '../styles/theme';
import { formatDateToLocal } from '../utils/dateUtils';

// ... (type definitions remain the same)
type EventSummary = {
  id: string;
  name: string;
  location: string | null;
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
  fullName: string;
  email?: string;
  isChild: boolean;
  emailVerified: boolean;
  attendingInPerson?: boolean;
  primaryGuardianEmail?: string;
  contactEmails: string[];
  giftCount: number;
  createdAt: string;
};

type GiftItem = {
  id: string;
  name: string;
  url?: string;
  notes?: string;
  purchased: boolean;
};

type ParticipantDetail = {
  id: string;
  firstName: string;
  secondName: string;
  fullName: string;
  email?: string;
  isChild: boolean;
  emailVerified: boolean;
  attendingInPerson?: boolean;
  primaryGuardianEmail?: string;
  guardianEmails: string[];
  contactEmails: string[];
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
  const navigate = useNavigate();
  const [token, setToken] = useState<string | null>(localStorage.getItem(TOKEN_KEY));
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [selectedEvent] = useState<string | null>(null);
  const [selectedParticipantId, setSelectedParticipantId] = useState<string | null>(null);
  const [participantBeingDeleted, setParticipantBeingDeleted] = useState<string | null>(null);
  const [showMembersModal, setShowMembersModal] = useState<boolean>(false);
  const [selectedEventForMembers, setSelectedEventForMembers] = useState<string | null>(null);
  const [selectedParticipantsToAdd, setSelectedParticipantsToAdd] = useState<string[]>([]);
  const [drawingEventId, setDrawingEventId] = useState<string | null>(null);

  const authHeaders = useMemo(() => (token ? { Authorization: `Bearer ${token}` } : {}), [token]);
  const axiosAuthConfig = useMemo(() => ({ headers: authHeaders }), [authHeaders]);

  type AdminLoginResponse = { token: string; email: string; message?: string };

  const restoreSessionMutation = useMutation<AdminLoginResponse, Error, string>({
    mutationFn: async (tokenToVerify) => {
      const response = await api.post('/admin/login', { token: tokenToVerify });
      return response.data as AdminLoginResponse;
    },
    onSuccess: (data) => {
      setToken(data.token);
      setIsAuthenticated(true);
      show('success', 'Sessão administrativa restaurada.');
    },
    onError: () => {
      localStorage.removeItem(TOKEN_KEY);
      setToken(null);
      setIsAuthenticated(false);
      show('error', 'Sessão expirada. Por favor, faça login novamente.');
      navigate('/adm');
    }
  });

  useEffect(() => {
    if (token && !isAuthenticated) {
      restoreSessionMutation.mutate(token);
    } else if (!token) {
      navigate('/adm');
    }
  }, [token, isAuthenticated, navigate, restoreSessionMutation]);

  const handleLogout = useCallback((): void => {
    localStorage.removeItem(TOKEN_KEY);
    setToken(null);
    setIsAuthenticated(false);
    show('info', 'Sessão administrativa encerrada.');
    navigate('/adm');
  }, [show, navigate]);
  
  const clearSessionSilently = useCallback((): void => {
    localStorage.removeItem(TOKEN_KEY);
    setToken(null);
    setIsAuthenticated(false);
    navigate('/adm');
  }, [navigate]);

  // ... (all queries and mutations remain the same, but will now correctly use the auth state)
  const eventsQuery = useQuery<EventSummary[]>({
    queryKey: ['admin-events', token],
    queryFn: async () => {
      const response = await api.get('/admin/events', axiosAuthConfig);
      return response.data as EventSummary[];
    },
    enabled: isAuthenticated,
    staleTime: 1000 * 30,
    refetchOnWindowFocus: false
  });

  const participantsQuery = useQuery<ParticipantSummary[]>({
    queryKey: ['admin-participants', token],
    queryFn: async () => {
      const response = await api.get('/admin/participants', axiosAuthConfig);
      return response.data as ParticipantSummary[];
    },
    enabled: isAuthenticated,
    staleTime: 1000 * 30,
    refetchOnWindowFocus: false
  });

  const participantDetailsQuery = useQuery<ParticipantDetail>({
    queryKey: ['admin-participant-detail', selectedParticipantId, token],
    queryFn: async () => {
      const response = await api.get(`/admin/participants/${selectedParticipantId}`, axiosAuthConfig);
      return response.data as ParticipantDetail;
    },
    enabled: isAuthenticated && Boolean(selectedParticipantId),
    refetchOnWindowFocus: false
  });

  const deleteParticipantMutation = useMutation<{ message: string }, unknown, { participantId: string; participantName: string }>
  ({
    mutationFn: async ({ participantId }) => {
      const response = await api.delete(`/admin/participants/${participantId}`, axiosAuthConfig);
      return response.data as { message: string };
    },
    onSuccess: (_data, variables) => {
      show('success', `Participante "${variables.participantName}" removido.`);
      if (selectedParticipantId === variables.participantId) {
        setSelectedParticipantId(null);
      }
      void participantsQuery.refetch();
    },
    onError: (error) => {
      if (axios.isAxiosError(error) && error.response?.status === 401) {
        clearSessionSilently();
        return;
      }
      show('error', extractErrorMessage(error));
    },
    onSettled: () => {
      setParticipantBeingDeleted(null);
    }
  });

  const drawEventMutation = useMutation<DrawResult, unknown, string>({
    mutationFn: async (eventId) => {
      setDrawingEventId(eventId);
      const response = await api.post(`/admin/events/${eventId}/draw`, null, axiosAuthConfig);
      return response.data as DrawResult;
    },
    onSuccess: (data) => {
      show('success', `Sorteio concluído. ${data.tickets} tickets emitidos.`);
      void eventsQuery.refetch();
      setDrawingEventId(null);
    },
    onError: (error) => {
      if (axios.isAxiosError(error) && error.response?.status === 401) {
        clearSessionSilently();
      }
      show('error', extractErrorMessage(error));
      setDrawingEventId(null);
    }
  });

  const cancelEventMutation = useMutation<EventSummary, unknown, string>({
    mutationFn: async (eventId) => {
      const response = await api.post(`/admin/events/${eventId}/cancel`, null, axiosAuthConfig);
      return response.data as EventSummary;
    },
    onSuccess: (data) => {
      show('success', `Evento "${data.name}" foi cancelado.`);
      void eventsQuery.refetch();
    },
    onError: (error) => {
      if (axios.isAxiosError(error) && error.response?.status === 401) {
        clearSessionSilently();
      }
      show('error', extractErrorMessage(error));
    }
  });

  const deleteEventMutation = useMutation<{ message: string }, unknown, string>({
    mutationFn: async (eventId) => {
      const response = await api.delete(`/admin/events/${eventId}`, axiosAuthConfig);
      return response.data as { message: string };
    },
    onSuccess: () => {
      show('success', `Evento deletado com sucesso.`);
      void eventsQuery.refetch();
    },
    onError: (error) => {
      if (axios.isAxiosError(error) && error.response?.status === 401) {
        clearSessionSilently();
      }
      show('error', extractErrorMessage(error));
    }
  });

  const addParticipantToEventMutation = useMutation<{ message: string }, unknown, { eventId: string; participantId: string }>({
    mutationFn: async ({ eventId, participantId }) => {
      const response = await api.post(`/admin/events/${eventId}/participants/${participantId}`, null, axiosAuthConfig);
      return response.data as { message: string };
    },
    onSuccess: () => {
      void eventsQuery.refetch();
    },
    onError: (error) => {
      if (axios.isAxiosError(error) && error.response?.status === 401) {
        clearSessionSilently();
      }
      show('error', extractErrorMessage(error));
    }
  });

  const testEmailMutation = useMutation<TestEmailResult>({
    mutationFn: async () => {
      const response = await api.post('/admin/emails/test', null, axiosAuthConfig);
      return response.data as TestEmailResult;
    },
    onSuccess: (data) => {
      const detail = `${data.participants} participante(s), ${data.recipients} destinatário(s).`;
      show('success', `${data.message} ${detail}`);
    },
    onError: (error) => {
      if (axios.isAxiosError(error) && error.response?.status === 401) {
        clearSessionSilently();
      }
      show('error', extractErrorMessage(error));
    }
  });

  const resetDatabaseMutation = useMutation<{ message: string }>({
    mutationFn: async () => {
      const response = await api.delete('/admin/database', axiosAuthConfig);
      return response.data as { message: string };
    },
    onSuccess: (data) => {
      show('success', data.message);
      void participantsQuery.refetch();
      void eventsQuery.refetch();
    },
    onError: (error) => {
      if (axios.isAxiosError(error) && error.response?.status === 401) {
        clearSessionSilently();
      }
      show('error', extractErrorMessage(error));
    }
  });

  const exportParticipantsMutation = useMutation<Blob>({
    mutationFn: async () => {
      const response = await api.get('/admin/participants/export', {
        ...axiosAuthConfig,
        responseType: 'blob'
      });
      return response.data as Blob;
    },
    onSuccess: (data) => {
      const url = window.URL.createObjectURL(data);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'participantes.csv');
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      show('success', 'Arquivo CSV exportado com sucesso.');
    },
    onError: (error) => {
      if (axios.isAxiosError(error) && error.response?.status === 401) {
        clearSessionSilently();
      }
      show('error', extractErrorMessage(error));
    }
  });

  const importParticipantsMutation = useMutation<{ imported: number; errors: string[]; message: string }, unknown, string>({
    mutationFn: async (csvData) => {
      const response = await api.post('/admin/participants/import', { csvData }, axiosAuthConfig);
      return response.data as { imported: number; errors: string[]; message: string };
    },
    onSuccess: (data) => {
      show('success', data.message);
      if (data.errors.length > 0) {
        show('info', `Erros encontrados: ${data.errors.join('; ')}`);
      }
      void participantsQuery.refetch();
    },
    onError: (error) => {
      if (axios.isAxiosError(error) && error.response?.status === 401) {
        clearSessionSilently();
      }
      show('error', extractErrorMessage(error));
    }
  });

  const createEventMutation = useMutation<EventSummary, unknown, { name: string; location?: string | null; drawDateTime?: string; moderatorEmail?: string }>({
    mutationFn: async (newEvent) => {
      const response = await api.post('/admin/events', newEvent, axiosAuthConfig);
      return response.data as EventSummary;
    },
    onSuccess: (data) => {
      show('success', `Evento "${data.name}" criado com sucesso.`);
      void eventsQuery.refetch();
    },
    onError: (error) => {
      if (axios.isAxiosError(error) && error.response?.status === 401) {
        clearSessionSilently();
      }
      show('error', extractErrorMessage(error));
    }
  });

  const historyQuery = useQuery<EventHistory>({
    queryKey: ['event-history', selectedEvent, token],
    queryFn: async () => {
      const response = await api.get(`/admin/events/${selectedEvent}/history`, axiosAuthConfig);
      return response.data as EventHistory;
    },
    enabled: isAuthenticated && Boolean(selectedEvent),
    refetchOnWindowFocus: false
  });

  const giftListWarningMutation = useMutation<{ message: string; participants: number; recipients: number }, unknown, string>({
    mutationFn: async (eventId) => {
      const response = await api.post(`/admin/events/${eventId}/emails/gift-list-warning`, null, axiosAuthConfig);
      return response.data as { message: string; participants: number; recipients: number };
    },
    onSuccess: (data) => {
      show('success', `${data.message} ${data.participants} participante(s), ${data.recipients} destinatário(s).`);
    },
    onError: (error) => {
      if (axios.isAxiosError(error) && error.response?.status === 401) {
        clearSessionSilently();
      }
      show('error', extractErrorMessage(error));
    }
  });



  useEffect(() => {
    if (!eventsQuery.error) {
      return;
    }
    if (axios.isAxiosError(eventsQuery.error) && eventsQuery.error.response?.status === 401) {
      clearSessionSilently();
    }
    show('error', extractErrorMessage(eventsQuery.error));
  }, [eventsQuery.error, show, clearSessionSilently]);

  useEffect(() => {
    if (!participantsQuery.error) {
      return;
    }
    if (axios.isAxiosError(participantsQuery.error) && participantsQuery.error.response?.status === 401) {
      clearSessionSilently();
    }
    show('error', extractErrorMessage(participantsQuery.error));
  }, [participantsQuery.error, show, clearSessionSilently]);

  useEffect(() => {
    if (!participantDetailsQuery.error) {
      return;
    }
    if (axios.isAxiosError(participantDetailsQuery.error) && participantDetailsQuery.error.response?.status === 401) {
      clearSessionSilently();
      return;
    }
    show('error', extractErrorMessage(participantDetailsQuery.error));
  }, [participantDetailsQuery.error, show, clearSessionSilently]);

  useEffect(() => {
    if (!historyQuery.error) {
      return;
    }
    if (axios.isAxiosError(historyQuery.error) && historyQuery.error.response?.status === 401) {
      clearSessionSilently();
    }
    show('error', extractErrorMessage(historyQuery.error));
  }, [historyQuery.error, show, clearSessionSilently]);

  const participants = useMemo(() => participantsQuery.data ?? [], [participantsQuery.data]);
  const events: EventSummary[] = eventsQuery.data ?? [];
  const history: EventHistory | undefined = historyQuery.data;
  const selectedParticipant: ParticipantDetail | null = participantDetailsQuery.data ?? null;

  const participantStats = useMemo(() => {
    const total = participants.length;
    const verified = participants.reduce((sum, participant) => {
      if (!participant.emailVerified) return sum;
      return sum + participant.contactEmails.length;
    }, 0);
    const totalEmails = participants.reduce((sum, participant) => sum + participant.contactEmails.length, 0);
    const attendingInPerson = participants.filter((participant) => participant.attendingInPerson).length;
    return { total, verified, totalEmails, attendingInPerson };
  }, [participants]);

  const handleDeleteParticipant = useCallback((participant: ParticipantSummary): void => {
    const confirmation = window.confirm(
      `Tem certeza que deseja remover "${participant.fullName}" da lista de participantes confirmados?`
    );
    if (!confirmation) {
      return;
    }
    setParticipantBeingDeleted(participant.id);
    deleteParticipantMutation.mutate({ participantId: participant.id, participantName: participant.fullName });
  }, [deleteParticipantMutation]);

  const handleCreateEvent = useCallback((e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const name = (formData.get('eventName') as string | null) ?? '';
    const location = (formData.get('eventLocation') as string | null) ?? '';
    const drawDateTime = (formData.get('drawDateTime') as string | null) ?? '';
    const moderatorEmail = (formData.get('moderatorEmail') as string | null) ?? '';
    const normalizedName = name.trim();
    const normalizedLocation = location.trim();
    const normalizedDrawDateTime = drawDateTime.trim();
    const normalizedModeratorEmail = moderatorEmail.trim();

    createEventMutation.mutate({
      name: normalizedName,
      location: normalizedLocation.length > 0 ? normalizedLocation : undefined,
      drawDateTime: normalizedDrawDateTime.length > 0 ? new Date(normalizedDrawDateTime).toISOString() : undefined,
      moderatorEmail: normalizedModeratorEmail.length > 0 ? normalizedModeratorEmail : undefined,
    });
  }, [createEventMutation]);

  const getDrawButtonState = (event: EventSummary): { disabled: boolean; reason?: string } => {
    if (event.status !== 'ativo') {
      return { disabled: true, reason: 'Sorteios só podem ser feitos em eventos ativos.' };
    }
    if (event.participantes < 2) {
      return { disabled: true, reason: 'É necessário ter pelo menos duas pessoas confirmadas.' };
    }
    return { disabled: false };
  };


  if (!isAuthenticated) {
    return (
      <FestiveCard title="Acesso restrito" eyebrow="🚫">
        <div className="text-center text-white/80">
          <p>Verificando autenticação...</p>
        </div>
      </FestiveCard>
    );
  }

  return (
    <FestiveCard
      title="Painel Administrativo"
      eyebrow="🛠️ Organização do Amigo Oculto"
      description={
        <div className="flex justify-between items-center">
          <p>
            Bem-vindo! Use as ferramentas abaixo para gerenciar o evento.
          </p>
          <button type="button" className={ghostButtonClass} onClick={handleLogout}>
            Sair
          </button>
        </div>
      }
      maxWidth="max-w-6xl"
    >
      {notification && <Notification type={notification.type} message={notification.message} onClose={clear} />}

      {/* The rest of the admin page UI remains here */}
      <>
          <section className="space-y-4">
            <div className="flex flex-col gap-3 rounded-2xl border border-white/20 bg-black/20 p-6 text-white/85 text-sm md:flex-row md:items-center md:justify-between">
              <div>
                <h3 className="text-lg font-semibold text-white">Ferramentas de disparo</h3>
                <p className="text-white/70">
                  Envie um e-mail de teste para todos os participantes confirmados e responsáveis cadastrados.
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  className={secondaryButtonClass}
                  onClick={() => testEmailMutation.mutate()}
                  disabled={testEmailMutation.isPending}
                >
                  {testEmailMutation.isPending ? 'Enviando teste...' : 'Disparar e-mail de teste'}
                </button>
                <button
                  type="button"
                  className={secondaryButtonClass}
                  onClick={() => exportParticipantsMutation.mutate()}
                  disabled={exportParticipantsMutation.isPending}
                >
                  {exportParticipantsMutation.isPending ? 'Exportando...' : 'Exportar participantes'}
                </button>
                <label className={secondaryButtonClass + ' cursor-pointer'}>
                  <input
                    type="file"
                    accept=".csv"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        const reader = new FileReader();
                        reader.onload = (event) => {
                          const csvData = event.target?.result as string;
                          importParticipantsMutation.mutate(csvData);
                        };
                        reader.readAsText(file);
                      }
                    }}
                    disabled={importParticipantsMutation.isPending}
                  />
                  {importParticipantsMutation.isPending ? 'Importando...' : 'Importar participantes'}
                </label>
                <button
                  type="button"
                  className={dangerButtonClass}
                  onClick={() => {
                    const confirmed = window.confirm(
                      'ATENÇÃO: Esta ação irá deletar TODOS os dados do banco de dados (participantes, eventos, listas de presentes, etc.). Esta ação é irreversível. Tem certeza que deseja continuar?'
                    );
                    if (confirmed) {
                      const secondConfirm = window.confirm(
                        'Confirmação final: Todos os dados serão perdidos permanentemente. Clique em "OK" para prosseguir.'
                      );
                      if (secondConfirm) {
                        resetDatabaseMutation.mutate();
                      }
                    }
                  }}
                  disabled={resetDatabaseMutation.isPending}
                >
                  {resetDatabaseMutation.isPending ? 'Resetando...' : 'Resetar banco de dados'}
                </button>
              </div>
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
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-2xl border border-white/15 bg-black/20 p-4 text-white/80">
                <p className="text-xs uppercase tracking-[0.25em] text-white/50">Participantes</p>
                <p className="mt-2 text-3xl font-semibold text-white">{participantStats.total}</p>
                <p className="text-xs text-white/60">Com inscrição confirmada</p>
              </div>
              <div className="rounded-2xl border border-white/15 bg-black/20 p-4 text-white/80">
                <p className="text-xs uppercase tracking-[0.25em] text-white/50">E-mails cadastrados</p>
                <p className="mt-2 text-3xl font-semibold text-white">{participantStats.totalEmails}</p>
                <p className="text-xs text-white/60">Soma de todos os contatos</p>
              </div>
              <div className="rounded-2xl border border-white/15 bg-black/20 p-4 text-white/80">
                <p className="text-xs uppercase tracking-[0.25em] text-white/50">Verificados</p>
                <p className="mt-2 text-3xl font-semibold text-white">{participantStats.verified}</p>
                <p className="text-xs text-white/60">Com e-mail validado</p>
              </div>
              <div className="rounded-2xl border border-white/15 bg-black/20 p-4 text-white/80">
                <p className="text-xs uppercase tracking-[0.25em] text-white/50">Presenciais</p>
                <p className="mt-2 text-3xl font-semibold text-white">{participantStats.attendingInPerson}</p>
                <p className="text-xs text-white/60">Confirmaram presença física</p>
              </div>
            </div>
            {participantsQuery.isLoading ? (
              <p className="text-white/80">Carregando participantes...</p>
            ) : participants.length > 0 ? (
              <div className="overflow-x-auto rounded-2xl border border-white/15 bg-black/20">
                <table className="min-w-full divide-y divide-white/15 text-left text-sm text-white/85">
                  <thead className="uppercase text-xs tracking-[0.25em] text-white/60">
                    <tr>
                      <th className="px-4 py-3">Nome</th>
                      <th className="px-4 py-3">Contatos</th>
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
                        <td className="px-4 py-3">{participantSummary.fullName}</td>
                        <td className="px-4 py-3">
                          {participantSummary.contactEmails.length === 0 ? (
                            '—'
                          ) : (
                            <div className="flex flex-col gap-1">
                              {participantSummary.contactEmails.map((contact) => (
                                <span key={`${participantSummary.id}-${contact}`} className="text-xs text-white/70">
                                  {contact}
                                </span>
                              ))}
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3 capitalize">{participantSummary.isChild ? 'Criança' : 'Adulto'}</td>
                        <td className="px-4 py-3">
                          {participantSummary.attendingInPerson ? 'Presencial' : 'Remoto/indefinido'}
                        </td>
                        <td className="px-4 py-3">{participantSummary.giftCount}</td>
                        <td className="px-4 py-3">
                          {formatDateToLocal(participantSummary.createdAt)}
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
                            <button
                              type="button"
                              className={dangerButtonClass}
                              onClick={() => handleDeleteParticipant(participantSummary)}
                              disabled={
                                deleteParticipantMutation.isPending &&
                                participantBeingDeleted === participantSummary.id
                              }
                            >
                              {deleteParticipantMutation.isPending &&
                              participantBeingDeleted === participantSummary.id
                                ? 'Removendo...'
                                : 'Remover'}
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
                      {selectedParticipant.fullName}
                    </p>
                    <p className="text-white/70">
                      Tipo: {selectedParticipant.isChild ? 'Criança' : 'Adulto'} · Presença:{' '}
                      {selectedParticipant.attendingInPerson ? 'Confirmada no encontro presencial' : 'Remota ou indefinida'}
                    </p>
                    {selectedParticipant.contactEmails.length > 0 && (
                      <p className="text-sm text-white/70">
                        Contatos notificados: {selectedParticipant.contactEmails.join(', ')}
                      </p>
                    )}
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
                          <li key={gift.id ?? `${gift.name}-${index}`} className="rounded-2xl bg-black/25 px-4 py-3">
                            <p className="font-semibold text-white">{gift.name}</p>
                            {gift.notes && <p className="text-sm text-white/70">{gift.notes}</p>}
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
            <h3 className="text-lg font-semibold text-white">Criar novo evento</h3>
            <form
              className="flex flex-col gap-3 rounded-2xl border border-white/20 bg-black/20 p-6 md:flex-row md:items-end"
              onSubmit={handleCreateEvent}
            >
              <div className="flex-grow">
                <label htmlFor="eventName" className={labelClass}>
                  Nome do evento
                </label>
                <input
                  type="text"
                  id="eventName"
                  name="eventName"
                  className={inputClass}
                  placeholder="Ex: Amigo Oculto da Família 2024"
                  required
                  minLength={4}
                />
              </div>
              <div className="flex-grow">
                <label htmlFor="eventLocation" className={labelClass}>
                  Local da festa (opcional)
                </label>
                <input
                  type="text"
                  id="eventLocation"
                  name="eventLocation"
                  className={inputClass}
                  placeholder="Ex: Salão de festas da Av. Central, 250"
                  minLength={4}
                />
                <p className="mt-1 text-xs text-white/60">
                  Essa informação aparece automaticamente no e-mail enviado após o sorteio.
                </p>
              </div>
              <div className="flex-grow">
                <label htmlFor="drawDateTime" className={labelClass}>
                  Data e hora do sorteio (opcional)
                </label>
                <input
                  type="datetime-local"
                  id="drawDateTime"
                  name="drawDateTime"
                  className={inputClass}
                  min={new Date().toISOString().slice(0, 16)}
                />
                <p className="mt-1 text-xs text-white/60">
                  Quando definido, o moderador receberá um lembrete automático na data escolhida.
                </p>
              </div>
              <div className="flex-grow">
                <label htmlFor="moderatorEmail" className={labelClass}>
                  E-mail do moderador (opcional)
                </label>
                <input
                  type="email"
                  id="moderatorEmail"
                  name="moderatorEmail"
                  className={inputClass}
                  placeholder="moderador@exemplo.com"
                />
                <p className="mt-1 text-xs text-white/60">
                  Necessário se uma data de sorteio for definida.
                </p>
              </div>
              <button type="submit" className={primaryButtonClass} disabled={createEventMutation.isPending}>
                {createEventMutation.isPending ? 'Criando...' : 'Criar evento'}
              </button>
            </form>
          </section>

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
                      <th className="px-4 py-3">Local</th>
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
                          <td className="px-4 py-3">{event.location ? event.location : 'Local a definir'}</td>
                          <td className="px-4 py-3 capitalize">{event.status}</td>
                          <td className="px-4 py-3">{event.participantes}</td>
                          <td className="px-4 py-3">{event.sorteios}</td>
                          <td className="px-4 py-3">
                            {event.status === 'cancelado' ? (
                              <button
                                type="button"
                                className={dangerButtonClass}
                                onClick={() => {
                                  if (window.confirm(`Tem certeza que deseja deletar o evento "${event.name}"? Esta ação não pode ser desfeita.`)) {
                                    deleteEventMutation.mutate(event.id);
                                  }
                                }}
                                disabled={deleteEventMutation.isPending}
                              >
                                {deleteEventMutation.isPending ? 'Deletando...' : 'Deletar'}
                              </button>
                            ) : (
                              <div className="flex flex-wrap gap-2">
                                <button
                                  type="button"
                                  className={secondaryButtonClass}
                                  onClick={() => giftListWarningMutation.mutate(event.id)}
                                  disabled={giftListWarningMutation.isPending}
                                >
                                  {giftListWarningMutation.isPending ? 'Enviando...' : 'Aviso lista presentes'}
                                </button>
                                <button
                                  type="button"
                                  className={`${primaryButtonClass} transition-opacity duration-300 ${drawState.disabled || drawingEventId === event.id ? 'opacity-50' : ''}`}
                                  onClick={() => drawEventMutation.mutate(event.id)}
                                  disabled={(drawingEventId === event.id) || drawState.disabled}
                                  title={drawState.reason ?? undefined}
                                >
                                  {drawingEventId === event.id ? 'Sorteando...' : 'Sortear'}
                                </button>
                                <button
                                  type="button"
                                  className={secondaryButtonClass}
                                  onClick={() => {
                                    setSelectedEventForMembers(event.id);
                                    setSelectedParticipantsToAdd([]);
                                    setShowMembersModal(true);
                                  }}
                                >
                                  Trazer membros
                                </button>
                                <button
                                  type="button"
                                  className={dangerButtonClass}
                                  onClick={() => {
                                    if (
                                      window.confirm(`Tem a certeza que quer cancelar o evento "${event.name}"?`)
                                    ) {
                                      cancelEventMutation.mutate(event.id);
                                    }
                                  }}
                                  disabled={cancelEventMutation.isPending}
                                >
                                  {cancelEventMutation.isPending ? 'Cancelando...' : 'Cancelar'}
                                </button>
                              </div>
                            )}
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
                    {formatDateToLocal(entry.drawnAt)} · {entry.participantes} ticket(s) emitido(s)
                  </li>
                ))}
              </ul>
            </section>
          )}

          {showMembersModal && selectedEventForMembers && (
            <section className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-white">Adicionar participantes ao evento</h3>
                <button
                  type="button"
                  className={ghostButtonClass}
                  onClick={() => {
                    setShowMembersModal(false);
                    setSelectedEventForMembers(null);
                    setSelectedParticipantsToAdd([]);
                  }}
                >
                  Fechar
                </button>
              </div>
              <p className="text-white/80">
                Evento: <strong>{events.find(e => e.id === selectedEventForMembers)?.name}</strong>
              </p>
              <p className="text-sm text-white/70">
                Selecione os participantes para adicionar ao evento.
              </p>
              {participantsQuery.isLoading ? (
                <p className="text-white/80">Carregando participantes...</p>
              ) : participants.length > 0 ? (
                <div className="space-y-2 max-h-96 overflow-y-auto rounded-2xl border border-white/15 bg-black/20 p-4">
                  {participants.map((participant) => (
                    <div key={participant.id} className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        id={`participant-${participant.id}`}
                        checked={selectedParticipantsToAdd.includes(participant.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedParticipantsToAdd((prev) => [...prev, participant.id]);
                          } else {
                            setSelectedParticipantsToAdd((prev) => prev.filter((id) => id !== participant.id));
                          }
                        }}
                        className="rounded border-white/20 bg-black/20 text-white focus:ring-white/50"
                      />
                      <label htmlFor={`participant-${participant.id}`} className="text-white/85 cursor-pointer">
                        {participant.fullName} ({participant.isChild ? 'Criança' : 'Adulto'})
                      </label>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-white/80">Nenhum participante disponível.</p>
              )}
              <div className="flex gap-2">
                <button
                  type="button"
                  className={secondaryButtonClass}
                  onClick={() => {
                    setShowMembersModal(false);
                    setSelectedEventForMembers(null);
                    setSelectedParticipantsToAdd([]);
                  }}
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  className={primaryButtonClass}
                  onClick={() => {
                    selectedParticipantsToAdd.forEach((participantId) => {
                      addParticipantToEventMutation.mutate({ eventId: selectedEventForMembers, participantId });
                    });
                    setShowMembersModal(false);
                    setSelectedEventForMembers(null);
                    setSelectedParticipantsToAdd([]);
                  }}
                  disabled={selectedParticipantsToAdd.length === 0 || addParticipantToEventMutation.isPending}
                >
                  {addParticipantToEventMutation.isPending ? 'Adicionando...' : 'Adicionar selecionados'}
                </button>
              </div>
            </section>
          )}
        </>
    </FestiveCard>
  );
};

export default AdminPage;
