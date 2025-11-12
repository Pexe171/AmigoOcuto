import { useEffect, useMemo, useState } from 'react';
import { useForm, useFieldArray, Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate } from 'react-router-dom';
import FestiveCard from '../components/FestiveCard';
import { api, extractErrorMessage } from '../services/api';
import { useNotification } from '../hooks/useNotification';
import Notification from '../components/Notification';
import { useParticipant } from '../context/ParticipantContext';
import {
  inputClass,
  labelClass,
  checkboxClass,
  primaryButtonClass,
  secondaryButtonClass,
  ghostButtonClass
} from '../styles/theme';

const guardianSchema = z.object({
  email: z.string().email('Informe um e-mail válido')
});

type EventOption = {
  id: string;
  name: string;
  location?: string | null;
  status: string;
  participantCount: number;
  createdAt?: string;
};

const registrationSchema = z
  .object({
    fullName: z
      .string()
      .trim()
      .min(3, 'Informe o nome completo')
      .max(120, 'O nome pode ter até 120 caracteres'),
    email: z.string().email('Informe um e-mail válido').optional(),
    isChild: z.boolean(),
    primaryGuardianEmail: z.string().email('Informe um e-mail válido').optional(),
    guardians: z.array(guardianSchema).default([]),
    eventId: z
      .union([z.string().trim().regex(/^[0-9a-fA-F]{24}$/), z.literal('')])
      .optional()
      .transform((value) => (value && value.length > 0 ? value : undefined)),
  })
  .superRefine((data, ctx) => {
    if (data.isChild) {
      if (!data.primaryGuardianEmail) {
        ctx.addIssue({
          path: ['primaryGuardianEmail'],
          code: z.ZodIssueCode.custom,
          message: 'Informe o e-mail principal do responsável'
        });
      }
      if (data.email && data.email === data.primaryGuardianEmail) {
        ctx.addIssue({
          path: ['email'],
          code: z.ZodIssueCode.custom,
          message: 'Use um e-mail diferente do responsável'
        });
      }
    } else if (!data.email) {
      ctx.addIssue({
        path: ['email'],
        code: z.ZodIssueCode.custom,
        message: 'Informe o e-mail para contato'
      });
    }
  });

type RegistrationForm = z.infer<typeof registrationSchema>;

const RegistrationPage: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [recentRegistration, setRecentRegistration] = useState<{ id: string; fullName: string; contactEmail: string | null } | null>(
    null
  );
  const [availableEvents, setAvailableEvents] = useState<EventOption[]>([]);
  const [eventsLoading, setEventsLoading] = useState(true);
  const [eventsError, setEventsError] = useState<string | null>(null);
  const { notification, show, clear } = useNotification();
  const { setParticipant } = useParticipant();
  const navigate = useNavigate();

  const {
    register,
    control,
    handleSubmit,
    watch,
    formState: { errors },
    reset
  } = useForm<RegistrationForm>({
    resolver: zodResolver(registrationSchema) as Resolver<RegistrationForm>,
    defaultValues: {
      isChild: false,
      guardians: [],
      eventId: undefined,
    }
  });

  const { fields, append, remove } = useFieldArray({ name: 'guardians', control });

  const isChild = watch('isChild');
  const fullNameValue = watch('fullName');

  const firstNameFromForm = useMemo(() => {
    if (!fullNameValue) {
      return '';
    }
    const [first] = fullNameValue.trim().split(/\s+/);
    return first ?? '';
  }, [fullNameValue]);

  useEffect(() => {
    let isMounted = true;

    const loadEvents = async (): Promise<void> => {
      setEventsLoading(true);
      setEventsError(null);
      try {
        const response = await api.get('/events');
        if (!isMounted) {
          return;
        }
        const events = (response.data as EventOption[]).map((event) => ({
          id: event.id,
          name: event.name,
          location: event.location ?? null,
          status: event.status,
          participantCount: event.participantCount ?? 0,
        }));
        setAvailableEvents(events);
      } catch (error) {
        if (isMounted) {
          console.error('Erro ao carregar eventos disponíveis:', error);
          setEventsError('Não foi possível carregar as festas disponíveis agora. Tente novamente mais tarde.');
        }
      } finally {
        if (isMounted) {
          setEventsLoading(false);
        }
      }
    };

    void loadEvents();

    return () => {
      isMounted = false;
    };
  }, []);

  const onSubmit = handleSubmit(
    async (data) => {
      console.log('Formulário submetido com dados:', data);
      setLoading(true);
      clear();
      try {
        const payload: Record<string, unknown> = {
          fullName: data.fullName,
          email: data.isChild ? data.email || undefined : data.email,
          isChild: data.isChild,
          primaryGuardianEmail: data.isChild ? data.primaryGuardianEmail : undefined,
          guardianEmails: data.isChild
            ? [data.primaryGuardianEmail!, ...data.guardians.map(({ email }: { email: string }) => email)].filter(Boolean)
            : undefined
        };

        if (data.eventId) {
          payload.eventId = data.eventId;
        }

        const response = await api.post('/participants', payload);
        const { id, message } = response.data as { id: string; message: string };
        const contactEmail = data.isChild ? data.primaryGuardianEmail ?? null : data.email ?? null;
        setParticipant({
          id,
          firstName: firstNameFromForm || data.fullName,
          isChild: data.isChild,
          contactEmail,
          token: null,
          giftListAuthToken: null,
        });
        setRecentRegistration({ id, fullName: data.fullName, contactEmail });
        reset({
          isChild: data.isChild,
          guardians: [],
          fullName: '',
          email: '',
          primaryGuardianEmail: '',
          eventId: undefined,
        });
        // Redirecionar automaticamente para a página de verificação do código
        const successMessage = contactEmail
          ? `${message} Código enviado para ${contactEmail}. Anote o ID: ${id}.`
          : `${message} Anote o ID: ${id}.`;
        navigate('/confirmacao', {
          state: {
            type: 'success' as const,
            message: successMessage
          }
        });
      } catch (error) {
        show('error', extractErrorMessage(error));
      } finally {
        setLoading(false);
      }
    },
    (errors) => {
      // Callback de erro de validação
      console.error('Erros de validação:', errors);
      const firstError = Object.values(errors)[0];
      if (firstError?.message) {
        show('error', firstError.message);
      } else {
        show('error', 'Por favor, preencha todos os campos obrigatórios corretamente.');
      }
    }
  );

  return (
    <FestiveCard
      title="Inscreva-se no Amigo Ocuto"
      eyebrow="🎁 Cadastro principal"
      description={
        <>
          <p>
            Preencha seus dados para garantir participação no sorteio de Natal. Adultos confirmam o próprio e-mail.
            Crianças cadastram um responsável principal e podem incluir outros contatos para serem notificados.
          </p>
          <p>Após o envio, você receberá o ID da inscrição e o código de verificação por e-mail.</p>
        </>
      }
      maxWidth="max-w-4xl"
    >
      {notification && <Notification type={notification.type} message={notification.message} onClose={clear} />}

      {recentRegistration && (
        <div className="rounded-2xl border border-white/20 bg-black/25 p-5 text-white/85 space-y-2 text-sm">
          <p className="text-white/70 uppercase tracking-[0.25em] text-xs">Inscrição enviada agora</p>
          <p>
            <strong>{recentRegistration.fullName}</strong> · ID:{' '}
            <span className="font-mono text-sm bg-black/40 px-2 py-1 rounded-lg ml-1">{recentRegistration.id}</span>
          </p>
          {recentRegistration.contactEmail ? (
            <p>
              Código de verificação enviado para: <strong>{recentRegistration.contactEmail}</strong>
            </p>
          ) : (
            <p>Anote este ID para confirmar o e-mail e montar sua lista de presentes.</p>
          )}
        </div>
      )}

      <form onSubmit={onSubmit} className="space-y-8">
        <div className="space-y-2">
          <label htmlFor="fullName" className={labelClass}>
            Nome completo
          </label>
          <input id="fullName" {...register('fullName')} className={inputClass} placeholder="Digite o nome e sobrenome" />
          {errors.fullName && <p className="text-sm text-rose-200">{errors.fullName.message}</p>}
        </div>

        {!eventsLoading && availableEvents.length > 0 && (
          <div className="space-y-2">
            <label htmlFor="eventId" className={labelClass}>
              Escolha a festa (opcional)
            </label>
            <select id="eventId" {...register('eventId')} defaultValue="" className={inputClass}>
              <option value="">Quero participar de qualquer festa disponível</option>
              {availableEvents.map((event) => {
                const participantLabel = event.participantCount === 1
                  ? '1 participante confirmado'
                  : `${event.participantCount} participantes confirmados`;
                return (
                  <option key={event.id} value={event.id}>
                    {event.name} · {participantLabel}
                    {event.location ? ` · Local: ${event.location}` : ''}
                  </option>
                );
              })}
            </select>
            <p className="text-sm text-white/70">
              Se preferir, deixe em branco e nossa equipe encaixa você automaticamente. Quando disponível, mostramos o local da festa ao lado do nome.
            </p>
          </div>
        )}

        {eventsError && (
          <p className="text-sm text-rose-200">
            {eventsError}
          </p>
        )}

        <div className="flex flex-col gap-3 rounded-2xl border border-white/20 bg-black/25 p-5 text-white/85">
          <label htmlFor="isChild" className="flex items-start gap-4">
            <input id="isChild" type="checkbox" {...register('isChild')} className={checkboxClass} />
            <span>
              <strong className="block text-white">É criança?</strong>
              <span className="text-sm text-white/70">
                Ative para informar o responsável principal e outros contatos. O código será enviado ao responsável.
              </span>
            </span>
          </label>
        </div>

        {isChild ? (
          <div className="space-y-6">
            <div className="space-y-2">
              <label htmlFor="primaryGuardianEmail" className={labelClass}>
                E-mail principal do responsável
              </label>
              <input
                id="primaryGuardianEmail"
                {...register('primaryGuardianEmail')}
                className={inputClass}
                placeholder="responsavel@familia.com"
              />
              {errors.primaryGuardianEmail && (
                <p className="text-sm text-rose-200">{errors.primaryGuardianEmail.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <label htmlFor="email" className={labelClass}>
                E-mail da criança (opcional)
              </label>
              <input
                id="email"
                {...register('email')}
                className={inputClass}
                placeholder="Se a criança tiver um e-mail próprio"
              />
              {errors.email && <p className="text-sm text-rose-200">{errors.email.message}</p>}
            </div>

            <div className="space-y-4 rounded-2xl border border-white/20 bg-black/20 p-5">
              <div className="flex flex-col gap-2">
                <span className="text-white font-semibold">Outros e-mails de responsáveis</span>
                <p className="text-sm text-white/70">
                  Todos os responsáveis listados recebem as notificações do sorteio. Apenas o e-mail principal precisa validar o
                  código.
                </p>
              </div>

              <div className="space-y-4">
                {fields.map((field, index) => (
                  <div key={field.id} className="flex flex-col gap-2 md:flex-row md:items-center md:gap-4">
                    <input
                      {...register(`guardians.${index}.email` as const)}
                      className={`${inputClass} md:flex-1`}
                      placeholder="responsavel2@familia.com"
                    />
                    <button
                      type="button"
                      onClick={() => remove(index)}
                      className={ghostButtonClass}
                    >
                      Remover
                    </button>
                    {errors.guardians?.[index]?.email && (
                      <p className="text-sm text-rose-200">{errors.guardians[index]?.email?.message}</p>
                    )}
                  </div>
                ))}
              </div>

              <button type="button" onClick={() => append({ email: '' })} className={secondaryButtonClass}>
                Adicionar e-mail
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            <label htmlFor="email" className={labelClass}>
              E-mail
            </label>
            <input id="email" {...register('email')} className={inputClass} placeholder="voce@amigoocuto.com" />
            {errors.email && <p className="text-sm text-rose-200">{errors.email.message}</p>}
          </div>
        )}

        <div className="flex justify-end">
          <button
            type="submit"
            className={primaryButtonClass}
            disabled={loading}
            onClick={() => {
              console.log('Botão clicado, loading:', loading);
              // Não prevenir o default - deixar o handleSubmit fazer o trabalho
            }}
          >
            {loading ? 'Enviando...' : 'Enviar inscrição'}
          </button>
        </div>
      </form>
    </FestiveCard>
  );
};

export default RegistrationPage;
