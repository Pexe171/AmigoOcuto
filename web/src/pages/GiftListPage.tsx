import { useState, useEffect, useCallback, useMemo } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import FestiveCard from '../components/FestiveCard';
import Notification from '../components/Notification';
import DashboardStatCard from '../components/DashboardStatCard';
import { useNotification } from '../hooks/useNotification';
import { useParticipant } from '../context/ParticipantContext';
import { api, extractErrorMessage } from '../services/api';
import {
  primaryButtonClass,
  inputClass,
  labelClass,
  secondaryButtonClass,
  dangerButtonClass,
  ghostButtonClass,
  textareaClass,
} from '../styles/theme';

interface GiftItem {
  id: string;
  name: string;
  url?: string;
  notes?: string;
  purchased: boolean;
}

interface ParticipantDashboardInfo {
  id: string;
  fullName?: string;
  emailVerified: boolean;
  isChild: boolean;
  contactEmail: string | null;
  primaryGuardianEmail?: string | null;
  guardianEmails?: string[];
  attendingInPerson?: boolean;
  createdAt?: string;
}

const GiftListPage: React.FC = () => {
  const { participant, clearParticipant } = useParticipant();
  const { notification, show, clear } = useNotification();
  const navigate = useNavigate();
  const [giftList, setGiftList] = useState<GiftItem[]>([]);
  const [participantInfo, setParticipantInfo] = useState<ParticipantDashboardInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [newItemName, setNewItemName] = useState('');
  const [newItemUrl, setNewItemUrl] = useState('');
  const [newItemNotes, setNewItemNotes] = useState('');

  const handleLogout = useCallback(() => {
    clearParticipant();
    navigate('/login');
    show('info', 'Você foi desconectado.');
  }, [clearParticipant, navigate, show]);

  const fetchDashboardData = useCallback(async () => {
    if (!participant.id || !participant.token) {
      console.error('Participant is missing credentials, cannot fetch gift list.');
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const [listResponse, infoResponse] = await Promise.all([
        api.get(`/gift-lists/${participant.id}`, {
          headers: {
            Authorization: `Bearer ${participant.token}`,
          },
        }),
        api.get(`/participants/${participant.id}`),
      ]);

      setGiftList(listResponse.data.items || []);
      setParticipantInfo(infoResponse.data as ParticipantDashboardInfo);
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
  }, [handleLogout, participant.id, participant.token, show]);

  useEffect(() => {
    if (!participant.token || !participant.id) {
      return;
    }
    void fetchDashboardData();
  }, [participant.token, participant.id, fetchDashboardData]);

  const handleAddItem = async () => {
    if (!newItemName.trim()) {
      show('error', 'O nome do presente não pode ser vazio.');
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
      await api.put(
        `/gift-lists/${participant.id}`,
        { items: updatedList },
        {
          headers: {
            Authorization: `Bearer ${participant.token}`,
          },
        },
      );
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
    setSaving(true);
    clear();
    try {
      const updatedList = giftList.filter((item) => item.id !== id);
      await api.put(
        `/gift-lists/${participant.id}`,
        { items: updatedList },
        {
          headers: {
            Authorization: `Bearer ${participant.token}`,
          },
        },
      );
      setGiftList(updatedList);
      show('success', 'Presente removido com sucesso!');
    } catch (error) {
      show('error', extractErrorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  const handleTogglePurchased = async (id: string) => {
    setSaving(true);
    clear();
    try {
      const updatedList = giftList.map((item) =>
        item.id === id ? { ...item, purchased: !item.purchased } : item,
      );
      await api.put(
        `/gift-lists/${participant.id}`,
        { items: updatedList },
        {
          headers: {
            Authorization: `Bearer ${participant.token}`,
          },
        },
      );
      setGiftList(updatedList);
      show('success', 'Status do presente atualizado!');
    } catch (error) {
      show('error', extractErrorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  const totalItems = useMemo(() => giftList.length, [giftList]);
  const purchasedCount = useMemo(
    () => giftList.filter((item) => item.purchased).length,
    [giftList],
  );
  const pendingCount = useMemo(() => totalItems - purchasedCount, [totalItems, purchasedCount]);
  const progressPercentage = useMemo(
    () => (totalItems === 0 ? 0 : Math.round((purchasedCount / totalItems) * 100)),
    [purchasedCount, totalItems],
  );

  const createdAtLabel = useMemo(() => {
    if (!participantInfo?.createdAt) {
      return null;
    }
    try {
      return new Intl.DateTimeFormat('pt-BR', {
        dateStyle: 'long',
        timeStyle: 'short',
      }).format(new Date(participantInfo.createdAt));
    } catch (error) {
      console.warn('Não foi possível formatar a data de criação da conta.', error);
      return null;
    }
  }, [participantInfo?.createdAt]);

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
      eyebrow={`Olá, ${participant.firstName || 'participante'}!`}
      description="Bem-vindo ao seu painel. Gerencie itens, confira o status do cadastro e compartilhe suas preferências com quem te presenteia."
      maxWidth="max-w-5xl"
    >
      {notification && <Notification type={notification.type} message={notification.message} onClose={clear} />}

      <div className="space-y-10">
        <div className="grid gap-4 md:grid-cols-3">
          <DashboardStatCard
            title="Itens na lista"
            value={totalItems}
            description={totalItems === 0 ? 'Adicione o primeiro item para começar.' : 'Conteúdo atualizado automaticamente após cada edição.'}
          />
          <DashboardStatCard
            title="Já garantidos"
            value={purchasedCount}
            description={purchasedCount === 0 ? 'Ninguém marcou como comprado ainda.' : 'Você pode marcar um item quando já ganhou ou não precisa mais.'}
            tone="success"
          />
          <DashboardStatCard
            title="Pendentes"
            value={pendingCount}
            description={totalItems === 0 ? 'Sem itens pendentes por enquanto.' : `${progressPercentage}% da lista já foi atendida.`}
            tone={pendingCount === 0 ? 'success' : 'warning'}
          />
        </div>

        <div className="grid gap-6 lg:grid-cols-[1.7fr_1fr]">
          <section className="space-y-6">
            <div className="rounded-3xl border border-white/20 bg-white/10 p-6 shadow-lg shadow-black/30">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <h3 className="text-xl font-semibold text-white">Adicionar novo presente</h3>
                <button
                  type="button"
                  onClick={() => void fetchDashboardData()}
                  className={ghostButtonClass}
                  disabled={loading || saving}
                >
                  Atualizar painel
                </button>
              </div>
              <p className="mt-2 text-sm text-white/70">
                Inclua preferências com o máximo de detalhes. Links ajudam muito quem vai comprar.
              </p>

              <div className="mt-6 grid gap-4 md:grid-cols-2">
                <div className="md:col-span-2">
                  <label htmlFor="newItemName" className={labelClass}>
                    Nome do presente
                  </label>
                  <input
                    id="newItemName"
                    type="text"
                    className={inputClass}
                    value={newItemName}
                    onChange={(event) => setNewItemName(event.target.value)}
                    placeholder="Ex: Livro, experiência, brinquedo favorito"
                  />
                </div>
                <div>
                  <label htmlFor="newItemUrl" className={labelClass}>
                    Link (opcional)
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
                    Observações (opcional)
                  </label>
                  <textarea
                    id="newItemNotes"
                    className={textareaClass}
                    value={newItemNotes}
                    onChange={(event) => setNewItemNotes(event.target.value)}
                    placeholder="Cor, tamanho, preferências especiais..."
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

            <div className="rounded-3xl border border-white/15 bg-white/5 p-6 shadow-lg shadow-black/30">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <h3 className="text-xl font-semibold text-white">Minha lista ({totalItems})</h3>
                <span className="text-sm text-white/70">
                  {totalItems === 0
                    ? 'Nenhum item adicionado ainda.'
                    : `${purchasedCount} comprado(s) • ${pendingCount} pendente(s)`}
                </span>
              </div>

              {giftList.length === 0 ? (
                <p className="mt-4 rounded-2xl border border-dashed border-white/30 bg-white/10 p-6 text-center text-white/70">
                  Sua lista está vazia. Adicione itens no formulário acima para compartilhar com o seu amigo oculto.
                </p>
              ) : (
                <ul className="mt-6 space-y-4">
                  {giftList.map((item) => (
                    <li
                      key={item.id}
                      className={`rounded-2xl border p-5 transition hover:border-emerald-300/60 hover:bg-emerald-400/10 ${
                        item.purchased
                          ? 'border-emerald-400/60 bg-emerald-500/10 text-emerald-50'
                          : 'border-white/20 bg-white/10 text-white'
                      }`}
                    >
                      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                        <div className="space-y-2">
                          <p className={`text-lg font-semibold ${item.purchased ? 'text-emerald-100 line-through opacity-80' : ''}`}>
                            {item.name}
                          </p>
                          {item.notes && (
                            <p className={`text-sm ${item.purchased ? 'text-emerald-50/80' : 'text-white/70'}`}>
                              {item.notes}
                            </p>
                          )}
                          {item.url && (
                            <a
                              href={item.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-2 text-sm font-semibold text-emerald-200 underline-offset-2 hover:underline"
                            >
                              Abrir link
                            </a>
                          )}
                        </div>
                        <div className="flex flex-col gap-2 sm:w-48">
                          <button
                            type="button"
                            onClick={() => handleTogglePurchased(item.id)}
                            className={ghostButtonClass}
                            disabled={saving}
                          >
                            {item.purchased ? 'Marcar como pendente' : 'Marcar como recebido'}
                          </button>
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
            </div>
          </section>

          <aside className="space-y-6">
            <div className="rounded-3xl border border-white/20 bg-white/10 p-6 text-white shadow-lg shadow-black/30">
              <h3 className="text-xl font-semibold">Resumo do cadastro</h3>
              <p className="mt-2 text-sm text-white/70">
                Mantemos estas informações para direcionar e-mails e avisos importantes.
              </p>
              <dl className="mt-4 space-y-3 text-sm">
                <div className="flex justify-between gap-3">
                  <dt className="font-semibold text-white/80">Nome completo</dt>
                  <dd className="text-right text-white">{participantInfo?.fullName || '—'}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="font-semibold text-white/80">Contato principal</dt>
                  <dd className="text-right text-white">
                    {participantInfo?.contactEmail || participantInfo?.primaryGuardianEmail || '—'}
                  </dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="font-semibold text-white/80">Status</dt>
                  <dd className={`text-right font-semibold ${participantInfo?.emailVerified ? 'text-emerald-200' : 'text-amber-200'}`}>
                    {participantInfo?.emailVerified ? 'E-mail confirmado' : 'Confirmação pendente'}
                  </dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="font-semibold text-white/80">Participação</dt>
                  <dd className="text-right text-white/90">
                    {participantInfo?.attendingInPerson === true
                      ? 'Presencial'
                      : participantInfo?.attendingInPerson === false
                      ? 'A distância'
                      : 'A definir'}
                  </dd>
                </div>
                {participantInfo?.guardianEmails && participantInfo.guardianEmails.length > 0 && (
                  <div>
                    <dt className="font-semibold text-white/80">Responsáveis copiados</dt>
                    <dd className="mt-1 text-right text-sm text-white/80">
                      {participantInfo.guardianEmails.join(', ')}
                    </dd>
                  </div>
                )}
                {createdAtLabel && (
                  <div className="flex justify-between gap-3">
                    <dt className="font-semibold text-white/80">Cadastro criado em</dt>
                    <dd className="text-right text-white/80">{createdAtLabel}</dd>
                  </div>
                )}
              </dl>
            </div>

            <div className="rounded-3xl border border-white/15 bg-white/5 p-6 text-sm text-white/80 shadow-lg shadow-black/30">
              <h3 className="text-lg font-semibold text-white">Dicas rápidas</h3>
              <ul className="mt-4 space-y-3 list-disc pl-5">
                <li>Atualize a lista sempre que mudar de ideia sobre um presente.</li>
                <li>Descreva cores, tamanhos ou modelos para facilitar a compra.</li>
                <li>Se precisar de ajuda, responda ao e-mail de confirmação e nossa equipa retorna.</li>
              </ul>
            </div>

            <div className="rounded-3xl border border-white/20 bg-white/10 p-6 shadow-lg shadow-black/30">
              <h3 className="text-lg font-semibold text-white">Encerrar sessão</h3>
              <p className="mt-2 text-sm text-white/70">
                Ao sair, você pode solicitar um novo código a qualquer momento para voltar ao painel.
              </p>
              <button type="button" onClick={handleLogout} className={`${secondaryButtonClass} mt-4 w-full`}>
                Sair da conta
              </button>
            </div>
          </aside>
        </div>
      </div>
    </FestiveCard>
  );
};

export default GiftListPage;
