import type { Permission } from "@/lib/rbac";
import type { UserRole } from "@/lib/constants";

/** Labels PT-BR para a matriz de permissões (lib/rbac.ts). */
export const PERMISSION_LABELS: Record<Permission, string> = {
  "users.manage": "Gerenciar usuários (papel, área, cargo e bloqueio)",
  "users.approve": "Aprovar ou recusar novos cadastros",
  "clients.create": "Cadastrar clientes",
  "clients.edit": "Editar clientes",
  "clients.archive": "Arquivar clientes",
  "clients.view": "Visualizar clientes",
  "projects.create": "Criar projetos",
  "projects.edit": "Editar projetos",
  "projects.archive": "Arquivar projetos",
  "tasks.create": "Criar tarefas",
  "tasks.delegate": "Delegar tarefas para outros membros",
  "tasks.deleteAny": "Excluir qualquer tarefa",
  "deadline.review": "Avaliar solicitações de prazo",
  "finance.view": "Visualizar o financeiro",
  "finance.manage": "Gerenciar lançamentos financeiros",
  "reports.view": "Visualizar relatórios",
  "team.view": "Visualizar a equipe",
  "settings.admin": "Administrar configurações do sistema",
};

/** Descrição de cada papel exibida nas páginas de administração e configurações. */
export const ROLE_DESCRIPTIONS: Record<UserRole, string> = {
  ADMIN:
    "Acesso total ao sistema: gerencia usuários, aprova cadastros, administra configurações e visualiza todas as áreas, incluindo financeiro e relatórios.",
  MANAGER:
    "Gestor de operação: gerencia clientes, projetos e tarefas, avalia solicitações de prazo e acompanha financeiro, relatórios e equipe. Não administra usuários.",
  COLLABORATOR:
    "Colaborador interno: cria e executa tarefas, visualiza clientes e projetos em que participa. Sem acesso a financeiro, relatórios ou administração.",
  CLIENT:
    "Cliente externo: acesso restrito ao acompanhamento do que for compartilhado com ele. Não visualiza dados internos da operação.",
};
