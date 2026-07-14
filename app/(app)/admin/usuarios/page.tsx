import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth/current-user";
import { PageHeader } from "@/components/layout/page-header";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { USER_ROLES, USER_STATUS } from "@/lib/constants";

export default async function AdminUsersPage() {
  await requireRole("ADMIN");
  const users = await db.user.findMany({ where: { deletedAt: null }, orderBy: [{ status: "asc" }, { createdAt: "desc" }] });
  return <><PageHeader title="Administração de usuários" description="Papéis e estados sempre verificados no servidor" /><Table><THead><TR><TH>Usuário</TH><TH>Papel</TH><TH>Status</TH><TH>Criado em</TH></TR></THead><TBody>{users.map((u) => <TR key={u.id}><TD><p className="font-medium">{u.fullName}</p><p className="text-xs text-muted">{u.email} · @{u.username}</p></TD><TD>{USER_ROLES[u.role as keyof typeof USER_ROLES] ?? u.role}</TD><TD>{USER_STATUS[u.status as keyof typeof USER_STATUS] ?? u.status}</TD><TD>{u.createdAt.toLocaleDateString("pt-BR")}</TD></TR>)}</TBody></Table></>;
}
