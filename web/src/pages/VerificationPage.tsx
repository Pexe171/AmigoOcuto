import { useEffect, useState } from 'react';
import { useForm, Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useLocation, useNavigate } from 'react-router-dom';
import FestiveCard from '../components/FestiveCard';
import { api, extractErrorMessage } from '../services/api';
import Notification from '../components/Notification';
import { useNotification } from '../hooks/useNotification';
import { useParticipant } from '../context/ParticipantContext';
import { inputClass, labelClass, primaryButtonClass, secondaryButtonClass, badgeClass } from '../styles/theme';

const verificationSchema = z.object({
  participantId: z.string().min(1, 'Informe o ID da inscrição'),
  code: z
    .string()
    .min(6, 'O código possui 6 dígitos')
    .max(6, 'O código possui 6 dígitos')
});

type VerificationForm = z.infer<typeof verificationSchema>;

const updateEmailSchema = z.object({
  participantId: z.string().min(1, 'Informe o ID da inscrição'),
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

  const {
    register,
    handleSubmit,
    formState: { errors }
  } = useForm<VerificationForm>({
    resolver: zodResolver(verificationSchema) as Resolver<VerificationForm>,
    defaultValues: {
      participantId: participant.id ?? ''
    }
  });

  const {
    register: registerUpdateEmail,
    handleSubmit: handleSubmitUpdateEmail,
    formState: { errors: updateEmailErrors },
    reset: resetUpdateEmail
  } = useForm<UpdateEmailForm>({
    resolver: zodResolver(updateEmailSchema) as Resolver<UpdateEmailForm>,
    defaultValues: {
      participantId: participant.id ?? '',
      newEmail: ''
    }
  });

  const onSubmit = handleSubmit(async (data) => {
    setLoading(true);
    clear();
    try {
      const response = await api.post('/participants/verify', {
        participantId: data.participantId,
        code: data.code
      });
      const { message } = response.data as { message: string };
      show('success', message ?? 'Inscrição confirmada com sucesso.');
      
      // Redirecionar para a página de lista de presentes após confirmação bem-sucedida
      // Usa o email do participante do contexto ou busca do status
      const contactEmail = participant.contactEmail;
      if (contactEmail) {
        // Pequeno delay para mostrar a mensagem de sucesso
        setTimeout(() => {
          navigate(`/listas?email=${encodeURIComponent(contactEmail)}`);
        }, 1500);
      } else {
        // Se não tiver email no contexto, redireciona sem parâmetro
        setTimeout(() => {
          navigate('/listas');
        }, 1500);
      }
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
      const response = await api.put('/participants/update-email', {
        participantId: data.participantId,
        newEmail: data.newEmail
      });
      const { message } = response.data as { message: string };
      
      // Atualizar o contexto do participante com o novo email
      setParticipant({
        id: participant.id,
        firstName: participant.firstName,
        isChild: participant.isChild,
        contactEmail: data.newEmail
      });
      
      show('success', message ?? 'E-mail atualizado com sucesso. Verifique o novo endereço para o código de verificação.');
      setShowUpdateEmail(false);
      resetUpdateEmail();
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

  const eyebrow = participant.contactEmail
    ? `Código enviado para ${participant.contactEmail}`
    : 'Confirmação obrigatória';

  return (
    <FestiveCard
      title="Confirme seu e-mail"
      eyebrow={eyebrow}
      description={
        <>
          <p>Informe o ID recebido na conclusão da inscrição e o código de 6 dígitos enviado por e-mail.</p>
          <p className="text-sm text-white/70">
            {participant.id
              ? 'Utilize o ID que mostramos ao final do cadastro. Se perdeu, refaça a inscrição para gerar um novo código.'
              : 'Salve o ID exibido após o cadastro para retornar aqui rapidamente.'}
          </p>
        </>
      }
      maxWidth="max-w-3xl"
    >
      {notification && <Notification type={notification.type} message={notification.message} onClose={clear} />}

      <form onSubmit={onSubmit} className="space-y-8">
        <div className="space-y-2">
          <label htmlFor="participantId" className={labelClass}>
            ID da inscrição
          </label>
          <input
            id="participantId"
            {...register('participantId')}
            className={inputClass}
            placeholder="Ex.: 65f3b2c1..."
            autoComplete="off"
            readOnly={!!(participant.id || participant.contactEmail)}
          />
          {errors.participantId && <p className="text-sm text-rose-200">{errors.participantId.message}</p>}
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
            Se não encontrar o e-mail, verifique a caixa de spam ou{' '}
            <button
              type="button"
              onClick={() => setShowUpdateEmail(!showUpdateEmail)}
              className="underline hover:text-white transition"
            >
              corrija o e-mail
            </button>
            {' '}para receber um novo código.
          </p>
        </div>

        {showUpdateEmail && (
          <div className="p-6 bg-white/10 rounded-2xl border border-white/20 space-y-4">
            <h3 className="text-lg font-semibold text-white">Corrigir e-mail</h3>
            <form onSubmit={onUpdateEmail} className="space-y-4">
              <div className="space-y-2">
                <label htmlFor="updateEmail-participantId" className={labelClass}>
                  ID da inscrição
                </label>
                <input
                  id="updateEmail-participantId"
                  {...registerUpdateEmail('participantId')}
                  className={inputClass}
                  placeholder="Ex.: 65f3b2c1..."
                  autoComplete="off"
                  readOnly={!!(participant.id || participant.contactEmail)}
                />
                {updateEmailErrors.participantId && (
                  <p className="text-sm text-rose-200">{updateEmailErrors.participantId.message}</p>
                )}
              </div>

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
