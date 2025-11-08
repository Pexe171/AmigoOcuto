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
import { inputClass, labelClass, primaryButtonClass } from '../styles/theme';

const loginSchema = z.object({
  email: z.string().email('Informe um e-mail válido.'),
  code: z.string().length(6, 'O código de verificação deve ter 6 dígitos.'),
});

type LoginForm = z.infer<typeof loginSchema>;

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
  const [loading, setLoading] = useState(false);
  const { notification, show, clear } = useNotification();
  const { setParticipant } = useParticipant();
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema) as Resolver<LoginForm>,
  });

  const onSubmit = handleSubmit(async (data) => {
    setLoading(true);
    clear();
    try {
      const response = await api.post('/participants/login', data);
      const { token, participant } = response.data as ParticipantLoginResponse;

      setParticipant({
        id: participant.id,
        firstName: participant.firstName,
        isChild: participant.isChild,
        contactEmail: participant.contactEmail ?? null,
        token: token,
        giftListAuthToken: null,
      });

      show('success', `Bem-vindo(a), ${participant.firstName}!`);
      navigate('/lista-presentes');
    } catch (error) {
      show('error', extractErrorMessage(error));
    } finally {
      setLoading(false);
    }
  });

  return (
    <FestiveCard
      title="Acesse sua lista de presentes"
      eyebrow="🔒 Login do participante"
      description="Informe o e-mail e o código de verificação que você recebeu para acessar e gerenciar sua lista de presentes."
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
          />
          {errors.code && <p className="text-sm text-rose-200">{errors.code.message}</p>}
        </div>

        <div className="flex justify-end">
          <button type="submit" className={primaryButtonClass} disabled={loading}>
            {loading ? 'Entrando...' : 'Entrar'}
          </button>
        </div>
      </form>
    </FestiveCard>
  );
};

export default ParticipantLoginPage;
