# Guia rápido da interface web

Este guia resume decisões de UX, libs principais e como evoluir a interface sem quebrar o que já funciona.

## Padrões visuais

- **Layout responsivo:** o `AppLayout` centraliza cabeçalho, área de conteúdo e rodapé. Todos os componentes devem ficar dentro
dele para herdar tipografia e espaçamento padrão.
- **Paleta temática:** os estilos base estão em `web/src/styles`. Preferimos classes utilitárias definidas lá para manter tons de
  Natal (vermelho, dourado e verde escuro) consistentes.
- **Feedback humano:** componentes de formulário trazem mensagens de erro em português e foco visual usando `NotificationContext`.

## Navegação principal

```
Home (/) ─┬─ Inscrição (/inscricao)
          ├─ Confirmação (/confirmacao)
          ├─ Login participante (/login)
          ├─ Listas protegidas (/listas)
          ├─ Login admin (/adm)
          └─ Painel admin (/admin)
```

- `ProtectedRoute` verifica o cookie da sessão do participante antes de liberar `/listas`.
- `AdminPage` consome endpoints autenticados apenas após obter um JWT em `/adm`.

## Comunicação com a API

- Todos os clientes HTTP vivem em `web/src/services`. Cada arquivo espelha um recurso do backend, retornando funções tipadas.
- `axios` (configurado com `baseURL: '/api'`) já injeta cookies e trata status `401` para redirecionar ao login quando necessário.
- Antes de criar uma chamada nova, considere se ela já existe no serviço correspondente para evitar duplicidade.

## Estados derivados

- Use `React Query` para dados compartilhados (eventos, listas, participantes). Configure `queryKey`s semânticos (ex.:
  `['giftList', participantId]`).
- Use `useState`/`useReducer` apenas para estados locais (modal aberto, filtros temporários).
- Centralize mensagens toast no `NotificationContext`. Basta chamar `notify({ type: 'success', message: '...' })`.

## Formulários humanizados

1. Construa o schema com Zod em `web/src/utils/validation` (ou próximo ao formulário) para manter regras em português.
2. Integre o schema ao React Hook Form via `zodResolver`.
3. Preencha placeholders e `aria-label`s com frases completas; todos os formulários atuais já servem como referência.

## Testes

- Use `vitest` + `@testing-library/react`. Há exemplos em `web/tests` cobrindo hooks e componentes críticos.
- Cada cenário relevante deve garantir mensagens de erro amigáveis, além de verificar chamadas para a API falsa (mocks).

## Roadmap visual sugerido

- Adicionar barra de progresso durante o cadastro, utilizando `NotificationContext` para indicar cada etapa concluída.
- Permitir anexar foto do presente (preview local) usando `URL.createObjectURL`, salvando somente metadados no backend.
- Criar modo "moderador" no frontend para quem apenas precisa conferir listas sem acessar o painel administrativo completo.

Com estas diretrizes você consegue contribuir em novas telas mantendo tom de voz acolhedor e decisões técnicas alinhadas ao
restante do projeto.
