import { useState } from 'react';
import { useForm, useFieldArray, Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { api, extractErrorMessage } from '../services/api';
import { useNotification } from '../hooks/useNotification';
import Notification from '../components/Notification';
import { useParticipant } from '../context/ParticipantContext';

const guardianSchema = z.object({
  email: z.string().email('Informe um e-mail válido')
});

const registrationSchema = z
  .object({
    firstName: z.string().min(2, 'Informe o primeiro nome'),
    secondName: z.string().min(2, 'Informe o segundo nome'),
    nickname: z.string().optional(),
    email: z.string().email('Informe um e-mail válido').optional(),
    isChild: z.boolean(),
    primaryGuardianEmail: z.string().email('Informe um e-mail válido').optional(),
    guardians: z.array(guardianSchema).default([]),
    goingToSpain: z.boolean()
  })
  .superRefine((data, ctx) => {
    if (data.isChild) {
      if (!data.primaryGuardianEmail) {
        ctx.addIssue({ path: ['primaryGuardianEmail'], code: z.ZodIssueCode.custom, message: 'Informe o e-mail principal do responsável' });
      }
      if (data.email && data.email === data.primaryGuardianEmail) {
        ctx.addIssue({ path: ['email'], code: z.ZodIssueCode.custom, message: 'Use um e-mail diferente do responsável' });
      }
    } else if (!data.email) {
      ctx.addIssue({ path: ['email'], code: z.ZodIssueCode.custom, message: 'Informe o e-mail para contato' });
    }
  });

type RegistrationForm = z.infer<typeof registrationSchema>;

const RegistrationPage: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const { notification, show, clear } = useNotification();
  const { setParticipant } = useParticipant();

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
      goingToSpain: false
    }
  });

  const { fields, append, remove } = useFieldArray({ name: 'guardians', control });

  const isChild = watch('isChild');

  const onSubmit = handleSubmit(async (data) => {
    setLoading(true);
    clear();
    try {
      const payload = {
        firstName: data.firstName,
        secondName: data.secondName,
        nickname: data.nickname,
        email: data.isChild ? data.email || undefined : data.email,
        isChild: data.isChild,
        primaryGuardianEmail: data.isChild ? data.primaryGuardianEmail : undefined,
        guardianEmails: data.isChild
          ? [data.primaryGuardianEmail!, ...data.guardians.map(({ email }: { email: string }) => email)].filter(Boolean)
          : undefined,
        goingToSpain: data.goingToSpain
      };

      const response = await api.post('/participants', payload);
      const { id, message } = response.data as { id: string; message: string };
      setParticipant({ id, firstName: data.firstName, isChild: data.isChild });
      show('success', `${message} Guarde o código enviado para confirmar o e-mail.`);
      reset({
        isChild: data.isChild,
        goingToSpain: data.goingToSpain,
        guardians: []
      });
    } catch (error) {
      show('error', extractErrorMessage(error));
    } finally {
      setLoading(false);
    }
  });

  return (
    <div className="container" style={{ padding: '48px 0' }}>
      <div className="shadow-card" style={{ maxWidth: '760px', margin: '0 auto' }}>
        <h2 style={{ marginTop: 0 }}>Inscreva-se no Domingo Oculto</h2>
        <p style={{ color: '#475569' }}>
          Preencha seus dados principais. Adultos precisam confirmar o próprio e-mail; crianças informam os responsáveis e recebem o código no e-mail principal do responsável.
        </p>

        {notification && <Notification type={notification.type} message={notification.message} onClose={clear} />}

        <form onSubmit={onSubmit} className="form-grid" style={{ marginTop: '24px' }}>
          <div className="form-grid two-columns">
            <div>
              <label htmlFor="firstName">Primeiro nome</label>
              <input id="firstName" {...register('firstName')} placeholder="Ex.: Ana" />
              {errors.firstName && <small style={{ color: '#dc2626' }}>{errors.firstName.message}</small>}
            </div>
            <div>
              <label htmlFor="secondName">Segundo nome</label>
              <input id="secondName" {...register('secondName')} placeholder="Ex.: Beatriz" />
              {errors.secondName && <small style={{ color: '#dc2626' }}>{errors.secondName.message}</small>}
            </div>
          </div>

          <div>
            <label htmlFor="nickname">Apelido (opcional)</label>
            <input id="nickname" {...register('nickname')} placeholder="Como prefere ser chamado" />
            {errors.nickname && <small style={{ color: '#dc2626' }}>{errors.nickname.message}</small>}
          </div>

          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <input id="isChild" type="checkbox" {...register('isChild')} />
            <label htmlFor="isChild" style={{ margin: 0 }}>
              É criança? Ative para informar os responsáveis antes do e-mail.
            </label>
          </div>

          {isChild ? (
            <>
              <div>
                <label htmlFor="primaryGuardianEmail">E-mail principal do responsável</label>
                <input
                  id="primaryGuardianEmail"
                  {...register('primaryGuardianEmail')}
                  placeholder="responsavel@familia.com"
                />
                {errors.primaryGuardianEmail && (
                  <small style={{ color: '#dc2626' }}>{errors.primaryGuardianEmail.message}</small>
                )}
              </div>

              <div>
                <label htmlFor="email">E-mail da criança (opcional)</label>
                <input id="email" {...register('email')} placeholder="Se a criança tiver um e-mail próprio" />
                {errors.email && <small style={{ color: '#dc2626' }}>{errors.email.message}</small>}
              </div>

              <div>
                <h3 style={{ marginBottom: '12px' }}>Outros e-mails de responsáveis</h3>
                <p style={{ color: '#64748b', marginTop: 0 }}>
                  Todos receberão o aviso do sorteio. Só o e-mail principal precisa validar o código.
                </p>
                {fields.map((field, index) => (
                  <div key={field.id} style={{ display: 'flex', gap: '12px', marginBottom: '12px' }}>
                    <input
                      {...register(`guardians.${index}.email` as const)}
                      placeholder="responsavel2@familia.com"
                    />
                    <button
                      type="button"
                      onClick={() => remove(index)}
                      className="secondary-button"
                      style={{ whiteSpace: 'nowrap' }}
                    >
                      Remover
                    </button>
                    {errors.guardians?.[index]?.email && (
                      <small style={{ color: '#dc2626' }}>{errors.guardians[index]?.email?.message}</small>
                    )}
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => append({ email: '' })}
                  className="secondary-button"
                >
                  Adicionar e-mail
                </button>
              </div>
            </>
          ) : (
            <div>
              <label htmlFor="email">E-mail</label>
              <input id="email" {...register('email')} placeholder="voce@megacuto.com" />
              {errors.email && <small style={{ color: '#dc2626' }}>{errors.email.message}</small>}
            </div>
          )}

          <div>
            <label>Vai participar presencialmente na Espanha?</label>
            <select {...register('goingToSpain')}>
              <option value="false">Ainda não tenho certeza ou participarei remoto</option>
              <option value="true">Sim, estarei na Espanha</option>
            </select>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '12px' }}>
            <button type="submit" className="primary-button" disabled={loading}>
              {loading ? 'Enviando...' : 'Enviar inscrição'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default RegistrationPage;
