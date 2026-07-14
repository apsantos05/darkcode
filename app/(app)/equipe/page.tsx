import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth/current-user";
import { PageHeader } from "@/components/layout/page-header";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { USER_ROLES, USER_STATUS } from "@/lib/constants";

export default async function TeamPage() {
  await requireRole("ADMIN", "MANAGER");
  const users = await db.user.findMany({ where: { deletedAt: null }, orderBy: { fullName: "asc" }, include: { _count: { select: { tasksResponsible: true, projectMembers: true } } } });
  return <><PageHeader title="Equipe" description={`${users.length} integrantes cadastrados`} /><Table><THead><TR><TH>Nome</TH><TH>Cargo / área</TH><TH>Papel</TH><TH>Status</TH><TH>Projetos</TH><TH>Tarefas</TH></TR></THead><TBody>{users.map((u) => <TR key={u.id}><TD><p className="font-medium">{u.fullName}</p><p className="text-xs text-muted">{u.email}</p></TD><TD>{u.position ?? "—"}<br/><span className="text-xs text-muted">{u.area ?? ""}</span></TD><TD>{USER_ROLES[u.role as keyof typeof USER_ROLES] ?? u.role}</TD><TD>{USER_STATUS[u.status as keyof typeof USER_STATUS] ?? u.status}</TD><TD>{u._count.projectMembers}</TD><TD>{u._count.tasksResponsible}</TD></TR>)}</TBody></Table></>;
}
