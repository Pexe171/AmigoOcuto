import { useEffect, useMemo, useState } from 'react';
import { useForm, useFieldArray, Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
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
  priority: z.enum(['alta', 'media', 'baixa']).default('media'),
  price: z
    .union([z.string(), z.number()])
    .optional()
    .transform((val) => {
      if (val === '' || val === undefined || val === null) return undefined;
      const num = typeof val === 'string' ? parseFloat(val.replace(',', '.')) : val;
      if (isNaN(num)) return undefined;
      return num;
    })
    .pipe(
      z
        .number()
        .min(0, 'O valor não pode ser negativo')
        .max(50, 'O valor máximo permitido é R$ 50,00')
        .optional()
    )
});

const giftListSchema = z.object({
  items: z.array(giftSchema).min(1, 'Adicione pelo menos um item').max(50)
});

type GiftListForm = z.infer<typeof giftListSchema>;

type GiftResponse = {
  items: {
    name: string;
    description?: string;
    url?: string;
    priority?: 'alta' | 'media' | 'baixa';
    price?: number;
  }[];
};

type ParticipantStatus = {
  id: string;
  firstName: string;
  secondName: string;
  fullName: string;
  email?: string;
  primaryGuardianEmail?: string;
  guardianEmails: string[];
  emailVerified: boolean;
  isChild: boolean;
  attendingInPerson?: boolean;
  contactEmail?: string | null;
  createdAt?: string;
};

const GiftListPage: React.FC = () => {
  const { participant, clearParticipant } = useParticipant();
  const { notification, show, clear } = useNotification();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const authHeaders = useMemo(() => (participant.token ? { Authorization: `Bearer ${participant.token}` } : {}), [participant.token]);
  const axiosAuthConfig = useMemo(() => ({ headers: authHeaders }), [authHeaders]);

  const form = useForm<GiftListForm>({
    resolver: zodResolver(giftListSchema) as Resolver<GiftListForm>,
    defaultValues: {
      items: [{ name: '', description: '', url: '', priority: 'media', price: undefined }]
    }
  });

  const {
    control,
    handleSubmit,
    watch,
    formState: { errors }
  } = form;

  const { fields, append, remove, replace } = useFieldArray({ control, name: 'items' });

  // Redirect if not authenticated
  useEffect(() => {
    if (!participant.token) {
      navigate('/login');
    }
  }, [participant.token, navigate]);

  // Fetch participant status and gift list for the authenticated participant
  const participantStatusQuery = useQuery<ParticipantStatus, Error>({
    queryKey: ['participant-status', participant.id],
    queryFn: async () => {
      if (!participant.id) {
        throw new Error('ID do participante não disponível.');
      }
      const response = await api.get(`/participants/${participant.id}`, axiosAuthConfig);
      return response.data as ParticipantStatus;
    },
    enabled: Boolean(participant.id && participant.token),
    retry: false,
    onError: (error) => {
      if (axios.isAxiosError(error) && error.response?.status === 401) {
        clearParticipant();
        navigate('/login');
      }
      show('error', extractErrorMessage(error));
    }
  });

  const giftListQuery = useQuery<GiftResponse, Error>({
    queryKey: ['gift-list', participant.id],
    queryFn: async () => {
      if (!participant.id) {
        throw new Error('ID do participante não disponível.');
      }
      const response = await api.get(`/participants/${participant.id}/gifts`, axiosAuthConfig);
      return response.data as GiftResponse;
    },
    enabled: Boolean(participant.id && participant.token),
    retry: false,
    onError: (error) => {
      if (axios.isAxiosError(error) && error.response?.status === 401) {
        clearParticipant();
        navigate('/login');
      }
      show('error', extractErrorMessage(error));
    }
  });

  useEffect(() => {
    const data = giftListQuery.data;
    if (!data) {
      return;
    }
    if (!data.items.length) {
      replace([{ name: '', description: '', url: '', priority: 'media', price: undefined }]);
    } else {
      replace(
        data.items.map((item) => ({
          name: item.name,
          description: item.description ?? '',
          url: item.url ?? '',
          priority: item.priority ?? 'media',
          price: item.price
        }))
      );
    }
  }, [giftListQuery.data, replace]);

  const mutation = useMutation<GiftResponse, Error, GiftListForm>({
    mutationFn: async (data) => {
      if (!participant.id) {
        throw new Error('ID do participante não disponível.');
      }
      const response = await api.put(`/participants/${participant.id}/gifts`, {
        items: data.items.map((item) => ({
          name: item.name,
          description: item.description || undefined,
          url: item.url || undefined,
          priority: item.priority,
          price: item.price || undefined
        }))
      }, axiosAuthConfig);
      return response.data as GiftResponse;
    },
    onSuccess: (data) => {
      show('success', 'Lista salva com sucesso.');
      replace(
        data.items.map((item) => ({
          name: item.name,
          description: item.description ?? '',
          url: item.url ?? '',
          priority: item.priority ?? 'media',
          price: item.price
        }))
      );
    },
    onError: (error) => {
      if (axios.isAxiosError(error) && error.response?.status === 401) {
        clearParticipant();
        navigate('/login');
      }
      show('error', extractErrorMessage(error));
    }
  });

  const participantStatus = participantStatusQuery.data;

  const isFetchingData = giftListQuery.isFetching || participantStatusQuery.isFetching;

  const onSubmit = handleSubmit((data) => {
    clear();
    mutation.mutate(data);
  });

  if (!participant.token) {
    return null; // Or a loading spinner, as the redirect will happen in useEffect
  }

  if (participantStatusQuery.isLoading || giftListQuery.isLoading) {
    return (
      <FestiveCard title="Carregando sua lista..." eyebrow="🎄">
        <p className="text-white/80 text-center">Aguarde enquanto buscamos seus dados.</p>
      </FestiveCard>
    );
  }

  if (participantStatusQuery.isError || giftListQuery.isError) {
    return (
      <FestiveCard title="Erro ao carregar lista" eyebrow="⚠️">
        <p className="text-rose-200 text-center">Não foi possível carregar sua lista de presentes. Por favor, tente novamente mais tarde.</p>
        <button onClick={() => navigate('/login')} className={primaryButtonClass}>
          Fazer login novamente
        </button>
      </FestiveCard>
    );
  }

  if (!participantStatus?.emailVerified) {
    return (
      <FestiveCard title="E-mail não verificado" eyebrow="⚠️">
        <p className="text-white/80 text-center">Seu e-mail ainda não foi verificado. Por favor, verifique seu e-mail para acessar a lista de presentes.</p>
        <button onClick={() => navigate('/confirmacao')} className={primaryButtonClass}>
          Verificar e-mail
        </button>
      </FestiveCard>
    );
  }

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
                <strong>{participantStatus.fullName}</strong> ·{' '}
                {participantStatus.isChild ? 'Criança' : 'Adulto'}
              </p>
              {participantStatus.contactEmail && (
                <p>
                  E-mail principal para códigos: <strong>{participantStatus.contactEmail}</strong>
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
              <p>
                Carregando dados do participante...
              </p>
            </div>
          )}
        </div>

        <form onSubmit={onSubmit} className="space-y-8">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-white">Itens ({fields.length})</h3>
            <button
              type="button"
              className={secondaryButtonClass}
              onClick={() => append({ name: '', description: '', url: '', priority: 'media', price: undefined })}
            >
              ➕ Adicionar item
            </button>
          </div>

          <div className="space-y-5">
            {fields.map((field, index) => {
              const priceValue = watch(`items.${index}.price`);
              const priceError = errors.items?.[index]?.price;
              const priceExceeds = priceValue !== undefined && priceValue !== null && priceValue > 50;
              
              return (
              <div key={field.id} className="rounded-3xl border border-white/20 bg-black/20 p-6 space-y-4">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-sm font-medium text-white/80">Item {index + 1}</h4>
                  {fields.length > 1 && (
                    <button
                      type="button"
                      className={ghostButtonClass + " text-sm"}
                      onClick={() => remove(index)}
                    >
                      🗑️ Remover
                    </button>
                  )}
                </div>
                
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <label htmlFor={`items.${index}.name`} className={labelClass}>
                      Nome do presente <span className="text-rose-300">*</span>
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

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <label htmlFor={`items.${index}.price`} className={labelClass}>
                      Valor (R$) <span className="text-white/60 text-xs">(máximo R$ 50,00)</span>
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white/60">R$</span>
                      <input
                        id={`items.${index}.price`}
                        type="number"
                        step="0.01"
                        min="0"
                        max="50"
                        {...register(`items.${index}.price` as const, {
                          valueAsNumber: true,
                          validate: (value) => {
                            if (value === undefined || value === null) return true;
                            const num = typeof value === 'number' ? value : parseFloat(String(value));
                            if (isNaN(num)) return true;
                            if (num < 0) return 'O valor não pode ser negativo';
                            if (num > 50) return 'O valor máximo permitido é R$ 50,00';
                            return true;
                          }
                        })}
                        className={inputClass + " pl-10 " + (priceExceeds || priceError ? "border-rose-400 focus:border-rose-500" : "")}
                        placeholder="0,00"
                      />
                    </div>
                    {priceExceeds && (
                      <p className="text-sm text-rose-300 font-medium">
                        ⚠️ O valor máximo permitido é R$ 50,00
                      </p>
                    )}
                    {priceError && !priceExceeds && (
                      <p className="text-sm text-rose-200">{priceError.message}</p>
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
              </div>
            );
            })}
          </div>

          <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 mb-4">
            <p className="text-sm text-amber-200 flex items-start gap-2">
              <span className="text-lg">⚠️</span>
              <span>
                <strong>Importante:</strong> Os presentes não podem ter valor maior que <strong>R$ 50,00</strong>. 
                Itens com valor acima do limite não serão salvos.
              </span>
            </p>
          </div>

          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <span className="text-sm text-white/70">
              {isFetchingData
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
