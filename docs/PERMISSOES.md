# Perfis e Permissões — Dark Code CRM

## Papéis

| Papel          | Descrição                                                                 |
| -------------- | ------------------------------------------------------------------------- |
| `ADMIN`        | Acesso total: usuários, permissões, financeiro, relatórios, configurações |
| `MANAGER`      | Gestor: projetos, clientes, tarefas, aprovação de prazos, financeiro, relatórios |
| `COLLABORATOR` | Colaborador: vê projetos em que participa, atualiza suas tarefas, solicita prazos |
| `CLIENT`       | Estrutura pronta para portal do cliente (fora do MVP)                     |

## Matriz de permissões (`lib/rbac.ts`)

| Permissão          | ADMIN | MANAGER | COLLABORATOR |
| ------------------ | :---: | :-----: | :----------: |
| users.manage       | ✅    |         |              |
| users.approve      | ✅    |         |              |
| clients.create     | ✅    | ✅      |              |
| clients.edit       | ✅    | ✅      |              |
| clients.archive    | ✅    | ✅      |              |
| clients.view       | ✅    | ✅      | ✅           |
| projects.create    | ✅    | ✅      |              |
| projects.edit      | ✅    | ✅      |              |
| projects.archive   | ✅    | ✅      |              |
| tasks.create       | ✅    | ✅      | ✅           |
| tasks.delegate     | ✅    | ✅      |              |
| tasks.deleteAny    | ✅    | ✅      |              |
| deadline.review    | ✅    | ✅      |              |
| finance.view       | ✅    | ✅      |              |
| finance.manage     | ✅    | ✅      |              |
| reports.view       | ✅    | ✅      |              |
| team.view          | ✅    | ✅      |              |
| settings.admin     | ✅    |         |              |

## Regras de posse (além da matriz)

Aplicadas dentro das server actions consultando o banco:

- **Tarefas**: colaborador só edita/conclui/comenta em tarefas nas quais é responsável,
  participante ou criador. Admin/gestor podem tudo.
- **Prazo de tarefa**: colaborador **não** altera `dueDate` diretamente — deve abrir uma
  *Solicitação de novo prazo*, que um gestor aprova/recusa/contrapropõe. A aprovação é
  registrada no histórico imutável com prazo anterior, novo prazo, revisor e data/hora.
- **Comentários**: só o autor edita; exclusão é lógica (autor ou admin).
- **Notificações**: usuário só marca como lidas as próprias.
- **Perfil**: usuário nunca altera o próprio papel/status/e-mail/username.
- **Admin**: não pode rebaixar/bloquear a si próprio nem o último admin ativo.
- **Financeiro/Relatórios/Equipe**: páginas fazem `requireRole("ADMIN","MANAGER")` no
  servidor; a navegação some da sidebar para quem não tem acesso, mas a proteção real é
  a do servidor.

## Onde a autorização acontece

1. `proxy.ts` — bloqueia navegação sem sessão válida.
2. `app/(app)/layout.tsx` — `requireUser()` (usuário ativo, revalidado no banco).
3. Página — `requireRole(...)` quando a rota inteira é restrita.
4. **Server action / route handler — `assertPermission` + verificação de posse (fonte da
   verdade; a UI apenas esconde o que o usuário não pode fazer).**
