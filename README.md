# Dark Code CRM

Central de comando interna da equipe **Dark Code**: usuários, clientes, projetos,
tarefas, prazos (com fluxo de solicitação/aprovação), faturamento, notificações,
relatórios e auditoria — em uma interface dark premium com identidade roxo neon.

> Documentação complementar: [ARQUITETURA](docs/ARQUITETURA.md) ·
> [BANCO-DE-DADOS](docs/BANCO-DE-DADOS.md) · [PERMISSOES](docs/PERMISSOES.md) ·
> [TESTES](docs/TESTES.md)

## Stack

- **Next.js 16** (App Router) + **React 19** + **TypeScript**
- **Tailwind CSS v4** + kit de componentes próprio (estilo shadcn) + Lucide Icons
- **Prisma 6** + **PostgreSQL no Supabase**
- Autenticação própria: sessão **JWT (jose)** em cookie httpOnly + **bcryptjs**
- **Zod** (validação servidor), **Recharts** (gráficos), **date-fns** (America/Sao_Paulo),
  **Sonner** (toasts), **@dnd-kit** (kanban)

## Pré-requisitos

- Node.js 20+
- npm 10+

## Instalação e execução local

```bash
git clone <repo> && cd dashdark
npm install

# 1. Ambiente
cp .env.example .env       # preencha AUTH_SECRET (openssl rand -base64 32)

# 2. Banco PostgreSQL/Supabase + migrations
npx prisma migrate dev

# 3. (Opcional) dados de demonstração
npm run db:seed

# 4. Rodar
npm run dev                # http://localhost:3000
```

## Variáveis de ambiente (`.env.example`)

| Variável       | Descrição                                                        |
| -------------- | ---------------------------------------------------------------- |
| `DATABASE_URL` | Conexão PostgreSQL da aplicação (pooler em produção)             |
| `DIRECT_URL`   | Conexão direta PostgreSQL usada exclusivamente por migrations     |
| `AUTH_SECRET`  | Segredo de assinatura da sessão (obrigatório; gere um aleatório) |
| `APP_URL`      | URL pública (links de e-mail/notificação)                        |
| `SMTP_*`       | Opcional — envio real do e-mail de recuperação de senha          |

Nenhum segredo é versionado; o frontend nunca recebe chaves.

## Como criar o primeiro administrador

**Opção A (recomendada):** com o banco vazio, acesse `/cadastro` e crie sua conta —
**o primeiro usuário do sistema vira administrador ativo automaticamente**. Os
cadastros seguintes entram como *pendentes* e precisam de aprovação em
`/admin/usuarios`.

**Opção B (demonstração):** rode `npm run db:seed` e entre com
`admin@darkcode.dev` / `DarkCode123` (credenciais apenas de desenvolvimento).

## Supabase / PostgreSQL (produção)

O banco definitivo é PostgreSQL no Supabase:

1. Configure a URL com pooler em `DATABASE_URL` e a conexão direta em `DIRECT_URL`.
2. Aplique migrations com `npm run db:deploy` em produção.
3. Execute `npm run db:seed` somente em desenvolvimento ou homologação.
4. A autorização é aplicada no servidor (RBAC + posse); o banco não é acessado pelo frontend.

## Scripts

| Comando             | Ação                                   |
| ------------------- | -------------------------------------- |
| `npm run dev`       | Servidor de desenvolvimento            |
| `npm run build`     | Build de produção                      |
| `npm run start`     | Servir build                           |
| `npm run lint`      | ESLint                                 |
| `npm run typecheck` | TypeScript estrito (`tsc --noEmit`)    |
| `npm run db:migrate`| `prisma migrate dev`                   |
| `npm run db:seed`   | Seed de demonstração                   |
| `npm run db:reset`  | Zera o banco e reaplica migrations+seed|

## Estrutura de pastas (resumo)

```
app/(auth)/      login, cadastro, recuperar/redefinir senha
app/(app)/       dashboard, tarefas, projetos, clientes, financeiro,
                 equipe, admin, relatorios, notificacoes, perfil, configuracoes
components/ui/   kit de componentes (button, card, dialog, table, …)
components/layout/  sidebar, header, menus
lib/             db, auth, rbac, activity, constants, format, validators
prisma/          schema, migrations, seed
uploads/         anexos (servidos com autenticação via /api/uploads)
```

Detalhes em [docs/ARQUITETURA.md](docs/ARQUITETURA.md).

## Perfis e permissões

- **Administrador** — tudo, incluindo aprovação de usuários e configurações.
- **Gestor** — clientes, projetos, tarefas, aprovação de prazos, financeiro, relatórios.
- **Colaborador** — suas tarefas/projetos, comentários, horas, solicitação de prazos.
- **Cliente** — estrutura pronta (portal fora do MVP).

A matriz completa e as regras de posse estão em [docs/PERMISSOES.md](docs/PERMISSOES.md).
**Toda autorização é aplicada no backend** (server actions), não apenas na UI.

## Testes

Validação atual: typecheck + lint + build + roteiro funcional manual
([docs/TESTES.md](docs/TESTES.md)). Recomendado para a próxima versão: Vitest + Playwright.

## Deploy

1. Provisione um Postgres (Supabase/Neon/RDS) e configure `DATABASE_URL` + `AUTH_SECRET`.
2. `npx prisma migrate deploy` no pipeline.
3. `npm run build` + `npm run start` (ou Vercel; nesse caso, mova os anexos de
   `uploads/` para um storage externo, pois o filesystem é efêmero).

## Limitações atuais

- E-mail de recuperação: sem SMTP configurado, o link aparece no log do servidor (dev).
- Rate limiting em memória (instância única).
- Anexos em disco local (`uploads/`).
- Sem testes automatizados (ver docs/TESTES.md).
- Portal do cliente e integrações de gateway (webhook stub pronto) fora do MVP.

## Próximas etapas sugeridas

1. Migrar para PostgreSQL/Supabase + storage externo de anexos.
2. Integrações reais de gateways via `/api/webhooks/revenues`.
3. Testes automatizados + CI.
4. Portal do cliente (papel `CLIENT` já existe).
5. Notificações por e-mail/WhatsApp e lembretes agendados de vencimento.
