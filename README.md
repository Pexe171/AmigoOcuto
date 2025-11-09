# Amigo Ocuto

Plataforma profissional para organizar seu encontro de amigo oculto. O sistema é composto por uma API Node.js com persistência em SQLite (arquivo local, sem necessidade de serviços externos) e uma interface web moderna construída com React e Vite.

> **Persistência garantida:** todos os cadastros — participantes, listas de presentes e eventos — são gravados em `server/data/database.db`. Reiniciar o servidor não apaga os dados.

## Visão geral

- **Inscrições inteligentes** para adultos e crianças, com validação automática de e-mail e coleta opcional de apelido.
- **Listas de presentes integradas** para cada participante, com prioridade, descrições e links.
- **Sorteio sigiloso** realizado via painel administrativo. O histórico registra tickets emitidos sem revelar quem tirou quem.
- **Consulta rápida do sorteio**: cada participante utiliza nome ou ID para acessar a lista de presentes do sorteado sem quebrar o segredo.
- **Notificações por e-mail** configuráveis via SMTP ou modo console para ambientes de teste.

## Estrutura do projeto

```
.
├── server   # API em Node.js + Express + SQLite
└── web      # Interface web em React + Vite
```

## Pré-requisitos

- Node.js 18+
- SQLite (já embutido via `better-sqlite3`, sem configuração adicional)

## Configuração da API (`server`)

1. Copie o arquivo de exemplo de variáveis de ambiente:

   ```bash
   cp server/.env.example server/.env
   ```

2. Ajuste as variáveis no `.env`:

   - `ADMIN_EMAIL` e `ADMIN_PASSWORD`: credenciais utilizadas para acessar o painel administrativo.
   - `ADMIN_JWT_SECRET`: segredo utilizado para assinar os tokens de sessão do painel.
   - `ADMIN_SESSION_MINUTES`: duração (em minutos) das sessões administrativas.
   - Para enviar e-mails reais, defina `MAILER_MODE=smtp` e configure também `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS` e `MAIL_FROM`.
   - Se for usar Gmail, gere uma [senha de app](https://myaccount.google.com/apppasswords) após ativar a verificação em duas etapas e utilize-a em `SMTP_PASS`.

   > **Dica:** Para facilitar o desenvolvimento local, a API usa `mongodb://127.0.0.1:27017` com o banco `amigoocuto`, além das credenciais administrativas padrão (`admin@amigoocuto.com` / `troque-esta-senha`). Ainda assim, personalize essas informações antes de subir o projeto para produção.
   >
   > Se o MongoDB configurado não estiver acessível, o backend tentará automaticamente iniciar uma instância em memória (somente fora de produção) e informará isso no console. Você também pode habilitar esse comportamento diretamente ativando `MONGO_IN_MEMORY=true` no `.env`.

3. Instale dependências e inicie o servidor em modo desenvolvimento:

   ```bash
   npm install
   npm run dev:server
   ```

   O comando `npm install` na raiz instala as dependências de ambos os pacotes graças ao uso de workspaces.

   > Para levantar backend e frontend juntos, utilize `npm run dev`, que executa `server` e `web` em paralelo.

4. Para gerar a versão compilada:

   ```bash
   npm run build
   ```

## Configuração da interface web (`web`)

Com as dependências já instaladas na etapa anterior, você pode subir apenas a interface com:

```bash
npm run dev:web
```

A aplicação estará disponível em `http://localhost:5173`, com proxy configurado para encaminhar as requisições `/api` ao servidor backend (`http://localhost:4000`).

Se preferir subir ambos os serviços com um único comando, basta executar `npm run dev` na raiz do projeto.

Para gerar build de produção:

```bash
npm --prefix web run build
```

> **Compatibilidade com Windows:** configuramos o Vite para utilizar automaticamente a versão JavaScript do Rollup.
> Assim, mesmo que o npm falhe ao baixar o pacote opcional `@rollup/rollup-win32-x64-msvc`, o `npm run dev` continua funcionando normalmente.

## Fluxo de uso

1. **Inscrição**
   - Acesse `/inscricao` e preencha o formulário. Adultos informam o próprio e-mail; crianças primeiro selecionam a opção "é criança" e registram os responsáveis.
   - Caso já exista pelo menos um evento ativo, a tela exibe um seletor opcional para você escolher em qual festa deseja participar.
   - Cada opção mostra o número de participantes confirmados e, sempre que o organizador informar, o local da celebração.
   - Um código de verificação é enviado ao e-mail principal (do participante adulto ou do responsável).

2. **Confirmação de e-mail**
   - Após finalizar a inscrição, você será redirecionado automaticamente para `/confirmacao`.
   - Informe o ID da inscrição (retornado pelo backend) e o código recebido por e-mail para concluir a validação.
   - Somente após essa confirmação os dados são persistidos na coleção principal; inscrições pendentes podem refazer o processo sem bloquear o e-mail.

3. **Lista de presentes**
   - Clique em **Construir Lista** na página inicial (ou acesse diretamente `/login`). Primeiro informe o e-mail confirmado na inscrição para receber um código temporário e, em seguida, valide o código para entrar.
   - Após o login, você será levado ao painel `/listas`, com indicadores de progresso, resumo do cadastro e atalhos para adicionar, marcar ou remover itens em tempo real. Somente participantes com e-mail verificado têm a lista persistida na base oficial.
   - O e-mail automático que entrega o código informa claramente que se trata do acesso à lista de presentes e indica qual endereço recebeu a mensagem, facilitando a identificação pelos participantes.

4. **Painel administrativo**
  - Em `/admin`, autentique-se com o e-mail e a senha configurados nas variáveis `ADMIN_EMAIL` e `ADMIN_PASSWORD`.
  - Consulte a lista completa de participantes confirmados, incluindo presença, responsáveis e itens cadastrados.
   - Acompanhe os eventos existentes e, quando todos os participantes estiverem verificados em número par, execute o sorteio com um único clique.
   - Ao criar um novo evento, registre também o local da festa para que ele seja incluído automaticamente nos e-mails do sorteio.
   - Antes do sorteio, o sistema agora verifica automaticamente se todas as pessoas confirmadas no evento já cadastraram a lista de presentes.
   - Verifique o histórico de sorteios de cada evento. Todas as ações são de consulta, exceto o disparo do sorteio.
   - Dispare um e-mail de teste para todos os contatos confirmados antes do sorteio oficial e valide rapidamente as credenciais SMTP.
   - Opcionalmente, utilize `/adm` para exibir o protótipo visual do portal corporativo ADM.

5. **Consulta do sorteio**
   - Em `/consultar`, busque pelo nome do participante sorteado ou cole o ID recebido no e-mail para visualizar a lista de presentes correspondente.
   - O acesso é público e não revela quem tirou quem, apenas expõe as preferências do participante consultado.
   - Os e-mails pós-sorteio agora incluem o ticket e o ID do amigo oculto para facilitar consultas futuras.

## Testes e lint

- `npm run lint`: executa a verificação de tipos tanto no backend quanto na interface.

## Boas práticas implementadas

- Validação de entrada com **Zod** em todas as camadas.
- Separação em camadas (serviços, controladores, rotas) na API.
- **React Query** e **React Hook Form** para experiência fluida na interface.
- Armazenamento seguro das sessões administrativas e IDs de participantes no `localStorage` com feedback contextual.
- Persistência apenas de inscrições com e-mail confirmado, mantendo as pendentes em coleção separada até a validação.

## Próximos passos sugeridos

- Integrar um serviço de e-mail transacional em produção (SendGrid, SES, etc.).
- Criar testes automatizados (unitários e de integração) para fluxos críticos.
- Containerizar a solução para implantação padronizada.
