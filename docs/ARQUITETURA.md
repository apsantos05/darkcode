# Arquitetura — Dark Code CRM

## Visão geral

O Dark Code CRM é uma aplicação **Next.js 16 (App Router)** full-stack: as páginas são
Server Components que leem o banco diretamente via Prisma, e as mutações acontecem por
**Server Actions** validadas com Zod. Não há API REST separada — apenas alguns Route
Handlers para casos específicos (exportação CSV, download de anexos, stub de webhooks).

```
Browser ──► proxy.ts (verificação de sessão / redirects)
          ──► Server Components (leitura via Prisma)
          ──► Server Actions (mutações: Zod → RBAC → Prisma → ActivityLog/Notification)
          ──► Route Handlers (/api/uploads, exportação CSV, webhook stub)
                        │
                        ▼
              PostgreSQL/Supabase via Prisma 6
```

## Stack

| Camada       | Tecnologia                                             |
| ------------ | ------------------------------------------------------ |
| Frontend     | Next.js 16 (App Router), React 19, TypeScript          |
| Estilo       | Tailwind CSS v4 (tokens de tema em `app/globals.css`)  |
| Componentes  | Kit próprio em `components/ui/` (estilo shadcn), Lucide |
| Formulários  | Server Actions + `useActionState` (+ Zod no servidor)  |
| Gráficos     | Recharts                                                |
| Datas        | date-fns v4 + @date-fns/tz (America/Sao_Paulo)         |
| Toasts       | Sonner                                                  |
| ORM          | Prisma 6                                                |
| Banco        | PostgreSQL gerenciado no Supabase, acessado pelo backend Prisma |
| Autenticação | Sessão própria: JWT (jose) em cookie httpOnly + bcryptjs |
| Drag & drop  | @dnd-kit (kanban)                                       |

### Por que Supabase/PostgreSQL?

O plano original previa Supabase, mas o ambiente de desenvolvimento não possui Docker
nem uma conta Supabase própria para este projeto. A camada Prisma isola totalmente o
banco: para migrar para PostgreSQL/Supabase basta alterar o `datasource` do
`prisma/schema.prisma`, recriar as migrations e configurar `DATABASE_URL`. As regras de
autorização vivem no código do servidor (RBAC em `lib/rbac.ts` + verificações de posse
em cada action), portanto não dependem de RLS.

## Estrutura de pastas

```
app/
  (auth)/            Rotas públicas: login, cadastro, recuperar/redefinir senha
    actions.ts       Server actions de autenticação
  (app)/             Rotas privadas (layout exige sessão válida)
    dashboard/       Dashboard com métricas agregadas (queries.ts + charts.tsx)
    tarefas/         Lista/kanban/calendário, detalhe, edição, solicitações de prazo
    projetos/        CRUD de projetos, membros, progresso
    clientes/        CRUD de clientes (soft delete via arquivamento)
    financeiro/      Receitas + exportação CSV + stub de webhook
    equipe/          Visão de equipe (gestores)
    admin/           Aprovação de usuários, papéis, permissões, configurações
    relatorios/      Relatórios por colaborador/projeto/financeiro + CSV
    notificacoes/    Central de notificações
    perfil/          Edição do próprio perfil e senha
    configuracoes/   Conta e permissões do usuário atual
    pesquisa/        Busca global
  api/uploads/       Download autenticado de anexos
components/
  ui/                Kit de componentes (button, input, card, dialog, table…)
  layout/            Sidebar, header, user-menu, page-header
lib/
  db.ts              Singleton PrismaClient
  auth/              session.ts (JWT/cookie) + current-user.ts (requireUser/requireRole)
  rbac.ts            Matriz de permissões + assertPermission
  activity.ts        logActivity (auditoria) + notify (notificações)
  constants.ts       Vocabulário de domínio (status, prioridades…) com labels PT-BR
  format.ts          Moeda BRL, datas DD/MM/AAAA, fuso America/Sao_Paulo
  validators/        Schemas Zod por módulo
prisma/
  schema.prisma      Modelagem completa
  migrations/        Migrations versionadas
  seed.ts            Dados de demonstração (apenas dev)
proxy.ts             Proteção de rotas (equivalente ao middleware)
uploads/             Anexos enviados (fora de public/, servidos com auth)
```

## Autenticação e sessão

- Cookie `dc_session` httpOnly/SameSite=Lax com JWT HS256 (jose), expiração 7 dias.
- `proxy.ts` valida o token em toda navegação e redireciona não autenticados a `/login`.
- `getCurrentUser()` sempre revalida papel/status **no banco** — bloquear um usuário
  invalida o acesso imediatamente, mesmo com cookie válido.
- Novos cadastros entram com status `PENDING` e só acessam após aprovação de um admin.
  O primeiro usuário criado no sistema vira `ADMIN` ativo automaticamente (bootstrap).

## Autorização (RBAC)

Papéis: `ADMIN`, `MANAGER`, `COLLABORATOR`, `CLIENT` (estrutura pronta; portal do
cliente fora do MVP). A matriz de permissões vive em `lib/rbac.ts` e é aplicada **dentro
de cada server action** (nunca apenas na UI). Regras adicionais de posse (ex.: colaborador
só edita tarefa em que participa; só o autor edita um comentário) são verificadas
consultando o banco antes da mutação. Detalhes em [PERMISSOES.md](./PERMISSOES.md).

## Auditoria e notificações

- `ActivityLog` é um histórico **imutável** (a aplicação só insere) com ator, ação,
  valores antigos/novos serializados em JSON e timestamp.
- `Notification` alimenta o sino do header e a central `/notificacoes`.
- Fluxos sensíveis (solicitação de prazo, aprovação de usuário, mudanças de papel)
  sempre registram atividade + notificação.

## Decisões e limitações conhecidas

- **Dinheiro em centavos (Int)** — evita erro de ponto flutuante; `formatBRL` na exibição.
- **Enums como strings** — validação de domínio centralizada com Zod.
- **Rate limiting em memória** — suficiente para instância única; usar Redis em produção.
- **E-mail de recuperação** — sem SMTP configurado, o link é registrado no log do servidor
  (apenas dev). Configurar SMTP no `.env` para produção.
- **Anexos em disco local** (`uploads/`) — servidos com autenticação via route handler;
  em produção com múltiplas instâncias, migrar para S3/Supabase Storage.
- **Webhooks de gateways** — endpoint stub seguro em `/api/webhooks/revenues` pronto para
  receber integrações (Stripe, Hotmart etc.) em versões futuras.
