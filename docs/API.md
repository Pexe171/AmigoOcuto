# Guia de API

Todas as rotas expostas partem da base `/api`. A autenticação dos participantes usa cookies HTTP-only enquanto o painel
administrativo trabalha com JWT guardado no `localStorage`.

> **Formato padrão:** as respostas retornam JSON. Em caso de erro, enviamos `{ message: string, details?: unknown }` com código condizente.

## Participantes (`/api/participants`)

| Método | Caminho | Proteção | Descrição |
| --- | --- | --- | --- |
| POST | `/` | Pública | Inicia uma inscrição (adulto ou criança) e envia código de verificação por e-mail.
| POST | `/verify` | Pública | Confirma a inscrição usando o ID retornado na etapa anterior e o código recebido.
| POST | `/login` | Pública | Valida e-mail + código temporário para liberar o painel de listas; retorna cookie de sessão.
| POST | `/logout` | Cookie | Descarta a sessão do participante limpando o cookie HTTP-only.
| POST | `/request-verification-code` | Pública | Reenvia código temporário para login ou confirmação.
| PUT | `/update-email` | Pública | Atualiza o e-mail principal de uma inscrição ainda pendente e dispara novo código.
| GET | `/search?query=` | Admin | Busca participantes por nome (usado pelo painel ao montar eventos).
| GET | `/by-email/:email` | Admin | Busca status de confirmação por e-mail, útil para suporte.
| POST | `/:id/resend` | Pública | Reenvia e-mail de verificação para uma inscrição específica.
| GET | `/me` | Cookie | Retorna dados resumidos da sessão autenticada.
| GET | `/:id` | Admin | Mostra status completo de um participante específico.

## Listas de presentes (`/api/gift-lists`)

Todas as rotas exigem sessão válida (middleware `requireParticipantAuth`).

| Método | Caminho | Descrição |
| --- | --- | --- |
| GET | `/:participantId` | Obtém a lista completa do participante autenticado (itens, prioridades, links e notas).
| PUT | `/:participantId` | Substitui a lista de desejos inteira respeitando validação de quantidade mínima e máxima.
| GET | `/:participantId/assigned-friend` | Retorna quem a pessoa tirou após o sorteio, incluindo acesso rápido à lista do amigo oculto.

## Eventos públicos (`/api/events`)

| Método | Caminho | Descrição |
| --- | --- | --- |
| GET | `/` | Lista eventos disponíveis para novas inscrições com contagem de vagas, local e moderador.

## Painel administrativo (`/api/admin`)

| Método | Caminho | Descrição |
| --- | --- | --- |
| POST | `/login` | Autentica o organizador e cria uma sessão JWT de curta duração.
| GET | `/participants` | Lista geral com filtros por evento, status e confirmação.
| POST | `/participants/import` | Importa uma planilha CSV seguindo o template oficial.
| GET | `/participants/export` | Exporta os dados atuais em CSV.
| GET | `/participants/:participantId` | Mostra detalhes completos, responsáveis e itens cadastrados.
| DELETE | `/participants/:participantId` | Remove alguém definitivamente (exige confirmação manual na interface).
| POST | `/emails/test` | Envia um e-mail de teste para validar credenciais SMTP.
| POST | `/emails/gift-list-warning` | Notifica todos os participantes sem lista completa.
| POST | `/events/:eventId/emails/gift-list-warning` | Dispara o mesmo alerta apenas para um evento específico.
| POST | `/events` | Cria novo evento (local, datas, limite e responsável).
| GET | `/events` | Lista todos os eventos cadastrados, inclusive os encerrados.
| GET | `/events/:eventId` | Mostra detalhes e participantes associados.
| POST | `/events/:eventId/cancel` | Marca o evento como cancelado.
| POST | `/events/:eventId/draw` | Executa o sorteio garantindo paridade e listas completas.
| POST | `/events/:eventId/undo-draw` | Reverte o sorteio para permitir ajustes.
| GET | `/events/:eventId/history` | Log completo das ações realizadas no evento.
| POST | `/events/:eventId/participants/:participantId` | Adiciona manualmente um participante a um evento.
| DELETE | `/events/:eventId/participants/:participantId` | Remove manualmente um participante do evento.
| DELETE | `/events/:eventId` | Apaga um evento (somente admins com token válido).
| DELETE | `/database` | Limpa todas as tabelas e reinicia o ambiente de demonstração.

## Respostas e códigos HTTP mais comuns

| Código | Contexto |
| --- | --- |
| `200 OK` | Consultas ou atualizações realizadas com sucesso.
| `201 Created` | Inscrições e eventos recém-criados.
| `204 No Content` | Operações sem payload (ex.: logout, remoções).
| `400 Bad Request` | Validação do Zod falhou ou payload incompleto.
| `401 Unauthorized` | Sessão expirada ou token ausente.
| `403 Forbidden` | Tentativa de acessar recursos administrativos sem permissão.
| `404 Not Found` | IDs inexistentes ou métricas desativadas.
| `409 Conflict` | Inscrição duplicada ou sorteio impossível devido a regras de paridade.
| `429 Too Many Requests` | Rate limit atingido pelo middleware `rateLimiter`.
| `500 Internal Server Error` | Erro inesperado logado automaticamente com `logStructuredError`.

Com esta referência você consegue testar manualmente via `curl`/Postman ou implementar integrações externas mantendo as mesmas
regras aplicadas na interface web oficial.
