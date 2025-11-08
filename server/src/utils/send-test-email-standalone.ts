
// Este ficheiro deve estar em server/src/utils/send-test-email-standalone.ts
import nodemailer from 'nodemailer';

// --- Configuração de Email ---
const MAILER_MODE = 'smtp'; // Forçando o modo SMTP para o teste

// --- Configuração para GMAIL (Requer "Senha de app") ---
const SMTP_HOST = 'smtp.gmail.com';
const SMTP_PORT = 465;
const SMTP_SECURE = true;

// PREENCHA COM OS SEUS DADOS REAIS
const SMTP_USER = 'o-teu-email@gmail.com';
const SMTP_PASS = 'a-tua-senha-de-app-de-16-letras';
const MAIL_FROM = '"Amigo Oculto" o-teu-email@gmail.com';

async function sendTestEmail() {
  console.log('Disparando e-mail de teste autônomo...');
  console.log(`Modo do mailer: ${MAILER_MODE}`);

  if (MAILER_MODE !== 'smtp') {
    console.log('O sistema não está configurado para usar SMTP.');
    return;
  }

  const transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: SMTP_PORT,
    secure: SMTP_SECURE,
    auth: {
      user: SMTP_USER,
      pass: SMTP_PASS,
    },
  });

  try {
    await transporter.sendMail({
      from: MAIL_FROM,
      to: 'teste@example.com',
      subject: 'Teste de SMTP do Amigo Oculto (Autônomo)',
      html: '<p>Este é um e-mail de teste para verificar a configuração do SMTP.</p>',
    });
    console.log('E-mail de teste enviado com sucesso!');
  } catch (error) {
    console.error('Ocorreu um erro ao enviar o e-mail de teste:', error);
  }
}

sendTestEmail();
