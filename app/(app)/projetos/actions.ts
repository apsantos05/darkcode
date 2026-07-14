"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth/current-user";
import { assertPermission } from "@/lib/rbac";
import { logActivity, notify, notifyMany } from "@/lib/activity";
import { projectSchema } from "@/lib/validators/project";
import { PROJECT_STATUS, type ProjectStatus } from "@/lib/constants";

export type ActionResult = {
  ok: boolean;
  message?: string;
  fieldErrors?: Record<string, string[]>;
};

function fieldErrorsFrom(error: {
  flatten: () => { fieldErrors: Record<string, string[] | undefined> };
}): Record<string, string[]> {
  const flat = error.flatten().fieldErrors;
  return Object.fromEntries(
    Object.entries(flat).filter(([, v]) => v !== undefined),
  ) as Record<string, string[]>;
}

function str(formData: FormData, key: string): string | undefined {
  const value = formData.get(key);
  return typeof value === "string" ? value : undefined;
}

function parseProjectForm(formData: FormData) {
  return projectSchema.safeParse({
    name: str(formData, "name") ?? "",
    clientId: str(formData, "clientId") ?? "",
    description: str(formData, "description"),
    scope: str(formData, "scope"),
    managerId: str(formData, "managerId"),
    startDate: str(formData, "startDate"),
    dueDate: str(formData, "dueDate"),
    contractCents: str(formData, "contract"),
    receivedCents: str(formData, "received"),
    status: str(formData, "status") ?? "",
    priority: str(formData, "priority") ?? "",
    links: str(formData, "links"),
    notes: str(formData, "notes"),
    memberIds: formData.getAll("memberIds").filter((v): v is string => typeof v === "string"),
  });
}

/** Valida referências de cliente/gestor/membros; retorna erro de campo quando inválidas. */
async function validateReferences(data: {
  clientId: string;
  managerId: string | null;
  memberIds: string[];
}): Promise<Record<string, string[]> | null> {
  const client = await db.client.findUnique({
    where: { id: data.clientId },
    select: { id: true },
  });
  if (!client) return { clientId: ["Cliente não encontrado"] };

  if (data.managerId) {
    const manager = await db.user.findFirst({
      where: {
        id: data.managerId,
        deletedAt: null,
        status: "ACTIVE",
        role: { in: ["ADMIN", "MANAGER"] },
      },
      select: { id: true },
    });
    if (!manager) return { managerId: ["Gestor inválido"] };
  }

  if (data.memberIds.length > 0) {
    const validCount = await db.user.count({
      where: { id: { in: data.memberIds }, deletedAt: null, status: "ACTIVE" },
    });
    if (validCount !== new Set(data.memberIds).size) {
      return { memberIds: ["Um ou mais membros selecionados são inválidos"] };
    }
  }
  return null;
}

export async function createProjectAction(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const user = await requireUser();
  assertPermission(user.role, "projects.create");

  const parsed = parseProjectForm(formData);
  if (!parsed.success) {
    return { ok: false, fieldErrors: fieldErrorsFrom(parsed.error) };
  }
  const data = parsed.data;

  const refErrors = await validateReferences(data);
  if (refErrors) return { ok: false, fieldErrors: refErrors };

  const memberIds = [...new Set(data.memberIds)];

  const project = await db.project.create({
    data: {
      name: data.name,
      clientId: data.clientId,
      description: data.description,
      scope: data.scope,
      managerId: data.managerId,
      startDate: data.startDate,
      dueDate: data.dueDate,
      contractCents: data.contractCents,
      receivedCents: data.receivedCents,
      status: data.status,
      priority: data.priority,
      links: data.links,
      notes: data.notes,
      members: {
        createMany: { data: memberIds.map((userId) => ({ userId })) },
      },
    },
  });

  await logActivity({
    actorId: user.id,
    entityType: "PROJECT",
    entityId: project.id,
    action: "CREATED",
    message: `Projeto "${project.name}" criado`,
  });

  await notifyMany(
    memberIds.filter((id) => id !== user.id),
    {
      type: "PROJECT_UPDATED",
      title: "Projeto atualizado",
      body: `Você foi adicionado ao projeto ${project.name}`,
      link: `/projetos/${project.id}`,
    },
  );

  revalidatePath("/projetos");
  redirect(`/projetos/${project.id}`);
}

export async function updateProjectAction(
  projectId: string,
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const user = await requireUser();
  assertPermission(user.role, "projects.edit");

  const existing = await db.project.findUnique({
    where: { id: projectId },
    include: { members: { select: { userId: true } } },
  });
  if (!existing) {
    return { ok: false, message: "Projeto não encontrado." };
  }

  const parsed = parseProjectForm(formData);
  if (!parsed.success) {
    return { ok: false, fieldErrors: fieldErrorsFrom(parsed.error) };
  }
  const data = parsed.data;

  const refErrors = await validateReferences(data);
  if (refErrors) return { ok: false, fieldErrors: refErrors };

  const memberIds = [...new Set(data.memberIds)];
  const currentMemberIds = existing.members.map((m) => m.userId);
  const toAdd = memberIds.filter((id) => !currentMemberIds.includes(id));
  const toRemove = currentMemberIds.filter((id) => !memberIds.includes(id));

  await db.$transaction([
    db.project.update({
      where: { id: projectId },
      data: {
        name: data.name,
        clientId: data.clientId,
        description: data.description,
        scope: data.scope,
        managerId: data.managerId,
        startDate: data.startDate,
        dueDate: data.dueDate,
        contractCents: data.contractCents,
        receivedCents: data.receivedCents,
        status: data.status,
        priority: data.priority,
        links: data.links,
        notes: data.notes,
      },
    }),
    ...(toRemove.length > 0
      ? [db.projectMember.deleteMany({ where: { projectId, userId: { in: toRemove } } })]
      : []),
    ...(toAdd.length > 0
      ? [
          db.projectMember.createMany({
            data: toAdd.map((userId) => ({ projectId, userId })),
          }),
        ]
      : []),
  ]);

  await logActivity({
    actorId: user.id,
    entityType: "PROJECT",
    entityId: projectId,
    action: "UPDATED",
    message: `Projeto "${data.name}" atualizado`,
  });

  const statusChanged = existing.status !== data.status;
  if (statusChanged) {
    const oldLabel = PROJECT_STATUS[existing.status as ProjectStatus] ?? existing.status;
    const newLabel = PROJECT_STATUS[data.status];
    await logActivity({
      actorId: user.id,
      entityType: "PROJECT",
      entityId: projectId,
      action: "STATUS_CHANGED",
      oldValue: existing.status,
      newValue: data.status,
      message: `Status alterado de "${oldLabel}" para "${newLabel}"`,
    });
    await notifyMany(
      memberIds.filter((id) => id !== user.id),
      {
        type: "PROJECT_UPDATED",
        title: "Projeto atualizado",
        body: `${data.name} mudou para ${newLabel}`,
        link: `/projetos/${projectId}`,
      },
    );
  }

  revalidatePath("/projetos");
  revalidatePath(`/projetos/${projectId}`);
  redirect(`/projetos/${projectId}`);
}

export async function archiveProjectAction(projectId: string): Promise<ActionResult> {
  const user = await requireUser();
  assertPermission(user.role, "projects.archive");

  const project = await db.project.findUnique({
    where: { id: projectId },
    select: { id: true, name: true, archivedAt: true },
  });
  if (!project) return { ok: false, message: "Projeto não encontrado." };
  if (project.archivedAt) return { ok: false, message: "Este projeto já está arquivado." };

  await db.project.update({
    where: { id: projectId },
    data: { archivedAt: new Date() },
  });

  await logActivity({
    actorId: user.id,
    entityType: "PROJECT",
    entityId: projectId,
    action: "ARCHIVED",
    message: `Projeto "${project.name}" arquivado`,
  });

  revalidatePath("/projetos");
  revalidatePath(`/projetos/${projectId}`);
  return { ok: true, message: "Projeto arquivado com sucesso." };
}

export async function unarchiveProjectAction(projectId: string): Promise<ActionResult> {
  const user = await requireUser();
  assertPermission(user.role, "projects.archive");

  const project = await db.project.findUnique({
    where: { id: projectId },
    select: { id: true, name: true, archivedAt: true },
  });
  if (!project) return { ok: false, message: "Projeto não encontrado." };
  if (!project.archivedAt) return { ok: false, message: "Este projeto não está arquivado." };

  await db.project.update({
    where: { id: projectId },
    data: { archivedAt: null },
  });

  await logActivity({
    actorId: user.id,
    entityType: "PROJECT",
    entityId: projectId,
    action: "UNARCHIVED",
    message: `Projeto "${project.name}" desarquivado`,
  });

  revalidatePath("/projetos");
  revalidatePath(`/projetos/${projectId}`);
  return { ok: true, message: "Projeto desarquivado com sucesso." };
}

export async function addMemberAction(
  projectId: string,
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const user = await requireUser();
  assertPermission(user.role, "projects.edit");

  const userId = str(formData, "userId")?.trim();
  if (!userId) {
    return { ok: false, fieldErrors: { userId: ["Selecione um usuário"] } };
  }

  const project = await db.project.findUnique({
    where: { id: projectId },
    select: { id: true, name: true },
  });
  if (!project) return { ok: false, message: "Projeto não encontrado." };

  const member = await db.user.findFirst({
    where: { id: userId, deletedAt: null, status: "ACTIVE" },
    select: { id: true, fullName: true },
  });
  if (!member) {
    return { ok: false, fieldErrors: { userId: ["Usuário inválido ou inativo"] } };
  }

  const already = await db.projectMember.findUnique({
    where: { projectId_userId: { projectId, userId } },
  });
  if (already) {
    return { ok: false, fieldErrors: { userId: ["Este usuário já é membro do projeto"] } };
  }

  await db.projectMember.create({ data: { projectId, userId } });

  await logActivity({
    actorId: user.id,
    entityType: "PROJECT",
    entityId: projectId,
    action: "MEMBER_ADDED",
    newValue: userId,
    message: `${member.fullName} adicionado(a) ao projeto`,
  });

  if (userId !== user.id) {
    await notify({
      userId,
      type: "PROJECT_UPDATED",
      title: "Projeto atualizado",
      body: `Você foi adicionado ao projeto ${project.name}`,
      link: `/projetos/${projectId}`,
    });
  }

  revalidatePath(`/projetos/${projectId}`);
  return { ok: true, message: "Membro adicionado com sucesso." };
}

export async function removeMemberAction(projectId: string, userId: string): Promise<ActionResult> {
  const user = await requireUser();
  assertPermission(user.role, "projects.edit");

  const membership = await db.projectMember.findUnique({
    where: { projectId_userId: { projectId, userId } },
    include: { user: { select: { fullName: true } } },
  });
  if (!membership) {
    return { ok: false, message: "Este usuário não é membro do projeto." };
  }

  await db.projectMember.delete({ where: { id: membership.id } });

  await logActivity({
    actorId: user.id,
    entityType: "PROJECT",
    entityId: projectId,
    action: "MEMBER_REMOVED",
    oldValue: userId,
    message: `${membership.user.fullName} removido(a) do projeto`,
  });

  revalidatePath(`/projetos/${projectId}`);
  return { ok: true, message: "Membro removido com sucesso." };
}
