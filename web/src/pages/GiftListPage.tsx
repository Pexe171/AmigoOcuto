import { useEffect, useMemo, useState } from 'react';
import { useForm, useFieldArray, Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
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
  email: z.string().email('Informe um e-mail válido'),
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

const fetchGiftList = async (email: string): Promise<GiftResponse> => {
  const response = await api.get(`/participants/by-email/${encodeURIComponent(email)}/gifts`);
  return response.data as GiftResponse;
};

const fetchParticipantStatus = async (email: string): Promise<ParticipantStatus> => {
  const response = await api.get(`/participants/by-email/${encodeURIComponent(email)}`);
  return response.data as ParticipantStatus;
};

const GiftListPage: React.FC = () => {
  const { participant } = useParticipant();
  const { notification, show, clear } = useNotification();
  const queryClient = useQueryClient();
  const [loadingParticipantData, setLoadingParticipantData] = useState(false);
  const [searchParams] = useSearchParams();
  const emailFromQuery = searchParams.get('email');

  const form = useForm<GiftListForm>({
    resolver: zodResolver(giftListSchema) as Resolver<GiftListForm>,
    defaultValues: {
      email: emailFromQuery || participant.contactEmail || '',
      items: [{ name: '', description: '', url: '', priority: 'media', price: undefined }]
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
  const participantEmail = watch('email');

  const giftListQuery = useQuery<GiftResponse, Error>({
    queryKey: ['gift-list', participantEmail],
    queryFn: async ({ queryKey }) => {
      const [, email] = queryKey as [string, string];
      return fetchGiftList(email);
    },
    enabled: false,
    retry: false
  });

  const participantStatusQuery = useQuery<ParticipantStatus, Error>({
    queryKey: ['participant-status', participantEmail],
    queryFn: async ({ queryKey }) => {
      const [, email] = queryKey as [string, string];
      return fetchParticipantStatus(email);
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
      const response = await api.put(`/participants/by-email/${encodeURIComponent(data.email)}/gifts`, {
        items: data.items.map((item) => ({
          name: item.name,
          description: item.description || undefined,
          url: item.url || undefined,
          priority: item.priority,
          price: item.price || undefined
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
          priority: item.priority ?? 'media',
          price: item.price
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

  const refreshParticipantData = async (emailFromEvent?: string): Promise<void> => {
    const rawEmail = emailFromEvent ?? participantEmail;
    const trimmed = rawEmail.trim().toLowerCase();
    if (!trimmed) {
      show('error', 'Informe o e-mail para carregar os dados.');
      return;
    }
    if (!trimmed.includes('@')) {
      show('error', 'Informe um e-mail válido.');
      return;
    }
    setValue('email', trimmed);
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
        show('success', `Dados carregados para ${status.fullName}.`);
      }
    } catch (error) {
      const errorMessage = extractErrorMessage(error);
      // Melhorar mensagem quando o participante não for encontrado
      if (errorMessage.includes('não encontrado') || errorMessage.includes('not found')) {
        show('error', 'Participante não encontrado. Verifique se o e-mail está correto e se a inscrição foi confirmada.');
      } else {
        show('error', errorMessage);
      }
    } finally {
      setLoadingParticipantData(false);
    }
  };

  useEffect(() => {
    const emailToUse = emailFromQuery || participant.contactEmail;
    if (emailToUse) {
      setValue('email', emailToUse);
      void refreshParticipantData(emailToUse);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [emailFromQuery, participant.contactEmail]);

  const onSubmit = handleSubmit((data) => {
    const trimmedEmail = data.email.trim().toLowerCase();
    if (!trimmedEmail) {
      show('error', 'Informe o e-mail para salvar a lista.');
      return;
    }
    if (!trimmedEmail.includes('@')) {
      show('error', 'Informe um e-mail válido.');
      return;
    }
    clear();
    mutation.mutate({ ...data, email: trimmedEmail });
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
            Informe o e-mail usado no cadastro para carregar sua lista de presentes.
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
                <strong>{participantStatus.fullName}</strong>{' '}
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
                  {participant.firstName}, informe o e-mail usado no cadastro para carregar sua lista.
                </p>
              ) : (
                <p>Informe o e-mail usado no cadastro para identificar o participante.</p>
              )}
            </div>
          )}
        </div>

        <form onSubmit={onSubmit} className="space-y-8">
          <div className="space-y-4">
            <div className="flex flex-col gap-3 md:flex-row md:items-end md:gap-4">
              <div className="flex-1 space-y-2">
                <label htmlFor="email" className={labelClass}>
                  E-mail do cadastro
                </label>
                <input
                  id="email"
                  type="email"
                  {...register('email')}
                  className={inputClass}
                  placeholder="seu@email.com"
                  onBlur={() => void refreshParticipantData()}
                />
                {errors.email && <p className="text-sm text-rose-200">{errors.email.message}</p>}
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
              Use o mesmo e-mail informado no cadastro. O e-mail é usado para identificar sua conta de forma segura.
            </p>
          </div>

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

