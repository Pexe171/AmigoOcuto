import dotenv from 'dotenv';
import { z, ZodIssueCode } from 'zod';

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.string().default('development'),
  PORT: z.coerce.number().default(4000),
  MONGO_URI: z.string().default('mongodb://127.0.0.1:27017/amigoocuto'),
  MONGO_IN_MEMORY: z
    .enum(['true', 'false'])
    .default('false')
    .transform((value) => value === 'true'),
  ADMIN_TOKEN: z.string().default('admin-token'),
  MAILER_MODE: z.enum(['smtp', 'console']).default('console'),
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().optional(),
  SMTP_SECURE: z
    .enum(['true', 'false'])
    .optional()
    .transform((value) => (value ? value === 'true' : undefined)),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  MAIL_FROM: z.string().optional()
}).superRefine((data, ctx) => {
  if (data.MAILER_MODE === 'smtp') {
    if (!data.SMTP_HOST) {
      ctx.addIssue({
        code: ZodIssueCode.custom,
        message: 'SMTP_HOST é obrigatório quando MAILER_MODE for smtp',
        path: ['SMTP_HOST']
      });
    }

    if (!data.SMTP_PORT) {
      ctx.addIssue({
        code: ZodIssueCode.custom,
        message: 'SMTP_PORT é obrigatório quando MAILER_MODE for smtp',
        path: ['SMTP_PORT']
      });
    }

    if (data.SMTP_SECURE === undefined) {
      ctx.addIssue({
        code: ZodIssueCode.custom,
        message: 'SMTP_SECURE é obrigatório quando MAILER_MODE for smtp',
        path: ['SMTP_SECURE']
      });
    }

    if (!data.MAIL_FROM || !data.MAIL_FROM.trim()) {
      ctx.addIssue({
        code: ZodIssueCode.custom,
        message: 'MAIL_FROM é obrigatório quando MAILER_MODE for smtp',
        path: ['MAIL_FROM']
      });
    }
  }
});

type Env = z.infer<typeof envSchema>;

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('Falha ao validar variáveis de ambiente:', parsed.error.flatten().fieldErrors);
  throw new Error('Variáveis de ambiente inválidas. Confira o arquivo .env.');
}

export const env: Env = parsed.data;
