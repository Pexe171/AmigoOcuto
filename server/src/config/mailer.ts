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
    console.info('[Email simulado]', payload);
  }
}

class SmtpMailer implements Mailer {
  private transporter: nodemailer.Transporter;

  constructor() {
    this.transporter = nodemailer.createTransport({
      host: env.SMTP_HOST,
      port: env.SMTP_PORT,
      secure: env.SMTP_SECURE,
      auth: env.SMTP_USER
        ? {
            user: env.SMTP_USER,
            pass: env.SMTP_PASS
          }
        : undefined
    });
  }

  async sendMail(payload: MailPayload): Promise<void> {
    await this.transporter.sendMail({
      from: env.MAIL_FROM,
      ...payload
    });
  }
}

export const mailer: Mailer = env.MAILER_MODE === 'smtp' ? new SmtpMailer() : new ConsoleMailer();
