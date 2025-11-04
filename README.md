# Amigo Ocuto

Plataforma profissional para organizar seu encontro de amigo oculto. O sistema é composto por uma API Node.js conectada ao MongoDB e uma interface web moderna construída com React e Vite.

## Visão geral

- **Inscrições inteligentes** para adultos e crianças, com validação automática de e-mail e coleta opcional de apelido.
- **Listas de presentes integradas** para cada participante, com prioridade, descrições e links.
- **Sorteio sigiloso** realizado via painel administrativo. O histórico registra tickets emitidos sem revelar quem tirou quem.
- **Notificações por e-mail** configuráveis via SMTP ou modo console para ambientes de teste.

## Estrutura do projeto

```
.
├── server   # API em Node.js + Express + MongoDB
└── web      # Interface web em React + Vite
```

## Pré-requisitos

- Node.js 18+
- MongoDB em execução e acessível (local ou remoto)

## Configuração da API (`server`)

1. Copie o arquivo de exemplo de variáveis de ambiente:

   ```bash
   cp server/.env.example server/.env
   ```

2. Ajuste as variáveis no `.env`:

   - `MONGO_URI`: string de conexão com seu cluster MongoDB (incluindo o nome da base, ex.: `.../amigoocuto`).
   - `ADMIN_TOKEN`: token secreto utilizado pelo painel administrativo.
   - Para enviar e-mails reais, defina `MAILER_MODE=smtp` e configure também `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS` e `MAIL_FROM`.
   - Se for usar Gmail, gere uma [senha de app](https://myaccount.google.com/apppasswords) após ativar a verificação em duas etapas e utilize-a em `SMTP_PASS`.

   > **Dica:** Para facilitar o desenvolvimento local, a API usa `mongodb://127.0.0.1:27017/amigoocuto` e `admin-token` como valores padrão caso o `.env` não esteja presente. Ainda assim, personalize essas credenciais antes de subir o projeto para produção.

3. Instale dependências e inicie o servidor em modo desenvolvimento:

   ```bash
   npm install
   npm run dev:server
   ```

   O comando `npm install` na raiz instala as dependências de ambos os pacotes graças ao uso de workspaces.

4. Para gerar a versão compilada:

   ```bash
   npm run build
   ```

## Configuração da interface web (`web`)

Com as dependências já instaladas na etapa anterior, execute:

```bash
npm run dev:web
```

A aplicação estará disponível em `http://localhost:5173`, com proxy configurado para encaminhar as requisições `/api` ao servidor backend (`http://localhost:4000`).

Para gerar build de produção:

```bash
npm --prefix web run build
```

## Fluxo de uso

1. **Inscrição**
   - Acesse `/inscricao` e preencha o formulário. Adultos informam o próprio e-mail; crianças primeiro selecionam a opção "é criança" e registram os responsáveis.
   - Um código de verificação é enviado ao e-mail principal (do participante adulto ou do responsável).

2. **Confirmação de e-mail**
   - Em `/confirmacao`, informe o ID da inscrição (retornado pelo backend) e o código recebido por e-mail. Aproveite para indicar se participará presencialmente no encontro principal.

3. **Lista de presentes**
   - Em `/listas`, cole o ID da inscrição para buscar ou atualizar a lista de presentes. É possível adicionar até 50 itens com prioridade, descrição e link.

4. **Painel administrativo**
   - Em `/admin`, informe o token definido na variável `ADMIN_TOKEN`.
   - Crie eventos selecionando participantes específicos ou incluindo todos os verificados.
   - Execute o sorteio: tickets únicos são gerados e enviados via e-mail sem expor o mapeamento.
   - Consulte o histórico de sorteios de cada evento. Para refazer, cancele o evento e crie outro.

## Testes e lint

- `npm run lint`: executa a verificação de tipos tanto no backend quanto na interface.

## Boas práticas implementadas

- Validação de entrada com **Zod** em todas as camadas.
- **Mongoose** para modelagem robusta das coleções `Participants`, `GiftLists`, `Events` e `Tickets`.
- Separação em camadas (serviços, controladores, rotas) na API.
- **React Query** e **React Hook Form** para experiência fluida na interface.
- Armazenamento seguro de tokens administrativos e IDs de participantes no `localStorage` com feedback contextual.

## Próximos passos sugeridos

- Integrar um serviço de e-mail transacional em produção (SendGrid, SES, etc.).
- Criar testes automatizados (unitários e de integração) para fluxos críticos.
- Containerizar a solução para implantação padronizada.
