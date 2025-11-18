# Implementar Persistência de Sessão com Cookies

## Objetivo
Resolver o problema de perda de sessão quando o usuário sai do app para verificar e-mail no Chrome, implementando cookies HTTP-only para persistir a sessão.

## Passos

### Backend
- [ ] Modificar `server/src/middlewares/participantAuth.ts` para aceitar token via cookie HTTP-only
- [ ] Modificar `server/src/controllers/participantController.ts` para setar cookie no login
- [ ] Criar endpoint `/me` em `server/src/controllers/participantController.ts` para verificar sessão
- [ ] Adicionar rota `/me` em `server/src/routes/participantRoutes.ts`

### Frontend
- [ ] Modificar `web/src/services/api.ts` para incluir função `getCurrentParticipant`
- [ ] Modificar `web/src/context/ParticipantContext.tsx` para tentar restaurar sessão via `/me` no carregamento

## Testes
- [ ] Verificar se a sessão persiste após sair do app
- [ ] Verificar se o cookie é setado corretamente
- [ ] Verificar se a restauração automática funciona
