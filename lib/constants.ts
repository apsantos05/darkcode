// Vocabulário de domínio do Dark Code CRM.
// Os valores (chaves) são persistidos no banco; os labels são exibidos em PT-BR.

export const USER_ROLES = {
  ADMIN: "Administrador",
  MANAGER: "Gestor",
  COLLABORATOR: "Colaborador",
  CLIENT: "Cliente",
} as const;
export type UserRole = keyof typeof USER_ROLES;

export const USER_STATUS = {
  PENDING: "Pendente",
  ACTIVE: "Ativo",
  BLOCKED: "Bloqueado",
} as const;
export type UserStatus = keyof typeof USER_STATUS;

export const AREAS = [
  "Tráfego",
  "Desenvolvimento",
  "Integrações",
  "Automações",
  "Gestão de projetos",
  "Comercial",
  "Administrativo",
  "Suporte",
] as const;

export const CLIENT_STATUS = {
  LEAD: "Lead",
  NEGOTIATION: "Em negociação",
  ONBOARDING: "Onboarding",
  ACTIVE: "Ativo",
  PAUSED: "Pausado",
  DEFAULTING: "Inadimplente",
  CLOSED: "Encerrado",
} as const;
export type ClientStatus = keyof typeof CLIENT_STATUS;

export const PROJECT_STATUS = {
  PLANNING: "Planejamento",
  IN_PROGRESS: "Em andamento",
  IN_REVIEW: "Em revisão",
  WAITING_CLIENT: "Aguardando cliente",
  PAUSED: "Pausado",
  DONE: "Concluído",
  CANCELED: "Cancelado",
  LATE: "Atrasado",
} as const;
export type ProjectStatus = keyof typeof PROJECT_STATUS;

export const TASK_STATUS = {
  NOT_STARTED: "Não iniciada",
  IN_ANALYSIS: "Em análise",
  IN_PROGRESS: "Em andamento",
  WAITING_CLIENT: "Aguardando cliente",
  WAITING_THIRD_PARTY: "Aguardando terceiro",
  IN_REVIEW: "Em revisão",
  DONE: "Concluída",
  BLOCKED: "Bloqueada",
  CANCELED: "Cancelada",
} as const;
export type TaskStatus = keyof typeof TASK_STATUS;

/** Status que encerram uma tarefa (não contam como atraso). */
export const TASK_CLOSED_STATUSES: TaskStatus[] = ["DONE", "CANCELED"];

export const PRIORITIES = {
  LOW: "Baixa",
  MEDIUM: "Média",
  HIGH: "Alta",
  URGENT: "Urgente",
  CRITICAL: "Crítica",
} as const;
export type Priority = keyof typeof PRIORITIES;

export const REVENUE_STATUS = {
  PENDING: "Pendente",
  PAID: "Pago",
  CANCELED: "Cancelado",
  REFUNDED: "Reembolsado",
  PARTIALLY_PAID: "Parcialmente pago",
} as const;
export type RevenueStatus = keyof typeof REVENUE_STATUS;

/** Status de receita que contam para o faturamento realizado. */
export const REVENUE_COUNTED_STATUSES = ["PAID", "PARTIALLY_PAID"] as const;

export const PAYMENT_METHODS = {
  PIX: "PIX",
  CARD: "Cartão",
  BOLETO: "Boleto",
  TRANSFER: "Transferência",
  CASH: "Dinheiro",
  OTHER: "Outro",
} as const;
export type PaymentMethod = keyof typeof PAYMENT_METHODS;

export const PLATFORMS = {
  MANUAL: "Manual",
  STRIPE: "Stripe",
  MERCADO_PAGO: "Mercado Pago",
  ASAAS: "Asaas",
  PAGARME: "Pagar.me",
  HOTMART: "Hotmart",
  KIWIFY: "Kiwify",
  EDUZZ: "Eduzz",
  BLACKCAT: "BlackCat",
  PERFECT_PAY: "Perfect Pay",
  BRAIP: "Braip",
  OTHER: "Outra",
} as const;
export type Platform = keyof typeof PLATFORMS;

export const DEADLINE_REQUEST_STATUS = {
  PENDING: "Pendente",
  APPROVED: "Aprovada",
  REJECTED: "Recusada",
  CANCELED: "Cancelada",
  COUNTERPROPOSAL: "Contraproposta",
} as const;
export type DeadlineRequestStatus = keyof typeof DEADLINE_REQUEST_STATUS;

export const NOTIFICATION_TYPES = {
  ANNOUNCEMENT: "Comunicado",
  TASK_ASSIGNED: "Nova tarefa atribuída",
  MENTION: "Menção em comentário",
  DEADLINE_CHANGED: "Mudança de prazo",
  TASK_DUE_SOON: "Tarefa próxima do vencimento",
  TASK_OVERDUE: "Tarefa vencida",
  DEADLINE_REQUEST: "Solicitação de prazo recebida",
  DEADLINE_APPROVED: "Solicitação de prazo aprovada",
  DEADLINE_REJECTED: "Solicitação de prazo recusada",
  PROJECT_UPDATED: "Projeto atualizado",
  USER_APPROVED: "Usuário aprovado",
  MISSION_ASSIGNED: "Nova missão atribuída",
  GOAL_UPDATED: "Meta atualizada",
} as const;
export type NotificationType = keyof typeof NOTIFICATION_TYPES;

export const GOAL_STATUS = {
  PLANNING: "Planejamento",
  IN_PROGRESS: "Em andamento",
  ACHIEVED: "Atingida",
  PAUSED: "Pausada",
  CANCELED: "Cancelada",
} as const;
export type GoalStatus = keyof typeof GOAL_STATUS;

export const MISSION_STATUS = {
  NOT_STARTED: "Não iniciada",
  IN_PROGRESS: "Em andamento",
  DONE: "Concluída",
  CANCELED: "Cancelada",
} as const;
export type MissionStatus = keyof typeof MISSION_STATUS;

export const PRIORITY_ORDER: Priority[] = ["CRITICAL", "URGENT", "HIGH", "MEDIUM", "LOW"];

export const KANBAN_COLUMNS: TaskStatus[] = [
  "NOT_STARTED",
  "IN_ANALYSIS",
  "IN_PROGRESS",
  "WAITING_CLIENT",
  "IN_REVIEW",
  "DONE",
];
