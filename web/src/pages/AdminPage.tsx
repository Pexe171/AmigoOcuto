import { useEffect, useMemo, useState } from 'react';
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

const TOKEN_KEY = 'megacuto.adminToken';

const AdminPage: React.FC = () => {
  const { notification, show, clear } = useNotification();
  const [token, setToken] = useState<string>(() => localStorage.getItem(TOKEN_KEY) ?? '');
  const [form, setForm] = useState<EventForm>({ name: '', participantIds: '' });
  const [selectedEvent, setSelectedEvent] = useState<string | null>(null);

  useEffect(() => {
    if (token) {
      localStorage.setItem(TOKEN_KEY, token);
    } else {
      localStorage.removeItem(TOKEN_KEY);
    }
  }, [token]);

  const authHeaders = useMemo(() => ({ headers: { 'x-admin-token': token } }), [token]);

  const eventsQuery = useQuery<EventSummary[], Error>({
    queryKey: ['admin-events', token],
    queryFn: async () => {
      const response = await api.get('/admin/events', authHeaders);
      return response.data as EventSummary[];
    },
    enabled: Boolean(token),
    staleTime: 1000 * 30,
    refetchOnWindowFocus: false
  });

  const createEventMutation = useMutation<{ id: string }, Error, void>({
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
    onError: (error) => show('error', extractErrorMessage(error))
  });

  const cancelEventMutation = useMutation<void, Error, string>({
    mutationFn: async (eventId) => {
      await api.post(`/admin/events/${eventId}/cancel`, null, authHeaders);
    },
    onSuccess: () => {
      show('success', 'Evento cancelado.');
      void eventsQuery.refetch();
    },
    onError: (error) => show('error', extractErrorMessage(error))
  });

  const drawEventMutation = useMutation<DrawResult, Error, string>({
    mutationFn: async (eventId) => {
      const response = await api.post(`/admin/events/${eventId}/draw`, null, authHeaders);
      return response.data as DrawResult;
    },
    onSuccess: (data) => {
      show('success', `Sorteio concluído. ${data.tickets} tickets emitidos.`);
      void eventsQuery.refetch();
    },
    onError: (error) => show('error', extractErrorMessage(error))
  });

  const historyQuery = useQuery<EventHistory, Error>({
    queryKey: ['event-history', selectedEvent, token],
    queryFn: async () => {
      const response = await api.get(`/admin/events/${selectedEvent}/history`, authHeaders);
      return response.data as EventHistory;
    },
    enabled: Boolean(selectedEvent && token),
    refetchOnWindowFocus: false
  });

  useEffect(() => {
    if (eventsQuery.error) {
      show('error', extractErrorMessage(eventsQuery.error));
    }
  }, [eventsQuery.error, show]);

  useEffect(() => {
    if (historyQuery.error) {
      show('error', extractErrorMessage(historyQuery.error));
    }
  }, [historyQuery.error, show]);

  const history = historyQuery.data;
  const events = (eventsQuery.data ?? []) as EventSummary[];

  return (
    <div className="container" style={{ padding: '48px 0' }}>
      <div className="shadow-card">
        <h2 style={{ marginTop: 0 }}>Painel administrativo</h2>
        <p style={{ color: '#475569' }}>
          Gere eventos, execute sorteios e consulte históricos sem nunca visualizar quem tirou quem.
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
                onChange={(event) => setToken(event.target.value)}
                placeholder="Informe o token definido no backend"
              />
            </div>
            <div>
              <label>&nbsp;</label>
              <button
                type="button"
                className="primary-button"
                onClick={() => token && void eventsQuery.refetch()}
              >
                Conectar
              </button>
            </div>
          </div>
        </section>

        {token ? (
          <>
            <section style={{ marginBottom: '32px' }}>
              <h3>Novo evento</h3>
              <div className="form-grid">
                <div>
                  <label htmlFor="eventName">Nome do evento</label>
                  <input
                    id="eventName"
                    value={form.name}
                    onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
                    placeholder="Ex.: Domingo Oculto 2025"
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
                  {history.sorteios.map((entry: EventHistory["sorteios"][number], index: number) => (
                    <li key={index}>
                      {new Date(entry.drawnAt).toLocaleString()} · {entry.participantes} tickets emitidos
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </>
        ) : (
          <div className="alert info">Informe o token administrativo para carregar os eventos.</div>
        )}
      </div>
    </div>
  );
};

export default AdminPage;
