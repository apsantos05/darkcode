import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth/current-user";
import { db } from "@/lib/db";
import { PageHeader } from "@/components/layout/page-header";
import { updateUserAction } from "../../actions";
import { UserForm } from "../../user-form";
export const metadata = { title: "Editar usuário" };
export default async function EditUserPage({ params }: { params: Promise<{ id: string }> }) { await requireRole("ADMIN"); const { id } = await params; const user = await db.user.findFirst({ where: { id, deletedAt: null } }); if (!user) notFound(); return <div className="mx-auto max-w-3xl animate-fade-in"><PageHeader title={`Editar ${user.fullName}`} description="Altere o cargo, a área, o nível de acesso ou os dados de login." /><UserForm editing action={updateUserAction.bind(null, id)} defaults={{ fullName: user.fullName, username: user.username, email: user.email, position: user.position ?? "", area: user.area ?? "", role: user.role, status: user.status }} /></div>; }
