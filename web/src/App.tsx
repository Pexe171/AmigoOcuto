import React, {
  useState,
  useEffect,
  createContext,
  useContext,
  useMemo,
  useCallback,
} from 'react';
import { useForm, useFieldArray, Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import axios from 'axios';

// --- Configuração da API ---
// Mantemos a configuração da API e o helper de erro
const api = axios.create({
  baseURL: '/api',
});

type ApiError = {
  message: string;
};

const extractErrorMessage = (error: unknown): string => {
  if (axios.isAxiosError<ApiError>(error)) {
    return error.response?.data?.message ?? error.message;
  }
  if (error instanceof Error) {
    return error.message;
  }
  return 'Ocorreu um erro inesperado. Tente novamente.';
};

// --- Contexto do Participante ---
// Trazido de web/src/context/ParticipantContext.tsx
type ParticipantState = {
  id: string | null;
  firstName: string | null;
  isChild: boolean;
};

type ParticipantContextValue = {
  participant: ParticipantState;
  setParticipant: (participant: ParticipantState) => void;
  clearParticipant: () => void;
};

const defaultState: ParticipantState = {
  id: null,
  firstName: null,
  isChild: false,
};

const ParticipantContext = createContext<ParticipantContextValue | undefined>(
  undefined,
);

const STORAGE_KEY = 'amigoocuto.participant';

export const ParticipantProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [participant, setParticipantState] = useState<ParticipantState>(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        return JSON.parse(stored) as ParticipantState;
      } catch (error) {
        console.warn('Não foi possível restaurar o participante salvo', error);
      }
    }
    return defaultState;
  });

  useEffect(() => {
    if (participant.id) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(participant));
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  }, [participant]);

  const setParticipant = (next: ParticipantState): void =>
    setParticipantState(next);
  const clearParticipant = (): void => setParticipantState(defaultState);

  const value = useMemo(
    () => ({ participant, setParticipant, clearParticipant }),
    [participant],
  );

  return (
    <ParticipantContext.Provider value={value}>
      {children}
    </ParticipantContext.Provider>
  );
};

export const useParticipant = (): ParticipantContextValue => {
  const context = useContext(ParticipantContext);
  if (!context) {
    throw new Error('useParticipant deve ser utilizado dentro de ParticipantProvider');
  }
  return context;
};

// --- Sistema de Notificação ---
// Trazido de web/src/hooks/useNotification.ts e web/src/components/Notification.tsx

type NotificationType = 'success' | 'error' | 'info';

type NotificationData = {
  type: NotificationType;
  message: string;
};

const useNotification = () => {
  const [notification, setNotification] = useState<NotificationData | null>(
    null,
  );

  const show = useCallback((type: NotificationType, message: string) => {
    setNotification({ type, message });
  }, []);

  const clear = useCallback(() => setNotification(null), []);

  return { notification, show, clear };
};

type NotificationProps = {
  type: 'success' | 'error' | 'info';
  message: string;
  onClose?: () => void;
};

const Notification: React.FC<NotificationProps> = ({
  type,
  message,
  onClose,
}) => {
  useEffect(() => {
    const timeout = setTimeout(() => onClose?.(), 6000);
    return () => clearTimeout(timeout);
  }, [onClose]);

  const colors = {
    success: 'bg-green-100 border-green-400 text-green-700',
    error: 'bg-red-100 border-red-400 text-red-700',
    info: 'bg-blue-100 border-blue-400 text-blue-700',
  };

  return (
    <div
      className={`p-4 border-l-4 rounded-md shadow-md ${colors[type]}`}
      role="alert"
    >
      <div className="flex justify-between items-center">
        <div>
          <p className="font-bold capitalize">{type}</p>
          <p>{message}</p>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="ml-4 text-xl font-bold opacity-70 hover:opacity-100"
          >
            &times;
          </button>
        )}
      </div>
    </div>
  );
};

// --- Componente Decorativo: Neve ---
const Snowfall: React.FC = () => (
  <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
    {[...Array(50)].map((_, i) => (
      <div
        key={i}
        className="absolute bg-white rounded-full animate-snow"
        style={{
          width: `${Math.random() * 3 + 1}px`,
          height: `${Math.random() * 3 + 1}px`,
          left: `${Math.random() * 100}%`,
          animationDuration: `${Math.random() * 10 + 5}s`,
          animationDelay: `${Math.random() * 5}s`,
          opacity: Math.random() * 0.5 + 0.3,
        }}
      />
    ))}
    {/* Keyframes para a neve estão no styles/index.css (que vamos criar/editar) */}
  </div>
);

// --- Componente: Cabeçalho Festivo ---
const FestiveHeader: React.FC<{ onHomeClick: () => void }> = ({
  onHomeClick,
}) => (
  <header className="relative z-10 text-center py-8">
    <button
      onClick={onHomeClick}
      className="text-white transition-opacity hover:opacity-80"
    >
      <h1
        className="font-bold text-5xl md:text-6xl"
        style={{ fontFamily: "'Mountains of Christmas', cursive" }}
      >
        Amigo Oculto
      </h1>
      <p className="text-xl text-white opacity-90" style={{ fontFamily: "'Merriweather', serif" }}>
        de Natal
      </p>
    </button>
  </header>
);

// --- Tela: Página Inicial ---
const HomePage: React.FC<{ navigate: (page: string) => void }> = ({
  navigate,
}) => {
  return (
    <div className="relative z-10 flex flex-col items-center justify-center text-center p-6">
      <div className="bg-white/10 backdrop-blur-md p-8 md:p-12 rounded-2xl shadow-xl border border-white/20 max-w-lg">
        <h2 
          className="text-3xl md:text-4xl font-bold text-white mb-4"
          style={{ fontFamily: "'Merriweather', serif" }}
        >
          Bem-vindo!
        </h2>
        <p 
          className="text-lg text-white/90 mb-8"
          style={{ fontFamily: "'Merriweather', serif" }}
        >
          Participe do nosso amigo oculto de Natal. Inscreva-se ou consulte sua lista de presentes.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <button
            onClick={() => navigate('inscricao')}
            className="w-full sm:w-auto bg-white text-red-700 font-bold py-3 px-8 rounded-full shadow-lg transform transition-transform hover:scale-105"
          >
            Inscrever-se
          </button>
          <button
            onClick={() => navigate('listas')}
            className="w-full sm:w-auto bg-transparent border-2 border-white text-white font-bold py-3 px-8 rounded-full shadow-lg transform transition-transform hover:scale-105"
          >
            Consultar Lista
          </button>
        </div>
      </div>
    </div>
  );
};

// --- Tela: Inscrição (com 2 passos) ---
const registrationSchema = z
  .object({
    firstName: z.string().min(2, 'Informe o primeiro nome'),
    secondName: z.string().min(2, 'Informe o segundo nome'),
    nickname: z.string().optional(),
    email: z.string().email('Informe um e-mail válido').optional(),
    isChild: z.boolean(),
    primaryGuardianEmail: z.string().email('Informe um e-mail válido').optional(),
    guardianEmails: z
      .array(z.object({ email: z.string().email('E-mail inválido') }))
      .default([]),
  })
  .superRefine((data, ctx) => {
    if (data.isChild) {
      if (!data.primaryGuardianEmail) {
        ctx.addIssue({
          path: ['primaryGuardianEmail'],
          code: z.ZodIssueCode.custom,
          message: 'Informe o e-mail principal do responsável',
        });
      }
    } else if (!data.email) {
      ctx.addIssue({
        path: ['email'],
        code: z.ZodIssueCode.custom,
        message: 'Informe o e-mail para contato',
      });
    }
  });

type RegistrationForm = z.infer<typeof registrationSchema>;

const verificationSchema = z.object({
  code: z
    .string()
    .min(6, 'O código possui 6 dígitos')
    .max(6, 'O código possui 6 dígitos'),
});
type VerificationForm = z.infer<typeof verificationSchema>;

const RegistrationPage: React.FC<{ navigate: (page: string) => void }> = ({
  navigate,
}) => {
  const [step, setStep] = useState<'form' | 'verify'>('form');
  const [loading, setLoading] = useState(false);
  const [participantIdForVerify, setParticipantIdForVerify] = useState<string | null>(null);
  const { notification, show, clear } = useNotification();
  const { setParticipant } = useParticipant();

  // --- Formulário de Inscrição ---
  const regForm = useForm<RegistrationForm>({
    resolver: zodResolver(registrationSchema) as Resolver<RegistrationForm>,
    defaultValues: {
      isChild: false,
      guardianEmails: [],
    },
  });
  const { fields, append, remove } = useFieldArray({
    name: 'guardianEmails',
    control: regForm.control,
  });
  const isChild = regForm.watch('isChild');

  const onRegistrationSubmit = regForm.handleSubmit(async (data) => {
    setLoading(true);
    clear();
    try {
      const payload = {
        firstName: data.firstName,
        secondName: data.secondName,
        nickname: data.nickname || undefined,
        email: data.isChild ? data.email || undefined : data.email,
        isChild: data.isChild,
        primaryGuardianEmail: data.isChild ? data.primaryGuardianEmail : undefined,
        guardianEmails: data.isChild
          ? [
              data.primaryGuardianEmail!,
              ...data.guardianEmails.map(({ email }) => email),
            ].filter(Boolean)
          : undefined,
        attendingInPerson: false, // O outro form fazia isto, vamos manter simples
      };

      const response = await api.post('/participants', payload);
      const { id, message } = response.data as { id: string; message: string };
      
      setParticipant({ id, firstName: data.firstName, isChild: data.isChild });
      setParticipantIdForVerify(id);
      show('success', message);
      setStep('verify'); // Avança para o passo 2
    } catch (error) {
      show('error', extractErrorMessage(error));
    } finally {
      setLoading(false);
    }
  });

  // --- Formulário de Verificação ---
  const verifyForm = useForm<VerificationForm>({
    resolver: zodResolver(verificationSchema) as Resolver<VerificationForm>,
  });

  const onVerificationSubmit = verifyForm.handleSubmit(async (data) => {
    setLoading(true);
    clear();
    try {
      await api.post('/participants/verify', {
        participantId: participantIdForVerify,
        code: data.code,
      });
      show('success', 'E-mail confirmado com sucesso! Boas festas!');
      // Atraso para o utilizador ler a mensagem antes de navegar
      setTimeout(() => {
        navigate('home');
      }, 2000);
    } catch (error) {
      show('error', extractErrorMessage(error));
    } finally {
      setLoading(false);
    }
  });

  return (
    <div className="relative z-10 flex flex-col items-center p-6">
      <div className="w-full max-w-2xl bg-white p-8 md:p-10 rounded-2xl shadow-2xl">
        {step === 'form' && (
          <>
            <h2 className="text-3xl font-bold text-gray-800 mb-6 text-center" style={{ fontFamily: "'Merriweather', serif" }}>
              Formulário de Inscrição
            </h2>
            {notification && (
              <div className="mb-4">
                <Notification
                  type={notification.type}
                  message={notification.message}
                  onClose={clear}
                />
              </div>
            )}
            <form onSubmit={onRegistrationSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  id="firstName"
                  label="Primeiro nome"
                  register={regForm.register('firstName')}
                  error={regForm.formState.errors.firstName?.message}
                />
                <Input
                  id="secondName"
                  label="Segundo nome"
                  register={regForm.register('secondName')}
                  error={regForm.formState.errors.secondName?.message}
                />
              </div>
              <Input
                id="nickname"
                label="Apelido (opcional)"
                register={regForm.register('nickname')}
                error={regForm.formState.errors.nickname?.message}
                placeholder="Como prefere ser chamado"
              />
              <Checkbox
                id="isChild"
                label="É criança? (será necessário e-mail de um responsável)"
                register={regForm.register('isChild')}
              />

              {isChild ? (
                <div className="space-y-4 p-4 border rounded-lg bg-gray-50">
                  <Input
                    id="primaryGuardianEmail"
                    label="E-mail Principal do Responsável"
                    register={regForm.register('primaryGuardianEmail')}
                    error={regForm.formState.errors.primaryGuardianEmail?.message}
                    placeholder="O código de verificação será enviado para este e-mail"
                  />
                  <Input
                    id="email"
                    label="E-mail da Criança (opcional)"
                    register={regForm.register('email')}
                    error={regForm.formState.errors.email?.message}
                  />
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Outros responsáveis (opcional)
                    </label>
                    {fields.map((field, index) => (
                      <div key={field.id} className="flex gap-2 mb-2">
                        <input
                          id={`guardianEmails.${index}.email`}
                          register={regForm.register(
                            `guardianEmails.${index}.email` as const,
                          )}
                          error={
                            regForm.formState.errors.guardianEmails?.[index]
                              ?.email?.message
                          }
                          placeholder="outro.responsavel@email.com"
                        />
                        <button
                          type="button"
                          onClick={() => remove(index)}
                          className="px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600"
                        >
                          &times;
                        </button>
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={() => append({ email: '' })}
                      className="text-sm bg-green-100 text-green-700 py-1 px-3 rounded-md hover:bg-green-200"
                    >
                      + Adicionar outro e-mail
                    </button>
                  </div>
                </div>
              ) : (
                <Input
                  id="email"
                  label="Seu E-mail"
                  register={regForm.register('email')}
                  error={regForm.formState.errors.email?.message}
                  placeholder="O código de verificação será enviado para si"
                />
              )}

              <div className="flex gap-4">
                <Button
                  type="button"
                  onClick={() => navigate('home')}
                  variant="secondary"
                >
                  Voltar
                </Button>
                <Button type="submit" variant="primary" loading={loading}>
                  Inscrever e ir para Verificação
                </Button>
              </div>
            </form>
          </>
        )}

        {step === 'verify' && (
           <form onSubmit={onVerificationSubmit} className="space-y-6">
            <h2 className="text-3xl font-bold text-gray-800 mb-6 text-center" style={{ fontFamily: "'Merriweather', serif" }}>
              Verifique o seu E-mail
            </h2>
            <p className="text-center text-gray-600">
              Enviámos um código de 6 dígitos para o e-mail principal. Cole-o abaixo para confirmar a sua inscrição.
            </p>
             {notification && (
              <div className="mb-4">
                <Notification
                  type={notification.type}
                  message={notification.message}
                  onClose={clear}
                />
              </div>
            )}
            <Input
              id="code"
              label="Código de Verificação"
              register={verifyForm.register('code')}
              error={verifyForm.formState.errors.code?.message}
              placeholder="123456"
            />
            <div className="flex gap-4">
              <Button
                type="button"
                onClick={() => setStep('form')}
                variant="secondary"
              >
                Voltar ao formulário
              </Button>
              <Button type="submit" variant="primary" loading={loading}>
                Confirmar Inscrição
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

// --- Tela: Lista de Presentes ---
const giftSchema = z.object({
  name: z.string().min(2, 'Descreva o presente'),
  description: z.string().optional(),
  url: z.string().url('Informe um link válido').optional().or(z.literal('')),
  priority: z.enum(['alta', 'media', 'baixa']).default('media'),
});

const giftListSchema = z.object({
  participantId: z.string().min(1, 'Informe o ID da inscrição'),
  items: z.array(giftSchema).min(1, 'Adicione pelo menos um item').max(50),
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

const GiftListPage: React.FC<{ navigate: (page: string) => void }> = ({
  navigate,
}) => {
  const { participant } = useParticipant();
  const { notification, show, clear } = useNotification();

  const form = useForm<GiftListForm>({
    resolver: zodResolver(giftListSchema) as Resolver<GiftListForm>,
    defaultValues: {
      participantId: participant.id ?? '',
      items: [{ name: '', description: '', url: '', priority: 'media' }],
    },
  });

  const {
    register,
    control,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = form;

  const { fields, append, remove, replace } = useFieldArray({
    control,
    name: 'items',
  });
  const participantId = watch('participantId');

  const giftListQuery = useQuery<GiftResponse, Error>({
    queryKey: ['gift-list', participantId],
    queryFn: async () => {
      const response = await api.get(`/participants/${participantId}/gifts`);
      return response.data as GiftResponse;
    },
    enabled: !!participantId, // Ativa a query se houver um participantId
    retry: false,
  });

  // Efeito para carregar a lista quando o ID do participante estiver disponível
  useEffect(() => {
    if (participant.id) {
      setValue('participantId', participant.id);
    }
  }, [participant.id, setValue]);

  // Efeito para preencher o formulário com dados da query
  useEffect(() => {
    const data = giftListQuery.data;
    if (data) {
      if (!data.items.length) {
        replace([{ name: '', description: '', url: '', priority: 'media' }]);
      } else {
        replace(
          data.items.map((item) => ({
            name: item.name,
            description: item.description ?? '',
            url: item.url ?? '',
            priority: item.priority ?? 'media',
          })),
        );
      }
    }
  }, [giftListQuery.data, replace]);

  // Efeito para mostrar erros da query
  useEffect(() => {
    if (giftListQuery.error) {
      show('error', extractErrorMessage(giftListQuery.error));
    }
  }, [giftListQuery.error, show]);

  const mutation = useMutation<GiftResponse, Error, GiftListForm>({
    mutationFn: async (data) => {
      const response = await api.put(
        `/participants/${data.participantId}/gifts`,
        {
          items: data.items.map((item) => ({
            name: item.name,
            description: item.description || undefined,
            url: item.url || undefined,
            priority: item.priority,
          })),
        },
      );
      return response.data as GiftResponse;
    },
    onSuccess: (data) => {
      show('success', 'Lista salva com sucesso.');
      // Atualiza o formulário com os dados salvos (garante consistência)
      replace(
        data.items.map((item) => ({
          name: item.name,
          description: item.description ?? '',
          url: item.url ?? '',
          priority: item.priority ?? 'media',
        })),
      );
    },
    onError: (error) => show('error', extractErrorMessage(error)),
  });

  const onSubmit = handleSubmit((data) => {
    clear();
    mutation.mutate(data);
  });

  return (
    <div className="relative z-10 flex flex-col items-center p-6">
      <div className="w-full max-w-3xl bg-white p-8 md:p-10 rounded-2xl shadow-2xl">
        <h2 className="text-3xl font-bold text-gray-800 mb-6 text-center" style={{ fontFamily: "'Merriweather', serif" }}>
          Minha Lista de Presentes
        </h2>
        {notification && (
          <div className="mb-4">
            <Notification
              type={notification.type}
              message={notification.message}
              onClose={clear}
            />
          </div>
        )}
        <form onSubmit={onSubmit} className="space-y-6">
          <Input
            id="participantId"
            label="ID da Inscrição"
            register={register('participantId')}
            error={errors.participantId?.message}
            placeholder="Cole o ID recebido no e-mail"
          />

          <div className="flex justify-between items-center">
            <h3 className="text-xl font-semibold text-gray-700" style={{ fontFamily: "'Merriweather', serif" }}>Itens ({fields.length})</h3>
            <Button
              type="button"
              onClick={() =>
                append({
                  name: '',
                  description: '',
                  url: '',
                  priority: 'media',
                })
              }
              variant="secondary"
            >
              + Adicionar Item
            </Button>
          </div>

          <div className="space-y-4 max-h-96 overflow-y-auto pr-2">
            {fields.map((field, index) => (
              <div
                key={field.id}
                className="p-4 border rounded-lg bg-gray-50 space-y-4"
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input
                    id={`items.${index}.name`}
                    label="Nome do Presente"
                    register={register(`items.${index}.name` as const)}
                    error={errors.items?.[index]?.name?.message}
                    placeholder="Ex: Livro de Culinária"
                  />
                  <Select
                    id={`items.${index}.priority`}
                    label="Prioridade"
                    register={register(`items.${index}.priority` as const)}
                    error={errors.items?.[index]?.priority?.message}
                    options={[
                      { value: 'media', label: 'Média' },
                      { value: 'alta', label: 'Alta' },
                      { value: 'baixa', label: 'Baixa' },
                    ]}
                  />
                </div>
                <Input
                  id={`items.${index}.url`}
                  label="Link (opcional)"
                  register={register(`items.${index}.url` as const)}
                  error={errors.items?.[index]?.url?.message}
                  placeholder="https://"
                />
                <TextArea
                  id={`items.${index}.description`}
                  label="Detalhes (opcional)"
                  register={register(`items.${index}.description` as const)}
                  error={errors.items?.[index]?.description?.message}
                  placeholder="Cor, tamanho, etc."
                />
                <div className="text-right">
                  <Button
                    type="button"
                    onClick={() => remove(index)}
                    variant="danger"
                  >
                    Remover
                  </Button>
                </div>
              </div>
            ))}
          </div>
           <div className="flex gap-4 pt-4 border-t">
            <Button
              type="button"
              onClick={() => navigate('home')}
              variant="secondary"
            >
              Voltar
            </Button>
            <Button
              type="submit"
              variant="primary"
              loading={mutation.isPending || giftListQuery.isFetching}
            >
              {mutation.isPending ? 'Salvando...' : (giftListQuery.isFetching ? 'Carregando...' : 'Salvar Lista')}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

// --- Componentes de UI Genéricos ---
const Input: React.FC<{
  id: string;
  label: string;
  register: any;
  error?: string;
  [key: string]: any;
}> = ({ id, label, register, error, ...rest }) => (
  <div className="w-full">
    <label htmlFor={id} className="block text-sm font-medium text-gray-700 mb-1">
      {label}
    </label>
    <input
      id={id}
      {...register}
      {...rest}
      className={`block w-full px-3 py-2 border rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-red-500 focus:border-red-500 sm:text-sm ${
        error ? 'border-red-500' : 'border-gray-300'
      }`}
    />
    {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
  </div>
);

const TextArea: React.FC<{
  id: string;
  label: string;
  register: any;
  error?: string;
  [key: string]: any;
}> = ({ id, label, register, error, ...rest }) => (
  <div className="w-full">
    <label htmlFor={id} className="block text-sm font-medium text-gray-700 mb-1">
      {label}
    </label>
    <textarea
      id={id}
      {...register}
      {...rest}
      rows={2}
      className={`block w-full px-3 py-2 border rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-red-500 focus:border-red-500 sm:text-sm ${
        error ? 'border-red-500' : 'border-gray-300'
      }`}
    />
    {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
  </div>
);

const Select: React.FC<{
  id: string;
  label: string;
  register: any;
  error?: string;
  options: { value: string; label: string }[];
  [key: string]: any;
}> = ({ id, label, register, error, options, ...rest }) => (
  <div className="w-full">
    <label htmlFor={id} className="block text-sm font-medium text-gray-700 mb-1">
      {label}
    </label>
    <select
      id={id}
      {...register}
      {...rest}
      className={`block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-red-500 focus:border-red-500 sm:text-sm ${
        error ? 'border-red-500' : 'border-gray-300'
      }`}
    >
      {options.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
    {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
  </div>
);

const Checkbox: React.FC<{
  id: string;
  label: string;
  register: any;
  [key: string]: any;
}> = ({ id, label, register, ...rest }) => (
  <div className="flex items-center">
    <input
      id={id}
      type="checkbox"
      {...register}
      {...rest}
      className="h-4 w-4 text-red-600 border-gray-300 rounded focus:ring-red-500"
    />
    <label htmlFor={id} className="ml-2 block text-sm text-gray-900">
      {label}
    </label>
  </div>
);

const Button: React.FC<{
  type: 'button' | 'submit';
  onClick?: () => void;
  variant: 'primary' | 'secondary' | 'danger';
  loading?: boolean;
  children: React.ReactNode;
}> = ({ type, onClick, variant, loading, children }) => {
  const baseStyle =
    'w-full flex justify-center py-3 px-6 border border-transparent rounded-full shadow-sm text-base font-medium transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-offset-2';
  
  const styles = {
    primary: 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500',
    secondary: 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50 focus:ring-red-500',
    danger: 'bg-red-100 text-red-700 hover:bg-red-200 focus:ring-red-500',
  };
  
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={loading}
      className={`${baseStyle} ${styles[variant]} ${
        loading ? 'opacity-50 cursor-not-allowed' : ''
      }`}
    >
      {loading ? (
        <svg
          className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          ></circle>
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          ></path>
        </svg>
      ) : null}
      {children}
    </button>
  );
};

// --- Componente Principal da Aplicação ---
function App() {
  const [page, setPage] = useState('home');

  const navigate = (pageName: string) => {
    window.scrollTo(0, 0); // Rola para o topo ao mudar de página
    setPage(pageName);
  };

  return (
    <>
      {/* Importa as fontes de Natal */}
      <style>
        {`
          @import url('https://fonts.googleapis.com/css2?family=Mountains+of+Christmas:wght@400;700&family=Merriweather:wght@400;700&display=swap');
          
          @keyframes fall {
            0% { transform: translateY(-100px); opacity: 1; }
            100% { transform: translateY(100vh); opacity: 0; }
          }
          .animate-snow {
            animation: fall linear infinite;
          }
        `}
      </style>

      {/* O QueryClientProvider e o ParticipantProvider vêm do main.tsx
        mas como estamos a refatorar tudo para um ficheiro,
        vamos movê-los para cá.
      */}
        <div className="relative min-h-screen w-full bg-gradient-to-br from-red-800 to-red-900 overflow-x-hidden">
          <Snowfall />
          <FestiveHeader onHomeClick={() => navigate('home')} />
          <main>
            {page === 'home' && <HomePage navigate={navigate} />}
            {page === 'inscricao' && <RegistrationPage navigate={navigate} />}
            {page === 'listas' && <GiftListPage navigate={navigate} />}
          </main>
          <footer className="relative z-10 text-center py-6 mt-12">
            <p className="text-sm text-white/50" style={{ fontFamily: "'Merriweather', serif" }}>
              Feito com 🎄 por David.
            </p>
          </footer>
        </div>
    </>
  );
}

export default App;
