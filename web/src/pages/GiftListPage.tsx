import { useState, useEffect, useCallback, useMemo } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import FestiveCard from '../components/FestiveCard';
import Notification from '../components/Notification';
import { useNotification } from '../hooks/useNotification';
import { useParticipant } from '../context/ParticipantContext';
import { api, extractErrorMessage, logoutParticipantSession } from '../services/api';
import {
  primaryButtonClass,
  inputClass,
  labelClass,
  dangerButtonClass,
  ghostButtonClass,
  textareaClass,
} from '../styles/theme';

type GiftPriority = 'alta' | 'media' | 'baixa';

interface GiftItem {
  id: string;
  name: string;
  url?: string;
  notes?: string;
  description?: string;
  priority?: GiftPriority;
  purchased: boolean;
}

interface AssignedFriend {
  id: string;
  firstName: string;
  secondName: string;
  fullName: string;
  isChild: boolean;
}

type AssignmentStatus = 'loading' | 'available' | 'pending' | 'error';

const GiftListPage: React.FC = () => {
  const { participant, clearParticipant } = useParticipant();
  const { notification, show, clear } = useNotification();
  const navigate = useNavigate();
  const [giftList, setGiftList] = useState<GiftItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [newItemName, setNewItemName] = useState('');
  const [newItemUrl, setNewItemUrl] = useState('');
  const [newItemNotes, setNewItemNotes] = useState('');
  const [assignedFriend, setAssignedFriend] = useState<AssignedFriend | null>(null);
  const [assignedFriendGifts, setAssignedFriendGifts] = useState<GiftItem[]>([]);
  const [assignmentStatus, setAssignmentStatus] = useState<AssignmentStatus>('loading');
  const [assignmentMessage, setAssignmentMessage] = useState<string | null>(null);
  const [showFriendList, setShowFriendList] = useState(false);

  const handleLogout = useCallback(() => {
    void logoutParticipantSession().catch((error) => {
      console.warn('Erro ao encerrar sessão do participante:', error);
    });
    clearParticipant();
    navigate('/login');
    show('info', 'Você foi desconectado.');
  }, [clearParticipant, navigate, show]);

  const fetchDashboardData = useCallback(async () => {
    if (!participant.id) {
      console.error('Participant está sem identificador, não é possível carregar a lista.');
      setLoading(false);
      return;
    }

    setLoading(true);
    setAssignmentStatus('loading');
    setAssignmentMessage(null);
    try {
      const assignmentPromise = api
        .get(`/gift-lists/${participant.id}/assigned-friend`)
        .then((response) => ({ ok: true as const, data: response.data }))
        .catch((error) => ({ ok: false as const, error }));

      const [listResponse, assignmentResult] = await Promise.all([
        api.get(`/gift-lists/${participant.id}`),
        assignmentPromise,
      ]);

      setGiftList(listResponse.data.items || []);

      if (assignmentResult.ok) {
        const { assignedParticipant, giftItems } = assignmentResult.data;
        setAssignedFriend({
          id: assignedParticipant.id,
          firstName: assignedParticipant.firstName,
          secondName: assignedParticipant.secondName,
          fullName: assignedParticipant.fullName,
          isChild: assignedParticipant.isChild,
        });
        setAssignedFriendGifts(giftItems || []);
        setAssignmentStatus('available');
        setAssignmentMessage(null);
      } else if (axios.isAxiosError(assignmentResult.error)) {
        const { response } = assignmentResult.error;

        if (response && (response.status === 401 || response.status === 403)) {
          setAssignedFriend(null);
          setAssignedFriendGifts([]);
          setShowFriendList(false);
          setAssignmentStatus('error');
          setAssignmentMessage('Sua sessão expirou. Entre novamente para ver o amigo secreto.');
          handleLogout();
          return;
        }

        if (response && response.status === 404) {
          setAssignedFriend(null);
          setAssignedFriendGifts([]);
          setAssignmentStatus('pending');
          setAssignmentMessage('Assim que o sorteio for realizado, você verá aqui quem presenteará.');
        } else {
          const message = extractErrorMessage(assignmentResult.error);
          setAssignedFriend(null);
          setAssignedFriendGifts([]);
          setAssignmentStatus('error');
          setAssignmentMessage(message);
          show('error', message);
        }
      } else {
        const message = extractErrorMessage(assignmentResult.error);
        setAssignedFriend(null);
        setAssignedFriendGifts([]);
        setAssignmentStatus('error');
        setAssignmentMessage(message);
        show('error', message);
      }
    } catch (error) {
      show('error', extractErrorMessage(error));
      if (
        axios.isAxiosError(error) &&
        error.response &&
        (error.response.status === 401 || error.response.status === 403)
      ) {
        handleLogout();
      }
    } finally {
      setLoading(false);
    }
  }, [handleLogout, participant.id, show]);

  useEffect(() => {
    if (!participant.id) {
      return;
    }
    void fetchDashboardData();
  }, [participant.id, fetchDashboardData]);

  useEffect(() => {
    if (assignmentStatus !== 'available') {
      setShowFriendList(false);
    }
  }, [assignmentStatus]);

  const handleAddItem = async () => {
    if (!newItemName.trim()) {
      show('error', 'O nome do presente não pode ser vazio.');
      return;
    }
    if (!participant.id) {
      show('error', 'Sua sessão expirou. Faça login novamente.');
      handleLogout();
      return;
    }
    setSaving(true);
    clear();
    try {
      const updatedList = [
        ...giftList,
        {
          id: Date.now().toString(),
          name: newItemName,
          url: newItemUrl,
          notes: newItemNotes,
          purchased: false,
        },
      ];
      await api.put(`/gift-lists/${participant.id}`, { items: updatedList });
      setGiftList(updatedList);
      setNewItemName('');
      setNewItemUrl('');
      setNewItemNotes('');
      show('success', 'Presente adicionado com sucesso!');
    } catch (error) {
      show('error', extractErrorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveItem = async (id: string) => {
    if (!participant.id) {
      show('error', 'Sua sessão expirou. Faça login novamente.');
      handleLogout();
      return;
    }
    setSaving(true);
    clear();
    try {
      const updatedList = giftList.filter((item) => item.id !== id);
      await api.put(`/gift-lists/${participant.id}`, { items: updatedList });
      setGiftList(updatedList);
      show('success', 'Presente removido com sucesso!');
    } catch (error) {
      show('error', extractErrorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  const totalItems = useMemo(() => giftList.length, [giftList]);
  const greetingName = participant.firstName ? participant.firstName : 'participante';

  if (loading) {
    return (
      <FestiveCard
        title="Sua Lista de Presentes"
        eyebrow="Carregando painel"
        description="Estamos preparando o seu painel da lista. Só um instante."
        maxWidth="max-w-5xl"
      >
        <Notification type="info" message="Carregando dados..." />
      </FestiveCard>
    );
  }

  return (
    <FestiveCard
      title="Sua Lista de Presentes"
      eyebrow={`Olá, ${greetingName}!`}
      description="Mantenha a sua lista atualizada para ajudar quem vai presentear você. Aqui você pode incluir, revisar e remover itens sempre que quiser."
      maxWidth="max-w-5xl"
    >
      {notification && <Notification type={notification.type} message={notification.message} onClose={clear} />}

      <div className="space-y-10">
        <section className="rounded-3xl border border-emerald-200/30 bg-emerald-400/10 p-6 shadow-lg shadow-black/30">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="text-xl font-semibold text-white">Seu amigo secreto</h3>
              <p className="text-sm text-white/70">
                Consulte os detalhes de quem você irá presentear e acompanhe a lista de desejos sem depender do e-mail.
              </p>
            </div>
            {assignmentStatus === 'available' && (
              <button
                type="button"
                onClick={() => setShowFriendList((previous) => !previous)}
                className={primaryButtonClass}
              >
                {showFriendList ? 'Esconder lista' : 'Ver lista de desejos'}
              </button>
            )}
          </div>

          <div className="mt-6 rounded-2xl border border-white/15 bg-white/5 p-5 text-white">
            {assignmentStatus === 'loading' && (
              <p className="text-sm text-white/80">
                Estamos confirmando o resultado do sorteio. Em instantes você verá o seu amigo secreto aqui.
              </p>
            )}

            {assignmentStatus === 'pending' && (
              <p className="text-sm text-white/80">
                {assignmentMessage ??
                  'Assim que o organizador finalizar o sorteio, o nome do seu amigo secreto aparecerá aqui junto com a lista de desejos.'}
              </p>
            )}

            {assignmentStatus === 'error' && (
              <p className="text-sm text-rose-200">
                {assignmentMessage ??
                  'Não foi possível carregar os dados do amigo secreto agora. Tente novamente em alguns instantes.'}
              </p>
            )}

            {assignmentStatus === 'available' && assignedFriend && (
              <div className="space-y-5">
                <div className="space-y-2">
                  <p className="text-lg font-semibold">{assignedFriend.fullName}</p>
                  {assignedFriend.isChild && (
                    <span className="inline-flex w-fit items-center rounded-full bg-indigo-500/20 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-indigo-100">
                      Participante infantil
                    </span>
                  )}
                  <p className="text-sm text-white/80">
                    Clique no botão acima para abrir a lista de desejos cadastrada por {assignedFriend.firstName}.
                  </p>
                </div>

                {showFriendList && (
                  <div className="space-y-4 rounded-2xl border border-white/10 bg-black/20 p-4">
                    {assignedFriendGifts.length === 0 ? (
                      <p className="text-sm text-white/70">
                        O seu amigo secreto ainda não cadastrou presentes. Volte mais tarde ou entre em contato com o organizador.
                      </p>
                    ) : (
                      <ul className="space-y-4">
                        {assignedFriendGifts.map((item) => (
                          <li
                            key={item.id}
                            className="rounded-2xl border border-white/20 bg-white/10 p-4 transition hover:border-emerald-200/60 hover:bg-emerald-400/10"
                          >
                            <div className="space-y-3">
                              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                                <span className="text-base font-semibold text-white sm:text-lg">{item.name}</span>
                                {item.priority && (
                                  <span className="inline-flex items-center rounded-full bg-emerald-500/20 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-emerald-100">
                                    Prioridade {item.priority}
                                  </span>
                                )}
                              </div>
                              {item.description && <p className="text-sm text-white/80">{item.description}</p>}
                              {item.notes && (
                                <p className="text-sm text-white/70">Observações: {item.notes}</p>
                              )}
                              {item.url && (
                                <a
                                  href={item.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-2 text-sm font-semibold text-emerald-200 underline-offset-2 hover:underline"
                                >
                                  Abrir sugestão de presente
                                </a>
                              )}
                            </div>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </section>

        <div className="rounded-3xl border border-white/20 bg-white/10 p-6 shadow-lg shadow-black/30">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <h3 className="text-xl font-semibold text-white">Adicionar novo presente</h3>
            <button
              type="button"
              onClick={() => void fetchDashboardData()}
              className={ghostButtonClass}
              disabled={loading || saving}
            >
              Atualizar lista
            </button>
          </div>
          <p className="mt-2 text-sm text-white/70">
            Informe um título fácil de reconhecer, compartilhe o link se houver e utilize as observações para explicar detalhes
            como cor, tamanho ou qualquer outro pedido especial.
          </p>

          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <div className="md:col-span-2">
              <label htmlFor="newItemName" className={labelClass}>
                Título do presente
              </label>
              <input
                id="newItemName"
                type="text"
                className={inputClass}
                value={newItemName}
                onChange={(event) => setNewItemName(event.target.value)}
                placeholder="Ex: Jogo de tabuleiro favorito, Kit de autocuidado"
              />
            </div>
            <div>
              <label htmlFor="newItemUrl" className={labelClass}>
                Link de referência (opcional)
              </label>
              <input
                id="newItemUrl"
                type="url"
                className={inputClass}
                value={newItemUrl}
                onChange={(event) => setNewItemUrl(event.target.value)}
                placeholder="https://loja.com/seu-presente"
              />
            </div>
            <div>
              <label htmlFor="newItemNotes" className={labelClass}>
                Observações para quem for comprar (opcional)
              </label>
              <textarea
                id="newItemNotes"
                className={textareaClass}
                value={newItemNotes}
                onChange={(event) => setNewItemNotes(event.target.value)}
                placeholder="Cite cor, tamanho, edições preferidas ou qualquer outro detalhe útil."
                rows={3}
              />
            </div>
          </div>

          <div className="mt-6 flex justify-end">
            <button type="button" onClick={handleAddItem} className={primaryButtonClass} disabled={saving}>
              {saving ? 'Salvando...' : 'Adicionar presente'}
            </button>
          </div>
        </div>

        <section className="rounded-3xl border border-white/15 bg-white/5 p-6 shadow-lg shadow-black/30">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="text-xl font-semibold text-white">Itens da minha lista</h3>
              <p className="text-sm text-white/70">
                {totalItems === 0
                  ? 'Comece adicionando o primeiro item acima.'
                  : `Você tem ${totalItems} ${totalItems === 1 ? 'presente' : 'presentes'} cadastrados.`}
              </p>
            </div>
          </div>

          {giftList.length === 0 ? (
            <p className="mt-6 rounded-2xl border border-dashed border-white/30 bg-white/10 p-6 text-center text-white/70">
              Sua lista está vazia. Adicione itens no formulário acima para compartilhar com o seu amigo oculto.
            </p>
          ) : (
            <ul className="mt-6 space-y-4">
              {giftList.map((item) => (
                <li
                  key={item.id}
                  className="rounded-2xl border border-white/20 bg-white/10 p-5 text-white transition hover:border-emerald-300/60 hover:bg-emerald-400/10"
                >
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div className="space-y-2">
                      <p className="text-lg font-semibold">{item.name}</p>
                      {item.notes && <p className="text-sm text-white/80">{item.notes}</p>}
                      {item.url && (
                        <a
                          href={item.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 text-sm font-semibold text-emerald-200 underline-offset-2 hover:underline"
                        >
                          Abrir link de referência
                        </a>
                      )}
                    </div>
                    <div className="flex flex-col gap-2 sm:w-44">
                      <button
                        type="button"
                        onClick={() => handleRemoveItem(item.id)}
                        className={dangerButtonClass}
                        disabled={saving}
                      >
                        Remover da lista
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <div className="rounded-3xl border border-white/20 bg-white/10 p-6 shadow-lg shadow-black/30">
          <h3 className="text-lg font-semibold text-white">Encerrar sessão</h3>
          <p className="mt-2 text-sm text-white/70">
            Ao sair, você pode solicitar um novo código a qualquer momento para voltar à sua lista.
          </p>
          <button type="button" onClick={handleLogout} className={`${ghostButtonClass} mt-4 w-full sm:w-auto`}>
            Sair da conta
          </button>
        </div>
      </div>
    </FestiveCard>
  );
};

export default GiftListPage;
