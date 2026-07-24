import {
  LayoutDashboard,
  ListTodo,
  ListChecks,
  FolderKanban,
  Users,
  Wallet,
  UsersRound,
  BarChart3,
  Bell,
  Settings,
  ShieldCheck,
  Target,
  Trophy,
  History,
  type LucideIcon,
} from "lucide-react";
import type { UserRole } from "@/lib/constants";

export type NavItem = {
  label: string;
  href: string;
  icon: LucideIcon;
  roles?: UserRole[]; // sem roles = visível para todos os papéis internos
};

export const NAV_ITEMS: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Minhas tarefas", href: "/tarefas/minhas", icon: ListTodo },
  { label: "Todas as tarefas", href: "/tarefas", icon: ListChecks },
  { label: "Metas", href: "/metas", icon: Target },
  { label: "Missões", href: "/missoes", icon: Trophy },
  { label: "Projetos", href: "/projetos", icon: FolderKanban },
  { label: "Clientes", href: "/clientes", icon: Users },
  { label: "Financeiro", href: "/financeiro", icon: Wallet, roles: ["ADMIN", "MANAGER"] },
  { label: "Equipe", href: "/equipe", icon: UsersRound, roles: ["ADMIN", "MANAGER"] },
  { label: "Relatórios", href: "/relatorios", icon: BarChart3, roles: ["ADMIN", "MANAGER"] },
  { label: "Notificações", href: "/notificacoes", icon: Bell },
  { label: "Histórico", href: "/historico", icon: History, roles: ["ADMIN", "MANAGER"] },
  { label: "Administração", href: "/admin/usuarios", icon: ShieldCheck, roles: ["ADMIN"] },
  { label: "Configurações", href: "/configuracoes", icon: Settings },
];

export function navItemsForRole(role: UserRole): NavItem[] {
  return NAV_ITEMS.filter((item) => !item.roles || item.roles.includes(role));
}
