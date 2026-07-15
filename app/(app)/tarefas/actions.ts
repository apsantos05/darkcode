"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth/current-user";
import { assertPermission, hasPermission } from "@/lib/rbac";
import { logActivity, notifyMany } from "@/lib/activity";
import { taskFormSchema } from "@/lib/validators/task";
export type TaskActionResult = { ok: boolean; message?: string; fieldErrors?: Record<string, string[]> };
function str(data: FormData, key: string) { const value = data.get(key); return typeof value === "string" ? value : ""; }
export async function createTaskAction(_prev: TaskActionResult | null, formData: FormData): Promise<TaskActionResult> {
  const user = await requireUser(); assertPermission(user.role, "tasks.create");
  const parsed = taskFormSchema.safeParse({ title: str(formData, "title"), description: str(formData, "description"), projectId: str(formData, "projectId"), responsibleId: str(formData, "responsibleId"), participantIds: formData.getAll("participantIds").filter((v): v is string => typeof v === "string"), priority: str(formData, "priority"), status: str(formData, "status"), startDate: str(formData, "startDate"), dueDate: str(formData, "dueDate"), estimatedHours: str(formData, "estimatedHours"), tagNames: str(formData, "tagNames"), dependsOnId: str(formData, "dependsOnId"), blockReason: str(formData, "blockReason") });
  if (!parsed.success) return { ok: false, fieldErrors: Object.fromEntries(Object.entries(parsed.error.flatten().fieldErrors).filter(([, v]) => v)) as Record<string, string[]> };
  const data = parsed.data;
  if (!hasPermission(user.role, "tasks.delegate") && data.responsibleId && data.responsibleId !== user.id) return { ok: false, fieldErrors: { responsibleId: ["Você só pode atribuir tarefas a si mesmo."] } };
  const participantIds = [...new Set(data.participantIds)]; const userIds = [...new Set([...(data.responsibleId ? [data.responsibleId] : []), ...participantIds])];
  if (userIds.length && await db.user.count({ where: { id: { in: userIds }, status: "ACTIVE", deletedAt: null } }) !== userIds.length) return { ok: false, message: "Um dos usuários selecionados não está disponível." };
  let clientId: string | undefined;
  if (data.projectId) { const project = await db.project.findFirst({ where: { id: data.projectId, archivedAt: null }, select: { clientId: true } }); if (!project) return { ok: false, fieldErrors: { projectId: ["Projeto não encontrado."] } }; clientId = project.clientId; }
  if (data.dependsOnId && !await db.task.findFirst({ where: { id: data.dependsOnId, archivedAt: null }, select: { id: true } })) return { ok: false, fieldErrors: { dependsOnId: ["Tarefa dependente não encontrada."] } };
  const tagNames = [...new Set((data.tagNames ?? "").split(",").map((tag) => tag.trim()).filter(Boolean))].slice(0, 10);
  const task = await db.task.create({
    data: {
      title: data.title, description: data.description, projectId: data.projectId,
      clientId, creatorId: user.id, responsibleId: data.responsibleId,
      priority: data.priority, status: data.status, startDate: data.startDate,
      dueDate: data.dueDate, estimatedHours: data.estimatedHours,
      dependsOnId: data.dependsOnId, blockReason: data.blockReason,
      completedAt: data.status === "DONE" ? new Date() : undefined,
      assignees: { createMany: { data: participantIds.map((userId) => ({ userId })) } },
      tags: { create: tagNames.map((name) => ({ tag: { connectOrCreate: { where: { name }, create: { name } } } })) },
    },
  });
  await logActivity({ actorId: user.id, entityType: "TASK", entityId: task.id, action: "CREATED", message: `Tarefa "${task.title}" criada` });
  await notifyMany(userIds.filter((id) => id !== user.id), { type: "TASK_ASSIGNED", title: "Nova tarefa atribuída", body: task.title, link: `/tarefas/${task.id}` });
  revalidatePath("/tarefas"); revalidatePath("/tarefas/minhas"); if (task.projectId) revalidatePath(`/projetos/${task.projectId}`); redirect(`/tarefas/${task.id}`);
}
