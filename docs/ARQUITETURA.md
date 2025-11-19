# Arquitetura detalhada

Este documento aprofunda como a plataforma Amigo Ocuto foi desenhada. O objetivo é facilitar a vida de quem dá manutenção
ou precisa apresentar o projeto rapidamente para outra pessoa.

## Camadas principais

| Camada | Tecnologias | Responsabilidades |
| --- | --- | --- |
| API | Node.js 18, Express, SQLite (via `better-sqlite3`), Zod | Processa inscrições, administra eventos, dispara e-mails e centraliza o sorteio. |
| Interface web | React + Vite, React Router, React Query, React Hook Form | Disponibiliza formulários amigáveis, painel administrativo e feedback em tempo real. |
| Observabilidade | Logger próprio, Prometheus metrics, cron `node-cron` | Monitora jobs críticos, gera métricas HTTP e emite lembretes automatizados. |

## Fluxo de dados completo

1. A pessoa inicia o cadastro em `/inscricao` e envia o formulário para `POST /api/participants`.
2. A API salva o registro em uma área de pendentes dentro do mesmo SQLite e envia um código de verificação por e-mail.
3. Ao validar o código em `/api/participants/verify`, o cadastro é movido para a tabela principal e fica elegível para eventos.
4. O painel `/admin` cria ou atualiza eventos em `/api/admin/events`, definindo limites, local e data de sorteio.
5. No painel de listas (`/listas`) o participante autenticado acessa `GET /api/gift-lists/:participantId` para manter desejos atualizados.
6. Quando o sorteio é iniciado (`POST /api/admin/events/:eventId/draw`), o backend garante número par de confirmados e listas completas.
7. Um cron job (`node-cron`) roda a cada minuto, consulta eventos próximos via `getEventsNeedingReminder` e dispara e-mails de lembrete.

## Estrutura da API

```
server/src
├── app.ts            # Montagem dos middlewares e rotas
├── server.ts         # Bootstrap HTTP + cron + observabilidade
├── controllers/      # Camada HTTP fina: valida input e chama serviços
├── services/         # Regras de negócio (participantes, eventos, e-mails)
├── database/         # Scripts SQL e instância compartilhada do SQLite
├── middlewares/      # Autenticação, rate limiting, métricas, cookies etc.
├── routes/           # Agrupamento semântico de endpoints
├── observability/    # Logger estruturado, métricas e monitor de jobs
├── security/         # Geração e validação de tokens (JWTs e cookies)
└── utils/            # Funções auxiliares (datas, e-mails amigáveis, máscaras)
```

### Banco de dados

Mesmo usando SQLite, seguimos boas práticas de separação:

- **`participants`**: registros confirmados, com flags como `is_child`, `email_verified_at` e relacionamento com eventos.
- **`participants_pending`**: inscrições aguardando código de verificação.
- **`gift_lists` / `gift_list_items`**: lista e itens com prioridade, descrição, link e status.
- **`events`**: configurações do encontro (local, horário, responsável) e campos de sorteio.
- **`event_participants`**: tabela de junção que indica quem participa de qual evento e quem tirou quem no sorteio.
- **`admin_sessions`**: guarda tokens temporários emitidos para o painel.

A pasta `server/fix.sql` traz scripts de manutenção e consultas úteis durante depuração.

### Observabilidade e jobs

- `runMonitoredJob` padroniza logs de sucesso/erro e mede a duração de cada job cron.
- `requestMetrics` expõe latência e status HTTP em `/metrics` (formato Prometheus), desligado automaticamente em produção sem
  variável de ambiente.
- Qualquer falha ao subir o servidor derruba o processo (`process.exit(1)`) para evitar estados corrompidos.

## Estrutura da interface web

```
web/src
├── pages/            # Páginas completas roteadas
├── components/       # Componentes reutilizáveis (inputs, cards, diálogos)
├── context/          # Contexto de notificações, sessão e carregamentos
├── hooks/            # Hooks customizados para formulários e React Query
├── services/         # Clientes HTTP que conversam com a API
├── layouts/          # Layouts compartilhados com cabeçalho/rodapé
├── styles/           # Tokens de cor e tipografia em CSS modules
└── utils/            # Máscaras, formatadores e helpers de data
```

### Gestão de estado e formulários

- **React Query** mantém cache dos endpoints críticos (`/gift-lists`, `/admin/events`). Ao invalidar queries após PUT/POST,
  a tela sempre reflete o último estado salvo no backend.
- **React Hook Form** simplifica validação em tempo real e integra com componentes customizados.
- **NotificationContext** oferece `toast` visual para qualquer ação via `NotificationProvider` (veja `web/src/context`).

### Boas práticas adicionais

- Uso extensivo de TypeScript tanto no server quanto no web assegura contratos coerentes.
- Cookies HTTP-only guardam sessões de participantes; o painel administrativo utiliza JWT + `localStorage` com expiração curta.
- Todos os textos enviados aos participantes possuem versão infantil/adulto para orientar quem tirou crianças.
- A pasta `tests/` em cada workspace contém exemplos de testes unitários com Vitest para ampliar no futuro.

## Fluxos operacionais resumidos

1. **Organizador** cria evento -> adiciona local, data, limite e moderação.
2. **Participante adulto** se inscreve -> confirma e-mail -> monta lista -> recebe amigo oculto após sorteio.
3. **Participante criança** se inscreve com responsáveis -> responsáveis recebem instruções adicionais por e-mail.
4. **Admin** acompanha progresso -> dispara lembretes -> finaliza sorteio -> comunica resultado.

Com este panorama você consegue navegar tanto no backend quanto no frontend com segurança e, se necessário,
construir novas features mantendo o estilo atual do projeto.
