import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth/current-user";
import { hasPermission } from "@/lib/rbac";
import { PageHeader } from "@/components/layout/page-header";
import { createTaskAction } from "../actions";
import { TaskForm } from "../task-form";
export const metadata = { title: "Nova tarefa" };
export default async function NewTaskPage({ searchParams }: { searchParams: Promise<{ projeto?: string }> }) {
  const user = await requireUser(); const { projeto = "" } = await searchParams;
  const [projects, availableUsers, tasks] = await Promise.all([
    db.project.findMany({ where: { archivedAt: null }, select: { id: true, name: true }, orderBy: { name: "asc" } }),
    db.user.findMany({ where: { status: "ACTIVE", deletedAt: null, role: { not: "CLIENT" }, ...(!hasPermission(user.role, "tasks.delegate") ? { id: user.id } : {}) }, select: { id: true, fullName: true, position: true }, orderBy: { fullName: "asc" } }),
    db.task.findMany({ where: { archivedAt: null }, select: { id: true, title: true }, orderBy: { createdAt: "desc" }, take: 100 }),
  ]);
  return <div className="mx-auto max-w-3xl animate-fade-in"><PageHeader title="Nova tarefa" description="Defina responsáveis, prazo, prioridade e participantes." /><TaskForm action={createTaskAction} projects={projects} users={availableUsers} tasks={tasks.map((task) => ({ id: task.id, name: task.title }))} projectId={projects.some((p) => p.id === projeto) ? projeto : ""} /></div>;
}
