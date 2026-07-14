# Banco de Dados — Dark Code CRM

Provider atual: **PostgreSQL no Supabase**, acessado exclusivamente pelo backend Prisma.
A modelagem é agnóstica de banco via Prisma — para PostgreSQL/Supabase, altere o
`datasource` em `prisma/schema.prisma`, ajuste `DATABASE_URL` e recrie as migrations.

Convenções globais:

- **UUID** como chave primária em todas as tabelas.
- `created_at` / `updated_at` em todas as entidades principais.
- **Soft delete**: `deleted_at` (users, revenues, task_comments) e `archived_at`
  (clients, projects, tasks). Nada com histórico financeiro/projetos é apagado.
- **Dinheiro em centavos** (`Int`): `contract_cents`, `gross_cents`, `fee_cents`, `net_cents`.
- **Enums como strings** validadas por Zod; vocabulário e
  labels PT-BR centralizados em `lib/constants.ts`.
- Índices nos campos de filtro frequente (status, datas, FKs).

## Entidades

| Tabela                   | Papel                                                                  |
| ------------------------ | ---------------------------------------------------------------------- |
| `users`                  | Usuários internos (papel, área, cargo, status PENDING/ACTIVE/BLOCKED)  |
| `password_reset_tokens`  | Tokens de redefinição (hash SHA-256, expiração 1h, uso único)          |
| `clients`                | Clientes (razão social, CPF/CNPJ, contato, contrato, status, responsável) |
| `projects`               | Projetos por cliente (gestor, prazos, valores, status, prioridade)     |
| `project_members`        | N:N projeto ↔ usuário                                                  |
| `tasks`                  | Tarefas (criador, responsável, status, prioridade, prazos, horas, kanban_order, dependência) |
| `task_assignees`         | N:N tarefa ↔ participantes                                             |
| `task_checklist_items`   | Checklist com posição e `done_at`                                      |
| `task_comments`          | Comentários (menções em JSON, edição marcada, exclusão lógica)         |
| `task_attachments`       | Anexos (arquivo em `uploads/`, mime, tamanho, uploader)                |
| `time_entries`           | Registro de horas por tarefa/usuário                                   |
| `task_deadline_requests` | Solicitações de novo prazo (status, revisor, contraproposta, nota)     |
| `revenues`               | Receitas (bruto/taxas/líquido em centavos, datas, status, forma, plataforma) |
| `notifications`          | Notificações internas (tipo, link, `read_at`)                          |
| `activity_logs`          | **Auditoria imutável** (ator, entidade, ação, old/new em JSON)         |
| `tags` / `task_tags` / `project_tags` | Tags livres N:N                                          |
| `settings`               | Chave/valor (ex.: `monthly_goal_cents` — meta mensal)                  |

## Relacionamentos principais

```
users 1─N clients (responsável interno)
users 1─N projects (gestor)          clients 1─N projects
projects N─N users (project_members) projects 1─N tasks
clients 1─N tasks                    tasks N─N users (task_assignees)
tasks 1─N checklist/comments/attachments/time_entries/deadline_requests
clients 1─N revenues                 projects 1─N revenues
users 1─N notifications              activity_logs → (entity_type, entity_id) polimórfico
```

## Migrations e seed

```bash
npx prisma migrate dev          # aplica/gera migrations (dev)
npx prisma migrate reset        # zera o banco e roda seed
npm run db:seed                 # seed de demonstração (idempotente: aborta se já há usuários)
```

O seed cria: 1 admin, 2 gestores, 5 colaboradores (+1 pendente), 5 clientes, 8 projetos,
30 tarefas, 20 receitas (~60 dias), solicitações de prazo, notificações e histórico.
Credenciais dev: `admin@darkcode.dev` / `DarkCode123` (todos os usuários usam a mesma
senha de desenvolvimento — nunca usar em produção).

## Integridade

- FKs com `onDelete: Cascade` apenas em dependentes puros (checklist, comentários,
  membros, tokens); entidades de negócio usam soft delete.
- `revenues.net_cents` é calculado no servidor (`gross - fee`), nunca aceito do cliente.
- `activity_logs` não possui action de update/delete na aplicação.
