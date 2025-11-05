import { FormEvent, useState } from 'react';
import FestiveCard from '../components/FestiveCard';
import { api, extractErrorMessage } from '../services/api';
import { useNotification } from '../hooks/useNotification';
import Notification from '../components/Notification';
import { inputClass, labelClass, primaryButtonClass, secondaryButtonClass, badgeClass } from '../styles/theme';

const objectIdRegex = /^[0-9a-fA-F]{24}$/;

type ParticipantResult = {
  id: string;
  firstName: string;
  secondName: string;
  fullName: string;
  nickname?: string;
  isChild: boolean;
};

type ParticipantStatus = {
  id: string;
  firstName: string;
  secondName: string;
  fullName: string;
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
        show('info', `Nenhum presente cadastrado por ${status.fullName} até o momento.`);
      } else {
        show('success', `Lista carregada para ${status.fullName}.`);
      }
    } catch (error) {
      const errorMessage = extractErrorMessage(error);
      // Melhorar mensagem quando o participante não for encontrado
      if (errorMessage.includes('não encontrado') || errorMessage.includes('not found')) {
        show('error', 'Participante não encontrado. Verifique se o ID está correto e se a inscrição foi confirmada. Se você está usando MongoDB em memória, os dados são perdidos quando o servidor reinicia. Crie uma nova inscrição se necessário.');
      } else {
        show('error', errorMessage);
      }
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
    <FestiveCard
      title="Consulte a lista de presentes"
      eyebrow="🔍 Portal do sorteio"
      description={
        <>
          <p>
            Pesquise pelo nome completo do participante que você sorteou ou cole diretamente o ID informado no e-mail do sorteio
            para abrir a lista de presentes.
          </p>
          <p className="text-sm text-white/70">
            Usamos o mesmo ID enviado junto com o ticket. Guarde-o para consultas futuras.
          </p>
        </>
      }
      maxWidth="max-w-5xl"
    >
      {notification && <Notification type={notification.type} message={notification.message} onClose={clear} />}

      <form onSubmit={handleSearch} className="space-y-6">
        <div className="space-y-2">
          <label htmlFor="lookupQuery" className={labelClass}>
            Nome ou ID do participante
          </label>
          <input
            id="lookupQuery"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            className={inputClass}
            placeholder="Ex.: Ana Beatriz ou 65f3b2c1..."
          />
        </div>
        <div className="flex justify-end">
          <button type="submit" className={primaryButtonClass} disabled={isSearching}>
            {isSearching ? 'Pesquisando...' : 'Buscar'}
          </button>
        </div>
      </form>

      {results.length > 0 && (
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-white">Participantes encontrados</h3>
            <span className={badgeClass}>{results.length} resultado(s)</span>
          </div>
          <div className="overflow-x-auto rounded-2xl border border-white/15 bg-black/20">
            <table className="min-w-full divide-y divide-white/15 text-left text-sm text-white/90">
              <thead className="uppercase text-xs tracking-[0.25em] text-white/60">
                <tr>
                  <th className="px-4 py-3">Nome</th>
                  <th className="px-4 py-3">Apelido</th>
                  <th className="px-4 py-3">Tipo</th>
                  <th className="px-4 py-3">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10">
                {results.map((participant) => (
                  <tr key={participant.id}>
                    <td className="px-4 py-3">{participant.fullName}</td>
                    <td className="px-4 py-3">{participant.nickname ?? '—'}</td>
                    <td className="px-4 py-3 capitalize">{participant.isChild ? 'Criança' : 'Adulto'}</td>
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        className={secondaryButtonClass}
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
          </div>
        </section>
      )}

      {loadingParticipant && <p className="text-white/80">Carregando lista selecionada...</p>}

      {selectedParticipant && !loadingParticipant && (
        <section className="space-y-4">
          <div className="rounded-2xl border border-white/20 bg-black/25 p-6 text-white/85 space-y-2">
            <h3 className="text-xl font-semibold text-white">
              Lista de {selectedParticipant.fullName}
              {selectedParticipant.nickname ? ` (${selectedParticipant.nickname})` : ''}
            </h3>
            <p className="text-white/70">
              Participação: {selectedParticipant.isChild ? 'Criança' : 'Adulto'} · Presença:{' '}
              {selectedParticipant.attendingInPerson ? 'Confirmada no encontro presencial' : 'Remota ou indefinida'}
            </p>
            <p className="text-sm text-white/60">
              Lembre-se: o ID enviado no e-mail do sorteio dá acesso direto a esta lista sempre que precisar.
            </p>
          </div>

          <div className="rounded-2xl border border-white/20 bg-black/15 p-6">
            {gifts.length === 0 ? (
              <p className="text-white/80">Este participante ainda não cadastrou preferências de presente.</p>
            ) : (
              <ul className="space-y-3 text-white/90">
                {gifts.map((gift, index) => (
                  <li key={`${gift.name}-${index}`} className="rounded-2xl bg-black/20 px-4 py-3">
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
                        Link de referência
                      </a>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>
      )}
    </FestiveCard>
  );
};

export default GiftLookupPage;
