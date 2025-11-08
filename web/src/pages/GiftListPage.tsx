import { useState, useEffect } from 'react';
import axios from 'axios';
import FestiveCard from '../components/FestiveCard';
import { useNotification } from '../hooks/useNotification';
import Notification from '../components/Notification';
import { useParticipant } from '../context/ParticipantContext';
import { useNavigate } from 'react-router-dom';
import { api, extractErrorMessage } from '../services/api';
import { primaryButtonClass, inputClass, labelClass, secondaryButtonClass } from '../styles/theme';

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

  useEffect(() => {
    if (!participant.token) {
      show('error', 'Você precisa estar logado para acessar sua lista de presentes.');
      navigate('/participant-login');
      return;
    }
    fetchGiftList();
  }, [participant.token, navigate, show]);

  const fetchGiftList = async () => {
    setLoading(true);
    if (!participant.id) {
      console.error('Participant ID is missing, cannot fetch gift list.');
      setLoading(false);
      return;
    }
    try {
      const response = await api.get(`/gift-lists/${participant.id}`, {
        headers: {
          Authorization: `Bearer ${participant.token}`,
        },
      });
      setGiftList(response.data.items || []);
    } catch (error) {
      show('error', extractErrorMessage(error));
      // If token is invalid or expired, force logout
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
  };

  const handleAddItem = async () => {
    if (!newItemName.trim()) {
      show('error', 'O nome do presente não pode ser vazio.');
      return;
    }
    setSaving(true);
    clear();
    try {
      const updatedList = [...giftList, { id: Date.now().toString(), name: newItemName, url: newItemUrl, notes: newItemNotes, purchased: false }];
      await api.put(`/gift-lists/${participant.id}`, { items: updatedList }, {
        headers: {
          Authorization: `Bearer ${participant.token}`,
        },
      });
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
      const updatedList = giftList.filter(item => item.id !== id);
      await api.put(`/gift-lists/${participant.id}`, { items: updatedList }, {
        headers: {
          Authorization: `Bearer ${participant.token}`,
        },
      });
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
      const updatedList = giftList.map(item =>
        item.id === id ? { ...item, purchased: !item.purchased } : item
      );
      await api.put(`/gift-lists/${participant.id}`, { items: updatedList }, {
        headers: {
          Authorization: `Bearer ${participant.token}`,
        },
      });
      setGiftList(updatedList);
      show('success', 'Status do presente atualizado!');
    } catch (error) {
      show('error', extractErrorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = () => {
    clearParticipant();
    navigate('/participant-login');
    show('info', 'Você foi desconectado.');
  };

  if (loading) {
    return (
      <FestiveCard title="Sua Lista de Presentes" eyebrow="Carregando..." description="Aguarde enquanto carregamos sua lista de presentes." maxWidth="max-w-2xl">
        <Notification type="info" message="Carregando lista..." />
      </FestiveCard>
    );
  }

  return (
    <FestiveCard
      title="Sua Lista de Presentes"
      eyebrow={`Olá, ${participant.firstName || 'participante'}!`}
      description="Aqui você pode gerenciar os itens da sua lista de presentes."
      maxWidth="max-w-2xl"
    >
      {notification && <Notification type={notification.type} message={notification.message} onClose={clear} />}

      <div className="space-y-6">
        <div className="p-4 bg-white/10 rounded-lg">
          <h3 className="text-lg font-semibold text-white mb-4">Adicionar Novo Presente</h3>
          <div className="space-y-4">
            <div>
              <label htmlFor="newItemName" className={labelClass}>Nome do Presente</label>
              <input
                id="newItemName"
                type="text"
                className={inputClass}
                value={newItemName}
                onChange={(e) => setNewItemName(e.target.value)}
                placeholder="Ex: Livro, Brinquedo, Roupa"
              />
            </div>
            <div>
              <label htmlFor="newItemUrl" className={labelClass}>Link (opcional)</label>
              <input
                id="newItemUrl"
                type="url"
                className={inputClass}
                value={newItemUrl}
                onChange={(e) => setNewItemUrl(e.target.value)}
                placeholder="Ex: https://loja.com/presente"
              />
            </div>
            <div>
              <label htmlFor="newItemNotes" className={labelClass}>Observações (opcional)</label>
              <textarea
                id="newItemNotes"
                className={inputClass}
                value={newItemNotes}
                onChange={(e) => setNewItemNotes(e.target.value)}
                placeholder="Ex: Tamanho M, cor azul, para idade 5+"
                rows={3}
              ></textarea>
            </div>
            <button onClick={handleAddItem} className={primaryButtonClass} disabled={saving}>
              {saving ? 'Adicionando...' : 'Adicionar Presente'}
            </button>
          </div>
        </div>

        <div>
          <h3 className="text-lg font-semibold text-white mb-4">Meus Presentes ({giftList.length})</h3>
          {giftList.length === 0 ? (
            <p className="text-white/70">Sua lista de presentes está vazia. Adicione um item acima!</p>
          ) : (
            <ul className="space-y-4">
              {giftList.map((item) => (
                <li key={item.id} className="p-4 bg-white/10 rounded-lg flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                  <div className="flex-grow">
                    <p className={`text-lg font-medium ${item.purchased ? 'line-through text-white/50' : 'text-white'}`}>
                      {item.name}
                    </p>
                    {item.url && (
                      <a href={item.url} target="_blank" rel="noopener noreferrer" className="text-blue-300 hover:underline text-sm block">
                        Ver link
                      </a>
                    )}
                    {item.notes && (
                      <p className="text-sm text-white/70 mt-1">{item.notes}</p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleTogglePurchased(item.id)}
                      className={`${secondaryButtonClass} ${item.purchased ? 'bg-green-600 hover:bg-green-700' : 'bg-yellow-600 hover:bg-yellow-700'}`}
                      disabled={saving}
                    >
                      {item.purchased ? 'Desmarcar Compra' : 'Marcar como Comprado'}
                    </button>
                    <button
                      onClick={() => handleRemoveItem(item.id)}
                      className="bg-rose-600 hover:bg-rose-700 text-white font-bold py-2 px-4 rounded-lg transition duration-200"
                      disabled={saving}
                    >
                      Remover
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="flex justify-end">
          <button onClick={handleLogout} className={secondaryButtonClass}>
            Sair
          </button>
        </div>
      </div>
    </FestiveCard>
  );
};

export default GiftListPage;