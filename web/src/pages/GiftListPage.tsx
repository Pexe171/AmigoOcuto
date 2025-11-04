import { useEffect, useMemo, useState } from 'react';
import { useForm, useFieldArray, Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import FestiveCard from '../components/FestiveCard';
import { api, extractErrorMessage } from '../services/api';
import { useNotification } from '../hooks/useNotification';
import Notification from '../components/Notification';
import { useParticipant } from '../context/ParticipantContext';
import {
  inputClass,
  labelClass,
  textareaClass,
  primaryButtonClass,
  secondaryButtonClass,
  ghostButtonClass
} from '../styles/theme';

const giftSchema = z.object({
  name: z.string().min(2, 'Descreva o presente'),
  description: z.string().optional(),
  url: z.string().url('Informe um link válido').optional().or(z.literal('')),
  priority: z.enum(['alta', 'media', 'baixa']).default('media')
});

const giftListSchema = z.object({
  participantId: z.string().min(1, 'Informe o ID da inscrição'),
  items: z.array(giftSchema).min(1, 'Adicione pelo menos um item').max(50)
});

type GiftListForm = z.infer<typeof giftListSchema>;

type GiftResponse = {
  items: {
    name: string;
    description?: string;
    url?: string;
    priority?: 'alta' | 'media' | 'baixa';
  }[];
};

type ParticipantStatus = {
  id: string;
  firstName: string;
  secondName: string;
  nickname?: string;
  email?: string;
  primaryGuardianEmail?: string;
  guardianEmails: string[];
  emailVerified: boolean;
  isChild: boolean;
  attendingInPerson?: boolean;
  contactEmail?: string | null;
  createdAt?: string;
};

const fetchGiftList = async (id: string): Promise<GiftResponse> => {
  const response = await api.get(`/participants/${id}/gifts`);
  return response.data as GiftResponse;
};

const fetchParticipantStatus = async (id: string): Promise<ParticipantStatus> => {
  const response = await api.get(`/participants/${id}`);
  return response.data as ParticipantStatus;
};

const GiftListPage: React.FC = () => {
  const { participant } = useParticipant();
  const { notification, show, clear } = useNotification();
  const queryClient = useQueryClient();
  const [loadingParticipantData, setLoadingParticipantData] = useState(false);

  const form = useForm<GiftListForm>({
    resolver: zodResolver(giftListSchema) as Resolver<GiftListForm>,
    defaultValues: {
      participantId: participant.id ?? '',
      items: [{ name: '', description: '', url: '', priority: 'media' }]
    }
  });

  const {
    register,
    control,
    handleSubmit,
    watch,
    setValue,
    formState: { errors }
  } = form;

  const { fields, append, remove, replace } = useFieldArray({ control, name: 'items' });
  const participantId = watch('participantId');

  const giftListQuery = useQuery<GiftResponse, Error>({
    queryKey: ['gift-list', participantId],
    queryFn: async ({ queryKey }) => {
      const [, id] = queryKey as [string, string];
      return fetchGiftList(id);
    },
    enabled: false,
    retry: false
  });

  const participantStatusQuery = useQuery<ParticipantStatus, Error>({
    queryKey: ['participant-status', participantId],
    queryFn: async ({ queryKey }) => {
      const [, id] = queryKey as [string, string];
      return fetchParticipantStatus(id);
    },
    enabled: false,
    retry: false
  });

  useEffect(() => {
    const data = giftListQuery.data;
    if (!data) {
      return;
    }
    if (!data.items.length) {
      replace([{ name: '', description: '', url: '', priority: 'media' }]);
    } else {
      replace(
        data.items.map((item) => ({
          name: item.name,
          description: item.description ?? '',
          url: item.url ?? '',
          priority: item.priority ?? 'media'
        }))
      );
    }
  }, [giftListQuery.data, replace]);

  const mutation = useMutation<GiftResponse, Error, GiftListForm>({
    mutationFn: async (data) => {
      const response = await api.put(`/participants/${data.participantId}/gifts`, {
        items: data.items.map((item) => ({
          name: item.name,
          description: item.description || undefined,
          url: item.url || undefined,
          priority: item.priority
        }))
      });
      return response.data as GiftResponse;
    },
    onSuccess: (data) => {
      show('success', 'Lista salva com sucesso.');
      replace(
        data.items.map((item) => ({
          name: item.name,
          description: item.description ?? '',
          url: item.url ?? '',
          priority: item.priority ?? 'media'
        }))
      );
    },
    onError: (error) => show('error', extractErrorMessage(error))
  });

  const participantStatus = participantStatusQuery.data;
  const contactEmail = useMemo(() => {
    if (participantStatus?.contactEmail) {
      return participantStatus.contactEmail;
    }
    return participant.contactEmail;
  }, [participantStatus?.contactEmail, participant.contactEmail]);

  const isFetchingData =
    loadingParticipantData || giftListQuery.isFetching || participantStatusQuery.isFetching;

  const refreshParticipantData = async (idFromEvent?: string): Promise<void> => {
    const rawId = idFromEvent ?? participantId;
    const trimmed = rawId.trim();
    if (!trimmed) {
      show('error', 'Informe o ID da inscrição para carregar os dados.');
      return;
    }
    setValue('participantId', trimmed);
    clear();
    setLoadingParticipantData(true);
    try {
      const [status] = await Promise.all([
        queryClient.fetchQuery({
          queryKey: ['participant-status', trimmed],
          queryFn: () => fetchParticipantStatus(trimmed),
          staleTime: 0
        }),
        queryClient.fetchQuery({
          queryKey: ['gift-list', trimmed],
          queryFn: () => fetchGiftList(trimmed),
          staleTime: 0
        })
      ]);
      if (status) {
        show('success', `Dados carregados para ${status.firstName} ${status.secondName}.`);
      }
    } catch (error) {
      show('error', extractErrorMessage(error));
    } finally {
      setLoadingParticipantData(false);
    }
  };

  useEffect(() => {
    if (participant.id) {
      setValue('participantId', participant.id);
      void refreshParticipantData(participant.id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [participant.id]);

  const onSubmit = handleSubmit((data) => {
    const trimmedId = data.participantId.trim();
    if (!trimmedId) {
      show('error', 'Informe o ID da inscrição para salvar a lista.');
      return;
    }
    clear();
    mutation.mutate({ ...data, participantId: trimmedId });
  });

  return (
    <FestiveCard
      title="Monte sua lista de presentes"
      eyebrow="🎄 Lista oficial"
      description={
        <>
          <p>
            Adicione quantos itens desejar, com detalhes e links para facilitar o presenteador. Sempre que salvar, o sorteio usa
            a versão atualizada.
          </p>
          <p className="text-sm text-white/70">
            Comece informando o ID da inscrição para exibir o e-mail de contato e carregar a lista existente.
          </p>
        </>
      }
      maxWidth="max-w-5xl"
    >
      {notification && <Notification type={notification.type} message={notification.message} onClose={clear} />}

      <div className="space-y-6">
        <div className="rounded-2xl border border-white/20 bg-black/25 p-6 text-white/85 space-y-3 text-sm">
          <p className="uppercase text-white/60 text-xs tracking-[0.25em]">Contato da inscrição</p>
          {participantStatus ? (
            <div className="space-y-1">
              <p>
                <strong>
                  {participantStatus.firstName} {participantStatus.secondName}
                </strong>{' '}
                {participantStatus.nickname ? `(${participantStatus.nickname})` : ''} ·{' '}
                {participantStatus.isChild ? 'Criança' : 'Adulto'}
              </p>
              {contactEmail && (
                <p>
                  E-mail principal para códigos: <strong>{contactEmail}</strong>
                </p>
              )}
              {participantStatus.guardianEmails.length > 0 && (
                <p className="text-white/70">
                  Outros responsáveis: {participantStatus.guardianEmails.join(', ')}
                </p>
              )}
              {typeof participantStatus.attendingInPerson === 'boolean' && (
                <p className="text-white/70">
                  Presença:{' '}
                  {participantStatus.attendingInPerson
                    ? 'Confirmada para o encontro presencial'
                    : 'Remota ou ainda não confirmada'}
                </p>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              {participant.firstName ? (
                <p>
                  {participant.firstName}, informe o ID para carregar sua lista. O e-mail do código é{' '}
                  {participant.contactEmail ? <strong>{participant.contactEmail}</strong> : 'o informado no cadastro'}.
                </p>
              ) : (
                <p>Informe o ID da inscrição para identificar o participante.</p>
              )}
            </div>
          )}
        </div>

        <form onSubmit={onSubmit} className="space-y-8">
          <div className="space-y-4">
            <div className="flex flex-col gap-3 md:flex-row md:items-end md:gap-4">
              <div className="flex-1 space-y-2">
                <label htmlFor="participantId" className={labelClass}>
                  ID da inscrição
                </label>
                <input
                  id="participantId"
                  {...register('participantId')}
                  className={inputClass}
                  placeholder="Cole aqui o ID recebido na inscrição"
                  onBlur={() => void refreshParticipantData()}
                />
                {errors.participantId && <p className="text-sm text-rose-200">{errors.participantId.message}</p>}
              </div>
              <button
                type="button"
                className={secondaryButtonClass}
                onClick={() => void refreshParticipantData()}
                disabled={isFetchingData}
              >
                {isFetchingData ? 'Carregando...' : 'Buscar dados'}
              </button>
            </div>
            <p className="text-sm text-white/60">
              O ID tem 24 caracteres e está no e-mail de confirmação. Sem ele não é possível atualizar a lista.
            </p>
          </div>

          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-white">Itens ({fields.length})</h3>
            <button
              type="button"
              className={secondaryButtonClass}
              onClick={() => append({ name: '', description: '', url: '', priority: 'media' })}
            >
              Adicionar item
            </button>
          </div>

          <div className="space-y-5">
            {fields.map((field, index) => (
              <div key={field.id} className="rounded-3xl border border-white/20 bg-black/20 p-6 space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <label htmlFor={`items.${index}.name`} className={labelClass}>
                      Nome do presente
                    </label>
                    <input
                      id={`items.${index}.name`}
                      {...register(`items.${index}.name` as const)}
                      className={inputClass}
                      placeholder="Ex.: Kit de pincéis"
                    />
                    {errors.items?.[index]?.name && (
                      <p className="text-sm text-rose-200">{errors.items[index]?.name?.message}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <label htmlFor={`items.${index}.priority`} className={labelClass}>
                      Prioridade
                    </label>
                    <select
                      id={`items.${index}.priority`}
                      {...register(`items.${index}.priority` as const)}
                      className={inputClass}
                    >
                      <option value="alta">Alta</option>
                      <option value="media">Média</option>
                      <option value="baixa">Baixa</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-2">
                  <label htmlFor={`items.${index}.description`} className={labelClass}>
                    Detalhes (opcional)
                  </label>
                  <textarea
                    id={`items.${index}.description`}
                    {...register(`items.${index}.description` as const)}
                    className={textareaClass}
                    placeholder="Cores preferidas, tamanhos ou observações"
                    rows={2}
                  />
                  {errors.items?.[index]?.description && (
                    <p className="text-sm text-rose-200">{errors.items[index]?.description?.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <label htmlFor={`items.${index}.url`} className={labelClass}>
                    Link (opcional)
                  </label>
                  <input
                    id={`items.${index}.url`}
                    {...register(`items.${index}.url` as const)}
                    className={inputClass}
                    placeholder="https://"
                  />
                  {errors.items?.[index]?.url && (
                    <p className="text-sm text-rose-200">{errors.items[index]?.url?.message}</p>
                  )}
                </div>

                <div className="flex justify-end">
                  <button
                    type="button"
                    className={ghostButtonClass}
                    onClick={() => remove(index)}
                    disabled={fields.length === 1}
                  >
                    Remover item
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <span className="text-sm text-white/70">
              {giftListQuery.isFetching || participantStatusQuery.isFetching
                ? 'Carregando lista...'
                : 'Salve sempre que fizer ajustes. O sorteio consulta a versão mais recente.'}
            </span>
            <button type="submit" className={primaryButtonClass} disabled={mutation.isPending}>
              {mutation.isPending ? 'Salvando...' : 'Salvar lista'}
            </button>
          </div>
        </form>
      </div>
    </FestiveCard>
  );
};

export default GiftListPage;
