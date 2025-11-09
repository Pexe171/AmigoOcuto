# Amigo Ocuto

Plataforma profissional para organizar o seu encontro de amigo oculto. O projeto combina uma API Node.js com persistência em SQLite (arquivo local, sem serviços externos) e uma interface web moderna construída com React e Vite.

> **Persistência garantida:** todos os cadastros — participantes, listas de presentes e eventos — ficam gravados em `server/data/database.db`. Reiniciar o servidor não apaga as informações.

## Visão geral

- **Inscrições inteligentes** para adultos e crianças, com validação automática de e-mail e suporte a responsáveis.
- **Listas de presentes completas** por participante, com prioridades, descrições e links para compras online.
- **Painel administrativo centralizado** para criar eventos, acompanhar confirmações, validar listas e disparar o sorteio.
- **E-mails temáticos de Natal** que comunicam códigos de verificação, acessos e o resultado do sorteio com clareza.
- **Infra simples de operar** graças ao SQLite local: nenhum servidor de banco de dados precisa ser instalado.

## Estrutura do projeto

```
.
├── server   # API em Node.js + Express + SQLite
└── web      # Interface web em React + Vite
```

## Pré-requisitos

- Node.js 18 ou superior.
- npm (instala automaticamente todas as dependências dos workspaces `server` e `web`).

## Configuração da API (`server`)

1. Copie o arquivo de exemplo de variáveis de ambiente:

   ```bash
   cp server/.env.example server/.env
   ```

2. Ajuste os valores no `.env`:

   - `ADMIN_EMAIL` e `ADMIN_PASSWORD`: credenciais para acessar o painel administrativo.
   - `ADMIN_JWT_SECRET`: segredo usado na geração dos tokens de sessão do painel.
   - `ADMIN_SESSION_MINUTES`: duração (em minutos) das sessões administrativas.
   - Para enviar e-mails reais, altere `MAILER_MODE` para `smtp` e configure `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS` e `MAIL_FROM`.
   - Usando Gmail? Ative a verificação em duas etapas, gere uma [senha de app](https://myaccount.google.com/apppasswords) e coloque o valor em `SMTP_PASS`.

   > **Banco de dados pronto para uso:** a API cria automaticamente o arquivo `server/data/database.db`. Não há variáveis relacionadas a MongoDB ou servidores externos — tudo roda localmente via SQLite.

3. Instale as dependências e inicie o servidor em modo desenvolvimento:

   ```bash
   npm install
   npm run dev:server
   ```

   O comando `npm install` na raiz aproveita os workspaces e instala pacotes tanto do backend quanto do frontend.

   > Para levantar backend e frontend juntos, use `npm run dev`, que executa `server` e `web` em paralelo.

4. Para gerar a versão compilada da API:

   ```bash
   npm run build
   ```

## Configuração da interface web (`web`)

Com as dependências já instaladas, suba apenas a interface com:

```bash
npm run dev:web
```

A aplicação fica disponível em `http://localhost:5173`, com proxy configurado para encaminhar as requisições `/api` ao servidor backend (`http://localhost:4000`).

Se preferir subir ambos os serviços com um único comando, execute `npm run dev` na raiz do projeto.

Para gerar o build de produção da interface:

```bash
npm --prefix web run build
```

> **Compatibilidade com Windows:** o Vite usa automaticamente a versão JavaScript do Rollup. Assim, mesmo que o npm não baixe o pacote opcional `@rollup/rollup-win32-x64-msvc`, o `npm run dev` continua funcionando normalmente.

## Fluxo de uso

1. **Inscrição**
   - Acesse `/inscricao` e preencha o formulário. Adultos informam o próprio e-mail; crianças ativam a opção "é criança" para registrar responsáveis.
   - Se existir algum evento ativo, a tela mostra um seletor opcional para escolher a festa desejada, com contagem de confirmados e local informado pelo organizador.
   - Um código de verificação é enviado ao e-mail principal (do participante adulto ou do responsável).

2. **Confirmação de e-mail**
   - Após a inscrição, o sistema redireciona automaticamente para `/confirmacao`.
   - Informe o ID da inscrição retornado pelo backend e o código recebido por e-mail para concluir a validação.
   - Apenas inscrições confirmadas são movidas para a base principal; cadastros pendentes podem repetir o processo sem travar o endereço.

3. **Lista de presentes**
   - Clique em **Construir Lista** na página inicial (ou acesse diretamente `/login`). Primeiro informe o e-mail validado para receber um código temporário; depois valide o código para entrar.
   - O painel `/listas` traz indicadores de progresso, resumo do cadastro e atalhos para adicionar, marcar ou remover itens em tempo real.
   - O e-mail que entrega o código deixa claro qual endereço recebeu a mensagem, facilitando a identificação pelos participantes.

4. **Painel administrativo**
   - Em `/admin`, faça login com as credenciais configuradas nas variáveis `ADMIN_EMAIL` e `ADMIN_PASSWORD`.
   - Acompanhe todas as inscrições confirmadas, inclusive presença, responsáveis e itens cadastrados.
   - Crie e edite eventos, definindo o local da festa. Quando todos estiverem verificados em número par, execute o sorteio com um clique.
   - Antes de sortear, o sistema garante que todas as pessoas do evento já montaram suas listas de presentes.
   - Consulte o histórico de sorteios e dispare e-mails de teste para validar suas credenciais SMTP.

5. **Pós-sorteio**
   - Cada participante recebe um e-mail com o nome completo e o ID do amigo oculto que deverá presentear.
   - O corpo da mensagem traz a lista de presentes cadastrada, eliminando a necessidade de portais públicos ou tickets extras.
   - Guardar o ID enviado no e-mail é suficiente para futuras consultas com o organizador.

## Testes e lint

- `npm run lint`: executa a verificação de tipos tanto no backend quanto na interface.

## Boas práticas implementadas

- Validação de entrada com **Zod** em todas as camadas.
- Separação clara de responsabilidades (serviços, controladores, repositórios e rotas) na API.
- **React Query** e **React Hook Form** para uma experiência fluida na interface.
- Armazenamento seguro das sessões administrativas e IDs de participantes no `localStorage` com feedback contextual.
- Persistência apenas de inscrições com e-mail confirmado, mantendo pendências separadas até a validação.

## Próximos passos sugeridos

- Integrar um serviço de e-mail transacional em produção (SendGrid, SES, etc.).
- Criar testes automatizados (unitários e de integração) para fluxos críticos.
- Containerizar a solução para implantação padronizada.
