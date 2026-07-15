import Link from "next/link";
import { Pencil, Plus } from "lucide-react";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth/current-user";
import { PageHeader } from "@/components/layout/page-header";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { buttonVariants } from "@/components/ui/button";
import { USER_ROLES, USER_STATUS } from "@/lib/constants";
import { RemoveUserButton } from "./remove-user-button";
export default async function AdminUsersPage() {
  const currentUser = await requireRole("ADMIN");
  const users = await db.user.findMany({ where: { deletedAt: null }, orderBy: [{ status: "asc" }, { createdAt: "desc" }] });
  return <><PageHeader title="Administração de usuários" description="Crie acessos, defina cargos e controle as permissões." actions={<Link href="/admin/usuarios/novo" className={buttonVariants()}><Plus className="h-4 w-4" />Novo usuário</Link>} /><Table><THead><TR><TH>Usuário</TH><TH>Cargo / área</TH><TH>Papel</TH><TH>Status</TH><TH>Ações</TH></TR></THead><TBody>{users.map((u) => <TR key={u.id}><TD><p className="font-medium">{u.fullName}</p><p className="text-xs text-muted">{u.email} · @{u.username}</p></TD><TD><p>{u.position ?? "Sem cargo"}</p><p className="text-xs text-muted">{u.area ?? "Sem área"}</p></TD><TD>{USER_ROLES[u.role as keyof typeof USER_ROLES] ?? u.role}</TD><TD>{USER_STATUS[u.status as keyof typeof USER_STATUS] ?? u.status}</TD><TD><div className="flex gap-2"><Link aria-label={`Editar ${u.fullName}`} href={`/admin/usuarios/${u.id}/editar`} className={buttonVariants({ variant: "secondary", size: "iconSm" })}><Pencil className="h-4 w-4" /></Link>{u.id !== currentUser.id && <RemoveUserButton id={u.id} name={u.fullName} />}</div></TD></TR>)}</TBody></Table></>;
}
