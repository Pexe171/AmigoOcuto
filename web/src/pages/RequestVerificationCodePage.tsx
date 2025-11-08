import { useState } from 'react';
import { useForm, Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate } from 'react-router-dom';
import FestiveCard from '../components/FestiveCard';
import { api, extractErrorMessage } from '../services/api';
import { useNotification } from '../hooks/useNotification';
import Notification from '../components/Notification';
import { inputClass, labelClass, primaryButtonClass } from '../styles/theme';

// Schema for email input only
const emailSchema = z.object({
  email: z.string().email('Informe um e-mail válido.'),
});

type EmailForm = z.infer<typeof emailSchema>;

const RequestVerificationCodePage: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const { notification, show, clear } = useNotification();
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<EmailForm>({
    resolver: zodResolver(emailSchema) as Resolver<EmailForm>,
  });

  const onSubmit = handleSubmit(async (data) => {
    setLoading(true);
    clear();
    try {
      // This is a new API endpoint to request a verification code
      // We need to ensure this endpoint exists on the backend
      await api.post('/participants/request-verification-code', { email: data.email });
      
      show('success', 'Código de verificação enviado para o seu e-mail!');
      // Navigate to the verification page, passing the email as a state or query param
      navigate(`/confirmacao?email=${data.email}`);
    } catch (error) {
      show('error', extractErrorMessage(error));
    } finally {
      setLoading(false);
    }
  });

  return (
    <FestiveCard
      title="Acesse sua conta"
      eyebrow="🔒 Verificação de e-mail"
      description="Informe seu e-mail para receber um código de verificação e acessar sua lista de presentes."
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

        <div className="flex justify-end">
          <button type="submit" className={primaryButtonClass} disabled={loading}>
            {loading ? 'Enviando...' : 'Receber código'}
          </button>
        </div>
      </form>
    </FestiveCard>
  );
};

export default RequestVerificationCodePage;
