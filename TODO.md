# TODO: Implementar botão de reset do banco de dados no painel admin

## Tarefas Pendentes
- [x] Adicionar função `resetDatabase` no `adminController.ts` que chama `resetDatabase` do `sqliteDatabase.ts`
- [x] Adicionar rota `DELETE /admin/database` no `adminRoutes.ts`
- [x] Adicionar botão "Resetar Banco de Dados" no `AdminPage.tsx` com confirmação dupla
- [x] Testar a funcionalidade do botão

## Contexto
- A função `resetDatabase` já existe em `sqliteDatabase.ts` e limpa todas as tabelas
- O botão deve ter confirmação dupla para evitar acidentes
- Localizar o botão na seção de "Ferramentas de disparo"
