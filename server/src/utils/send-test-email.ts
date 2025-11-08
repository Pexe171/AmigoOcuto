
// Este ficheiro deve estar em server/src/utils/send-test-email.ts
import { env } from '../config/environment';
import { mailer } from '../config/mailer';

async function sendTestEmail() {
  console.log('Disparando e-mail de teste...');
  console.log(`Modo do mailer: ${env.MAILER_MODE}`);

  if (env.MAILER_MODE !== 'smtp') {
    console.log('O sistema não está configurado para usar SMTP. Altere a variável MAILER_MODE no ficheiro .env para "smtp"');
    return;
  }

  try {
    await mailer.sendMail({
      to: 'teste@example.com',
      subject: 'Teste de SMTP do Amigo Oculto',
      html: '<p>Este é um e-mail de teste para verificar a configuração do SMTP.</p>',
    });
    console.log('E-mail de teste enviado com sucesso!');
  } catch (error) {
    console.error('Ocorreu um erro ao enviar o e-mail de teste:', error);
  }
}

sendTestEmail();
