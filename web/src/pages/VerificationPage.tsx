import { useState } from 'react';
import { useForm, Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { api, extractErrorMessage } from '../services/api';
import Notification from '../components/Notification';
import { useNotification } from '../hooks/useNotification';
import { useParticipant } from '../context/ParticipantContext';

const verificationSchema = z.object({
  participantId: z.string().min(1, 'Informe o ID da inscrição'),
  code: z
    .string()
    .min(6, 'O código possui 6 dígitos')
    .max(6, 'O código possui 6 dígitos'),
  goingToSpain: z.enum(['true', 'false']).default('false')
});

type VerificationForm = z.infer<typeof verificationSchema>;

const VerificationPage: React.FC = () => {
  const { participant } = useParticipant();
  const { notification, show, clear } = useNotification();
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors }
  } = useForm<VerificationForm>({
    resolver: zodResolver(verificationSchema) as Resolver<VerificationForm>,
    defaultValues: {
      participantId: participant.id ?? '',
      goingToSpain: 'false'
    }
  });

  const onSubmit = handleSubmit(async (data) => {
    setLoading(true);
    clear();
    try {
      const response = await api.post('/participants/verify', {
        participantId: data.participantId,
        code: data.code,
        goingToSpain: data.goingToSpain === 'true'
      });
      const { message } = response.data as { message: string };
      show('success', message ?? 'Inscrição confirmada com sucesso.');
    } catch (error) {
      show('error', extractErrorMessage(error));
    } finally {
      setLoading(false);
    }
  });

  return (
    <div className="container" style={{ padding: '48px 0' }}>
      <div className="shadow-card" style={{ maxWidth: '640px', margin: '0 auto' }}>
        <h2 style={{ marginTop: 0 }}>Confirme seu e-mail</h2>
        <p style={{ color: '#475569' }}>
          Digite o ID recebido na conclusão da inscrição e informe o código enviado por e-mail. Você pode aproveitar este passo para atualizar se viajará para a Espanha.
        </p>

        {notification && <Notification type={notification.type} message={notification.message} onClose={clear} />}

        <form onSubmit={onSubmit} className="form-grid" style={{ marginTop: '24px' }}>
          <div>
            <label htmlFor="participantId">ID da inscrição</label>
            <input id="participantId" {...register('participantId')} placeholder="Ex.: 65f3b2c1..." />
            {errors.participantId && <small style={{ color: '#dc2626' }}>{errors.participantId.message}</small>}
          </div>

          <div>
            <label htmlFor="code">Código de verificação</label>
            <input id="code" {...register('code')} placeholder="Código de 6 dígitos" />
            {errors.code && <small style={{ color: '#dc2626' }}>{errors.code.message}</small>}
          </div>

          <div>
            <label>Atualizar presença na Espanha</label>
            <select {...register('goingToSpain')}>
              <option value="false">Ainda não tenho certeza ou participarei remoto</option>
              <option value="true">Sim, estarei na Espanha</option>
            </select>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '12px' }}>
            <button type="submit" className="primary-button" disabled={loading}>
              {loading ? 'Validando...' : 'Confirmar e-mail'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default VerificationPage;
