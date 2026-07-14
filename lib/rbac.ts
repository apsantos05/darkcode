import type { UserRole } from "@/lib/constants";

/**
 * RBAC central do Dark Code CRM. Toda autorização de backend passa por aqui —
 * as server actions verificam permissões antes de qualquer escrita.
 */
export const PERMISSIONS = {
  "users.manage": ["ADMIN"],
  "users.approve": ["ADMIN"],
  "clients.create": ["ADMIN", "MANAGER"],
  "clients.edit": ["ADMIN", "MANAGER"],
  "clients.archive": ["ADMIN", "MANAGER"],
  "clients.view": ["ADMIN", "MANAGER", "COLLABORATOR"],
  "projects.create": ["ADMIN", "MANAGER"],
  "projects.edit": ["ADMIN", "MANAGER"],
  "projects.archive": ["ADMIN", "MANAGER"],
  "tasks.create": ["ADMIN", "MANAGER", "COLLABORATOR"],
  "tasks.delegate": ["ADMIN", "MANAGER"],
  "tasks.deleteAny": ["ADMIN", "MANAGER"],
  "deadline.review": ["ADMIN", "MANAGER"],
  "finance.view": ["ADMIN", "MANAGER"],
  "finance.manage": ["ADMIN", "MANAGER"],
  "reports.view": ["ADMIN", "MANAGER"],
  "team.view": ["ADMIN", "MANAGER"],
  "settings.admin": ["ADMIN"],
} as const satisfies Record<string, readonly UserRole[]>;

export type Permission = keyof typeof PERMISSIONS;

export function hasPermission(role: UserRole, permission: Permission): boolean {
  return (PERMISSIONS[permission] as readonly UserRole[]).includes(role);
}

/** Lança erro quando o papel não possui a permissão (uso em server actions). */
export function assertPermission(role: UserRole, permission: Permission): void {
  if (!hasPermission(role, permission)) {
    throw new Error("Você não tem permissão para executar esta ação.");
  }
}
