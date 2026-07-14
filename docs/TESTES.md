# Testes — Dark Code CRM

## Estado atual

O MVP não possui suíte de testes automatizados de unidade/integração (limitação
declarada). A validação foi feita por:

1. **Typecheck** — `npm run typecheck` (tsc --noEmit, estrito).
2. **Lint** — `npm run lint` (ESLint + eslint-config-next).
3. **Build de produção** — `npm run build`.
4. **Testes funcionais manuais no navegador** (roteiro abaixo), executados sobre o seed.

## Roteiro de teste manual (o que foi validado)

### Autenticação
- [x] Cadastro com validações (e-mail/username únicos, senha mínima, termos)
- [x] Novo usuário entra como PENDENTE e não consegue logar antes da aprovação
- [x] Login com e-mail e com nome de usuário; mensagens genéricas de erro
- [x] Logout; rotas privadas redirecionam para /login sem sessão
- [x] Recuperação de senha gera link (log do servidor em dev) e redefinição funciona

### Permissões
- [x] Colaborador não vê Financeiro/Equipe/Relatórios/Admin na sidebar e recebe
      redirect ao acessar as URLs diretamente
- [x] Colaborador não altera prazo de tarefa delegada (campo oculto + bloqueio no servidor)
- [x] Admin aprova usuário pendente; usuário aprovado é notificado e consegue logar

### Fluxos principais
- [x] CRUD de clientes com filtros, busca e arquivamento
- [x] CRUD de projetos com membros e progresso calculado pelas tarefas
- [x] CRUD de tarefas; kanban com drag-and-drop persistindo status/ordem
- [x] Checklist, comentários com @menção, registro de horas, anexos
- [x] Solicitação de novo prazo → aprovação/recusa/contraproposta pelo gestor,
      com histórico imutável e notificações
- [x] Lançamento/edição/exclusão (soft) de receitas; totais e exportação CSV
- [x] Dashboard: cards 1/7/15/30 dias com comparação vs período anterior,
      gráficos e listas com dados reais do banco
- [x] Notificações: contador no sino, marcar como lida / todas como lidas

## Próximos passos recomendados

- Vitest + Testing Library para `lib/` (format, rbac, validators) e componentes críticos.
- Playwright para fluxos E2E (login → criar tarefa → solicitar prazo → aprovar).
- CI (GitHub Actions): lint + typecheck + build + testes em cada PR.
