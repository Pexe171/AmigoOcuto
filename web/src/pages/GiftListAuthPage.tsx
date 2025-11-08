import { useState } from 'react';
import { useForm, Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate } from 'react-router-dom';
import FestiveCard from '../components/FestiveCard';
import { api, extractErrorMessage } from '../services/api';
import { useNotification } from '../hooks/useNotification';
import Notification from '../components/Notification';
import { useParticipant } from '../context/ParticipantContext';
import { inputClass, labelClass, primaryButtonClass, secondaryButtonClass } from '../styles/theme';

const authSchema = z.object({
  email: z.string().email('Informe um e-mail válido.'),
  code: z.string().length(6, 'O código de verificação deve ter 6 dígitos.'),
});

type AuthForm = z.infer<typeof authSchema>;

const GiftListAuthPage: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [requestingCode, setRequestingCode] = useState(false);
  const { notification, show, clear } = useNotification();
  const { participant, setParticipant } = useParticipant();
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    getValues,
    setValue,
    formState: { errors },
  } = useForm<AuthForm>({
    resolver: zodResolver(authSchema) as Resolver<AuthForm>,
    defaultValues: {
      email: participant.contactEmail || '',
      code: '',
    },
  });

  const onRequestCode = async () => {
    const email = getValues('email');
    if (!email) {
      show('error', 'Por favor, informe um e-mail para solicitar o código.');
      return;
    }
    setRequestingCode(true);
    clear();
    try {
      await api.post('/participants/request-verification-code', { email });
      show('success', 'Um novo código foi enviado para o seu e-mail.');
    } catch (error) {
      show('error', extractErrorMessage(error));
    } finally {
      setRequestingCode(false);
    }
  };

  const onSubmit = handleSubmit(async (data) => {
    setLoading(true);
    clear();
    try {
      // This will be a new backend endpoint for re-authentication
      const response = await api.post('/participants/reauthenticate-for-giftlist', data);
      const { message, giftListAuthToken } = response.data as { message: string, giftListAuthToken: string };

      // Update participant context with the new giftListAuthToken
      setParticipant(prev => ({
        ...prev,
        giftListAuthToken: giftListAuthToken,
      }));

      show('success', message ?? 'Acesso à lista de presentes autorizado!');
      navigate('/listas'); // Redirect to the gift list page
    } catch (error) {
      show('error', extractErrorMessage(error));
    } finally {
      setLoading(false);
    }
  });

  return (
    <FestiveCard
      title="Acesso à Lista de Presentes"
      eyebrow="🔒 Confirmação de Segurança"
      description="Para sua segurança, por favor, confirme seu e-mail e código para acessar sua lista de presentes."
      maxWidth="max-w-md"
    >
      {notification && <Notification type={notification.type} message={notification.message} onClose={clear} />}

      <form onSubmit={onSubmit} className="space-y-6">
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
            readOnly={!!participant.contactEmail} // Make read-only if email is already in context
          />
          {errors.email && <p className="text-sm text-rose-200">{errors.email.message}</p>}
        </div>

        <div className="space-y-2">
          <label htmlFor="code" className={labelClass}>
            Código de verificação
          </label>
          <input
            id="code"
            type="text"
            {...register('code')}
            className={inputClass}
            placeholder="XXXXXX"
            maxLength={6}
            autoComplete="one-time-code"
          />
          {errors.code && <p className="text-sm text-rose-200">{errors.code.message}</p>}
        </div>

        <div className="flex justify-between items-center">
          <button
            type="button"
            onClick={onRequestCode}
            className={secondaryButtonClass}
            disabled={requestingCode || loading}
          >
            {requestingCode ? 'Enviando Código...' : 'Solicitar Novo Código'}
          </button>
          <button type="submit" className={primaryButtonClass} disabled={loading || requestingCode}>
            {loading ? 'Verificando...' : 'Acessar Lista'}
          </button>
        </div>
      </form>
    </FestiveCard>
  );
};

export default GiftListAuthPage;
