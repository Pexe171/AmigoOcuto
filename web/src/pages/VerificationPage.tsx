import { useEffect, useState } from 'react';
import { useForm, Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom'; // Added useSearchParams
import FestiveCard from '../components/FestiveCard';
import { api, extractErrorMessage } from '../services/api';
import Notification from '../components/Notification';
import { useNotification } from '../hooks/useNotification';
import { useParticipant } from '../context/ParticipantContext';
import { inputClass, labelClass, primaryButtonClass, secondaryButtonClass, badgeClass } from '../styles/theme';

// Updated schema to use email instead of participantId
const verificationSchema = z.object({
  email: z.string().email('Informe um e-mail válido.'),
  code: z
    .string()
    .min(6, 'O código possui 6 dígitos')
    .max(6, 'O código possui 6 dígitos')
});

type VerificationForm = z.infer<typeof verificationSchema>;

const updateEmailSchema = z.object({
  // participantId is no longer needed here, as email is the primary identifier
  newEmail: z.string().email('Informe um e-mail válido.')
});

type UpdateEmailForm = z.infer<typeof updateEmailSchema>;

const VerificationPage: React.FC = () => {
  const { participant, setParticipant } = useParticipant();
  const { notification, show, clear } = useNotification();
  const [loading, setLoading] = useState(false);
  const [showUpdateEmail, setShowUpdateEmail] = useState(false);
  const [updateEmailLoading, setUpdateEmailLoading] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams(); // Hook to get query parameters
  const initialEmail = searchParams.get('email') || ''; // Get email from URL

  const {
    register,
    handleSubmit,
    setValue, // Added setValue to pre-fill email
    formState: { errors }
  } = useForm<VerificationForm>({
    resolver: zodResolver(verificationSchema) as Resolver<VerificationForm>,
    defaultValues: {
      email: initialEmail, // Pre-fill email from URL
      code: ''
    }
  });

  const {
    register: registerUpdateEmail,
    handleSubmit: handleSubmitUpdateEmail,
    formState: { errors: updateEmailErrors },
    reset: resetUpdateEmail,
    setValue: setUpdateEmailValue // Added setValue for update email form
  } = useForm<UpdateEmailForm>({
    resolver: zodResolver(updateEmailSchema) as Resolver<UpdateEmailForm>,
    defaultValues: {
      newEmail: initialEmail // Pre-fill new email from URL
    }
  });

  // Set email value if it changes in the URL or context
  useEffect(() => {
    if (initialEmail) {
      setValue('email', initialEmail);
      setUpdateEmailValue('newEmail', initialEmail);
    } else if (participant.contactEmail) {
      setValue('email', participant.contactEmail);
      setUpdateEmailValue('newEmail', participant.contactEmail);
    }
  }, [initialEmail, participant.contactEmail, setValue, setUpdateEmailValue]);


  const onSubmit = handleSubmit(async (data) => {
    setLoading(true);
    clear();
    try {
      // API call now sends email and code
      const response = await api.post('/participants/verify', {
        email: data.email,
        code: data.code
      });
      // The backend response from /api/participants/verify is:
      // { id: string, emailVerified: boolean, message: string }
      const { id, emailVerified, message } = response.data as { id: string, emailVerified: boolean, message: string };
      
      // Update participant context with the ID and other relevant info
      // Note: A token is NOT returned by the /verify endpoint, so we cannot set it here.
      // The user should be redirected to the login page after successful verification.
      setParticipant({
        id: id,
        firstName: participant.firstName, // Keep existing firstName from context or fetch if needed
        isChild: participant.isChild, // Keep existing isChild from context or fetch if needed
        contactEmail: data.email, // Use the email from the form
        token: null, // No token from /verify endpoint
      });

      show('success', message ?? 'E-mail confirmado com sucesso.');
      
      // Redirect to login page after successful confirmation
      setTimeout(() => {
        navigate('/participant-login'); // Redirect to login page
      }, 1500);
    } catch (error) {
      show('error', extractErrorMessage(error));
    } finally {
      setLoading(false);
    }
  });

  const onUpdateEmail = handleSubmitUpdateEmail(async (data) => {
    setUpdateEmailLoading(true);
    clear();
    try {
      // This endpoint needs to be created/modified on the backend
      // It should receive the old email (from initialEmail or participant.contactEmail)
      // and the new email, then update the participant's email and resend a code.
      await api.put('/participants/update-email', {
        oldEmail: initialEmail || participant.contactEmail, // Send old email for identification
        newEmail: data.newEmail
      });
      
      // Update the email in the form and context
      setValue('email', data.newEmail);
      setParticipant({
        id: participant.id,
        firstName: participant.firstName,
        isChild: participant.isChild,
        contactEmail: data.newEmail,
        token: participant.token, // Keep existing token
      });
      
      show('success', 'E-mail atualizado com sucesso. Verifique o novo endereço para o código de verificação.');
      setShowUpdateEmail(false);
      resetUpdateEmail({ newEmail: data.newEmail }); // Reset form with new email
    } catch (error) {
      show('error', extractErrorMessage(error));
    } finally {
      setUpdateEmailLoading(false);
    }
  });

  useEffect(() => {
    const state = location.state as { message?: string; type?: 'success' | 'error' | 'info' } | null;
    if (state?.message) {
      show(state.type ?? 'info', state.message);
      navigate(location.pathname, { replace: true });
    }
  }, [location.pathname, location.state, navigate, show]);

  const displayEmail = initialEmail || participant.contactEmail || 'seu e-mail';
  const eyebrow = `Código enviado para ${displayEmail}`;

  return (
    <FestiveCard
      title="Confirme seu e-mail"
      eyebrow={eyebrow}
      description={
        <>
          <p>Informe o código de 6 dígitos enviado para <strong>{displayEmail}</strong>.</p>
          <p className="text-sm text-white/70">
            Se não encontrar o e-mail, verifique a caixa de spam.
          </p>
        </>
      }
      maxWidth="max-w-3xl"
    >
      {notification && <Notification type={notification.type} message={notification.message} onClose={clear} />}

      <form onSubmit={onSubmit} className="space-y-8">
        <div className="space-y-2">
          <label htmlFor="email" className={labelClass}>
            E-mail
          </label>
          <input
            id="email"
            type="email"
            {...register('email')}
            className={inputClass}
            placeholder="seu@email.com"
            autoComplete="email"
            readOnly // Make email read-only as it comes from the previous step
          />
          {errors.email && <p className="text-sm text-rose-200">{errors.email.message}</p>}
        </div>

        <div className="space-y-2">
          <label htmlFor="code" className={labelClass}>
            Código de verificação
          </label>
          <input
            id="code"
            {...register('code')}
            className={inputClass}
            placeholder="Código de 6 dígitos"
            inputMode="numeric"
            maxLength={6}
            autoComplete="one-time-code"
          />
          {errors.code && <p className="text-sm text-rose-200">{errors.code.message}</p>}
        </div>

        <div className="flex flex-col items-start gap-3 text-sm text-white/70">
          <span className={badgeClass}>Dica</span>
          <p>
            Não recebeu o código ou digitou o e-mail errado?{' '}
            <button
              type="button"
              onClick={() => setShowUpdateEmail(!showUpdateEmail)}
              className="underline hover:text-white transition"
            >
              Clique aqui para reenviar ou corrigir o e-mail.
            </button>
          </p>
        </div>

        {showUpdateEmail && (
          <div className="p-6 bg-white/10 rounded-2xl border border-white/20 space-y-4">
            <h3 className="text-lg font-semibold text-white">Corrigir e-mail</h3>
            <form onSubmit={onUpdateEmail} className="space-y-4">
              <div className="space-y-2">
                <label htmlFor="updateEmail-newEmail" className={labelClass}>
                  Novo e-mail
                </label>
                <input
                  id="updateEmail-newEmail"
                  type="email"
                  {...registerUpdateEmail('newEmail')}
                  className={inputClass}
                  placeholder="seu-email@exemplo.com"
                  autoComplete="email"
                />
                {updateEmailErrors.newEmail && (
                  <p className="text-sm text-rose-200">{updateEmailErrors.newEmail.message}</p>
                )}
              </div>

              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowUpdateEmail(false);
                    resetUpdateEmail();
                  }}
                  className={secondaryButtonClass}
                  disabled={updateEmailLoading}
                >
                  Cancelar
                </button>
                <button type="submit" className={primaryButtonClass} disabled={updateEmailLoading}>
                  {updateEmailLoading ? 'Atualizando...' : 'Atualizar e-mail'}
                </button>
              </div>
            </form>
          </div>
        )}

        <div className="flex justify-end">
          <button type="submit" className={primaryButtonClass} disabled={loading}>
            {loading ? 'Validando...' : 'Confirmar e-mail'}
          </button>
        </div>
      </form>
    </FestiveCard>
  );
};

export default VerificationPage;
