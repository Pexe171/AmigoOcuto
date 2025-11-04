import { useState } from 'react';
import { useForm, Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import FestiveCard from '../components/FestiveCard';
import { api, extractErrorMessage } from '../services/api';
import Notification from '../components/Notification';
import { useNotification } from '../hooks/useNotification';
import { useParticipant } from '../context/ParticipantContext';
import { inputClass, labelClass, primaryButtonClass, badgeClass } from '../styles/theme';

const verificationSchema = z.object({
  participantId: z.string().min(1, 'Informe o ID da inscrição'),
  code: z
    .string()
    .min(6, 'O código possui 6 dígitos')
    .max(6, 'O código possui 6 dígitos'),
  attendingInPerson: z.enum(['true', 'false']).default('false')
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
      attendingInPerson: 'false'
    }
  });

  const onSubmit = handleSubmit(async (data) => {
    setLoading(true);
    clear();
    try {
      const response = await api.post('/participants/verify', {
        participantId: data.participantId,
        code: data.code,
        attendingInPerson: data.attendingInPerson === 'true'
      });
      const { message } = response.data as { message: string };
      show('success', message ?? 'Inscrição confirmada com sucesso.');
    } catch (error) {
      show('error', extractErrorMessage(error));
    } finally {
      setLoading(false);
    }
  });

  const eyebrow = participant.contactEmail
    ? `Código enviado para ${participant.contactEmail}`
    : 'Confirmação obrigatória';

  return (
    <FestiveCard
      title="Confirme seu e-mail"
      eyebrow={eyebrow}
      description={
        <>
          <p>
            Informe o ID recebido na conclusão da inscrição e o código de 6 dígitos enviado por e-mail. Aproveite para
            atualizar a participação presencial, caso já tenha decidido.
          </p>
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

        <div className="space-y-2">
          <label className={labelClass}>Vai participar presencialmente no encontro principal?</label>
          <select {...register('attendingInPerson')} className={inputClass}>
            <option value="false">Ainda não tenho certeza ou participarei a distância</option>
            <option value="true">Sim, estarei presente fisicamente</option>
          </select>
        </div>

        <div className="flex flex-col items-start gap-3 text-sm text-white/70">
          <span className={badgeClass}>Dica</span>
          <p>
            Se não encontrar o e-mail, verifique a caixa de spam ou refaça o cadastro com o mesmo endereço para receber um novo
            código.
          </p>
        </div>

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
