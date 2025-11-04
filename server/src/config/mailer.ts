// Este ficheiro deve estar em server/src/config/mailer.ts
import nodemailer from 'nodemailer';
import { env } from './environment';

export type MailPayload = {
  to: string | string[];
  subject: string;
  html: string;
};

export interface Mailer {
  sendMail: (payload: MailPayload) => Promise<void>;
}

class ConsoleMailer implements Mailer {
  async sendMail(payload: MailPayload): Promise<void> {
    // Esta é a linha que produz o log "[Email simulado]"
    console.info('[Email simulado]', payload);
  }
}

class SmtpMailer implements Mailer {
  private transporter: nodemailer.Transporter;

  constructor() {
    this.transporter = nodemailer.createTransport({
      host: env.SMTP_HOST,
      port: env.SMTP_PORT,
      secure: env.SMTP_SECURE, // true para porta 465 (Gmail)
      auth: env.SMTP_USER
        ? {
            user: env.SMTP_USER,
            pass: env.SMTP_PASS, // A tua "senha de app" de 16 letras
          }
        : undefined,
    });
  }

  async sendMail(payload: MailPayload): Promise<void> {
    await this.transporter.sendMail({
      from: env.MAIL_FROM, // O formato deve ser "Nome" <email@exemplo.com>
      ...payload,
    });
  }
}

// Esta é a linha mais importante:
// Ele lê a variável 'env.MAILER_MODE' que vem do teu ficheiro .env
export const mailer: Mailer =
  env.MAILER_MODE === 'smtp' ? new SmtpMailer() : new ConsoleMailer();
