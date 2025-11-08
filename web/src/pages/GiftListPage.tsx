import { useState, useEffect, useCallback, useMemo } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import FestiveCard from '../components/FestiveCard';
import Notification from '../components/Notification';
import { useNotification } from '../hooks/useNotification';
import { useParticipant } from '../context/ParticipantContext';
import { api, extractErrorMessage } from '../services/api';
import {
  primaryButtonClass,
  inputClass,
  labelClass,
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
      const listResponse = await api.get(`/gift-lists/${participant.id}`, {
        headers: {
          Authorization: `Bearer ${participant.token}`,
        },
      });

      setGiftList(listResponse.data.items || []);
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
