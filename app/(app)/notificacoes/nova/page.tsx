import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth/current-user";
import { PageHeader } from "@/components/layout/page-header";
import { NotificationForm } from "../notification-form";
export const metadata = { title: "Nova notificação" };
export default async function NewNotificationPage() { await requireRole("ADMIN"); const users = await db.user.findMany({ where: { status: "ACTIVE", deletedAt: null }, select: { id: true, fullName: true, position: true }, orderBy: { fullName: "asc" } }); return <div className="mx-auto max-w-2xl animate-fade-in"><PageHeader title="Criar notificação" description="Envie um comunicado para uma pessoa ou para toda a equipe." /><NotificationForm users={users} /></div>; }
