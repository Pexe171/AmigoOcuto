import { useEffect } from 'react';
import { useForm, useFieldArray, Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQuery } from '@tanstack/react-query';
import { api, extractErrorMessage } from '../services/api';
import { useNotification } from '../hooks/useNotification';
import Notification from '../components/Notification';
import { useParticipant } from '../context/ParticipantContext';

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

const GiftListPage: React.FC = () => {
  const { participant } = useParticipant();
  const { notification, show, clear } = useNotification();

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
    queryFn: async () => {
      const response = await api.get(`/participants/${participantId}/gifts`);
      return response.data as GiftResponse;
    },
    enabled: false,
    retry: false
  });

  useEffect(() => {
    if (participant.id) {
      setValue('participantId', participant.id);
      void giftListQuery.refetch();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [participant.id]);

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

  useEffect(() => {
    if (giftListQuery.error) {
      show('error', extractErrorMessage(giftListQuery.error));
    }
  }, [giftListQuery.error, show]);

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

  const onSubmit = handleSubmit((data) => {
    clear();
    mutation.mutate(data);
  });

  return (
    <div className="container" style={{ padding: '48px 0' }}>
      <div className="shadow-card" style={{ maxWidth: '860px', margin: '0 auto' }}>
        <h2 style={{ marginTop: 0 }}>Monte sua lista de presentes</h2>
        <p style={{ color: '#475569' }}>
          Adicione quantos itens desejar, informando prioridade, detalhes e links para facilitar a compra de quem te sortear.
        </p>

        {notification && <Notification type={notification.type} message={notification.message} onClose={clear} />}

        <form onSubmit={onSubmit} className="form-grid" style={{ marginTop: '24px' }}>
          <div>
            <label htmlFor="participantId">ID da inscrição</label>
            <input
              id="participantId"
              {...register('participantId')}
              placeholder="Cole aqui o ID recebido na inscrição"
              onBlur={() => {
                if (participantId) {
                  void giftListQuery.refetch();
                }
              }}
            />
            {errors.participantId && <small style={{ color: '#dc2626' }}>{errors.participantId.message}</small>}
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ margin: 0 }}>Itens ({fields.length})</h3>
            <button
              type="button"
              className="secondary-button"
              onClick={() => append({ name: '', description: '', url: '', priority: 'media' })}
            >
              Adicionar item
            </button>
          </div>

          {fields.map((field, index) => (
            <div key={field.id} className="shadow-card" style={{ padding: '24px', background: '#f8fafc' }}>
              <div className="form-grid two-columns">
                <div>
                  <label htmlFor={`items.${index}.name`}>Nome do presente</label>
                  <input
                    id={`items.${index}.name`}
                    {...register(`items.${index}.name` as const)}
                    placeholder="Ex.: Kit de pincéis"
                  />
                  {errors.items?.[index]?.name && (
                    <small style={{ color: '#dc2626' }}>{errors.items[index]?.name?.message}</small>
                  )}
                </div>
                <div>
                  <label htmlFor={`items.${index}.priority`}>Prioridade</label>
                  <select id={`items.${index}.priority`} {...register(`items.${index}.priority` as const)}>
                    <option value="alta">Alta</option>
                    <option value="media">Média</option>
                    <option value="baixa">Baixa</option>
                  </select>
                </div>
              </div>

              <div>
                <label htmlFor={`items.${index}.description`}>Detalhes (opcional)</label>
                <textarea
                  id={`items.${index}.description`}
                  {...register(`items.${index}.description` as const)}
                  placeholder="Cores preferidas, tamanhos ou observações"
                  rows={2}
                />
                {errors.items?.[index]?.description && (
                  <small style={{ color: '#dc2626' }}>{errors.items[index]?.description?.message}</small>
                )}
              </div>

              <div>
                <label htmlFor={`items.${index}.url`}>Link (opcional)</label>
                <input id={`items.${index}.url`} {...register(`items.${index}.url` as const)} placeholder="https://" />
                {errors.items?.[index]?.url && (
                  <small style={{ color: '#dc2626' }}>{errors.items[index]?.url?.message}</small>
                )}
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <button type="button" className="secondary-button" onClick={() => remove(index)}>
                  Remover
                </button>
              </div>
            </div>
          ))}

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ color: '#64748b' }}>
              {giftListQuery.isFetching
                ? 'Carregando lista...'
                : 'Sempre que salvar enviaremos a versão atualizada para o sorteio.'}
            </span>
            <button type="submit" className="primary-button" disabled={mutation.isPending}>
              {mutation.isPending ? 'Salvando...' : 'Salvar lista'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default GiftListPage;
