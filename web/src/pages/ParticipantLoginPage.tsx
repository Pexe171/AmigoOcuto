import { useEffect, useState } from 'react';
import { useForm, Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import FestiveCard from '../components/FestiveCard';
import { api, extractErrorMessage } from '../services/api';
import { useNotification } from '../hooks/useNotification';
import Notification from '../components/Notification';
import { useParticipant } from '../context/ParticipantContext';
import { inputClass, labelClass, primaryButtonClass, secondaryButtonClass } from '../styles/theme';

const emailOnlySchema = z.object({
  email: z.string().email('Informe um e-mail válido.'),
});

const codeSchema = z.object({
  code: z.string().length(6, 'O código de verificação deve ter 6 dígitos.'),
});

type EmailForm = z.infer<typeof emailOnlySchema>;
type CodeForm = z.infer<typeof codeSchema>;

type ParticipantLoginResponse = {
  message: string;
  token: string;
  participant: {
    id: string;
    firstName: string;
    fullName: string;
    email?: string;
    isChild: boolean;
    emailVerified: boolean;
    contactEmail?: string;
  };
};

const ParticipantLoginPage: React.FC = () => {
  const [step, setStep] = useState<'email' | 'code'>('email');
  const [emailForLogin, setEmailForLogin] = useState('');
  const [requestingCode, setRequestingCode] = useState(false);
  const [confirmingCode, setConfirmingCode] = useState(false);
  const { notification, show, clear } = useNotification();
  const { participant, setParticipant } = useParticipant();
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const emailForm = useForm<EmailForm>({
    resolver: zodResolver(emailOnlySchema) as Resolver<EmailForm>,
    defaultValues: { email: '' },
  });

  const codeForm = useForm<CodeForm>({
    resolver: zodResolver(codeSchema) as Resolver<CodeForm>,
    defaultValues: { code: '' },
  });

  useEffect(() => {
    if (participant.id) {
      navigate('/listas');
    }
  }, [participant.id, navigate]);

  useEffect(() => {
    const state = location.state as { message?: string; type?: 'success' | 'error' | 'info' } | null;
    if (state?.message) {
      show(state.type ?? 'info', state.message);
      navigate(location.pathname, { replace: true });
    }
  }, [location.pathname, location.state, navigate, show]);

  useEffect(() => {
    const emailParam = searchParams.get('email');
    if (emailParam) {
      const normalized = emailParam.trim().toLowerCase();
      setEmailForLogin(normalized);
      setStep('code');
      emailForm.reset({ email: normalized });
      codeForm.reset({ code: '' });
    }
  }, [searchParams, emailForm, codeForm]);

  const handleCodeRequest = emailForm.handleSubmit(async ({ email }) => {
    setRequestingCode(true);
    clear();
    const normalized = email.trim().toLowerCase();
    try {
      await api.post('/participants/request-verification-code', { email: normalized });
      setEmailForLogin(normalized);
      codeForm.reset({ code: '' });
      setStep('code');
      show('success', 'Código enviado! Verifique sua caixa de entrada ou o spam.');
    } catch (error) {
      show('error', extractErrorMessage(error));
    } finally {
      setRequestingCode(false);
    }
  });

  const handleCodeConfirmation = codeForm.handleSubmit(async ({ code }) => {
    const normalizedEmail = emailForLogin.trim().toLowerCase();
    if (!normalizedEmail) {
      show('error', 'Informe o e-mail utilizado para solicitar o código.');
      return;
    }

    setConfirmingCode(true);
    clear();
    try {
      const response = await api.post('/participants/login', { email: normalizedEmail, code });
      const { participant: participantData } = response.data as ParticipantLoginResponse;

      setParticipant({
        id: participantData.id,
        firstName: participantData.firstName,
        isChild: participantData.isChild,
        contactEmail: participantData.contactEmail ?? participantData.email ?? null,
        giftListAuthToken: null,
      });

      show('success', `Bem-vindo(a), ${participantData.firstName}!`);
      navigate('/listas');
    } catch (error) {
      show('error', extractErrorMessage(error));
    } finally {
      setConfirmingCode(false);
    }
  });

  const handleChangeEmail = (): void => {
    setStep('email');
    setEmailForLogin('');
    codeForm.reset({ code: '' });
  };

  const handleResendCode = async (): Promise<void> => {
    if (!emailForLogin) {
      show('error', 'Informe o e-mail para solicitar um novo código.');
      return;
    }
    setRequestingCode(true);
    clear();
    try {
      await api.post('/participants/request-verification-code', { email: emailForLogin });
      codeForm.reset({ code: '' });
      show('success', 'Um novo código foi enviado. Dê uma olhada no seu e-mail!');
    } catch (error) {
      show('error', extractErrorMessage(error));
    } finally {
      setRequestingCode(false);
    }
  };

  const emailErrors = emailForm.formState.errors;
  const codeErrors = codeForm.formState.errors;

  return (
    <FestiveCard
      title="Acesse sua lista de presentes"
      eyebrow="🔒 Login do participante"
      description="Primeiro solicitamos seu e-mail para enviar um código temporário. Depois de confirmar o código, você consegue editar a sua lista exclusiva."
      maxWidth="max-w-xl"
    >
      {notification && <Notification type={notification.type} message={notification.message} onClose={clear} />}

      {step === 'email' && (
        <form onSubmit={handleCodeRequest} className="space-y-6">
          <div className="space-y-2">
            <label htmlFor="email" className={labelClass}>
              E-mail cadastrado
            </label>
            <input
              id="email"
              type="email"
              {...emailForm.register('email')}
              className={inputClass}
              placeholder="seu@email.com"
            />
            {emailErrors.email && <p className="text-sm text-rose-200">{emailErrors.email.message}</p>}
          </div>

          <p className="text-sm text-white/70">
            O código chega apenas para endereços já confirmados durante a inscrição. Caso ainda não tenha validado seu e-mail, finalize a confirmação em <strong>/confirmacao</strong> antes de seguir.
          </p>

          <div className="flex justify-end">
            <button type="submit" className={primaryButtonClass} disabled={requestingCode}>
              {requestingCode ? 'Enviando código...' : 'Enviar código' }
            </button>
          </div>
        </form>
      )}

      {step === 'code' && (
        <form onSubmit={handleCodeConfirmation} className="space-y-6">
          <div className="space-y-2">
            <label htmlFor="confirm-email" className={labelClass}>
              E-mail utilizado
            </label>
            <input
              id="confirm-email"
              type="email"
              value={emailForLogin}
              readOnly
              className={`${inputClass} bg-white/40 text-red-900 font-semibold cursor-not-allowed`}
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="code" className={labelClass}>
              Código de verificação
            </label>
            <input
              id="code"
              type="text"
              maxLength={6}
              {...codeForm.register('code')}
              className={inputClass}
              placeholder="XXXXXX"
            />
            {codeErrors.code && <p className="text-sm text-rose-200">{codeErrors.code.message}</p>}
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex gap-2">
              <button type="button" onClick={handleChangeEmail} className={secondaryButtonClass}>
                Alterar e-mail
              </button>
              <button type="button" onClick={handleResendCode} className={secondaryButtonClass} disabled={requestingCode}>
                {requestingCode ? 'Reenviando...' : 'Reenviar código'}
              </button>
            </div>
            <button type="submit" className={primaryButtonClass} disabled={confirmingCode}>
              {confirmingCode ? 'Confirmando...' : 'Acessar lista'}
            </button>
          </div>
        </form>
      )}
    </FestiveCard>
  );
};

export default ParticipantLoginPage;
