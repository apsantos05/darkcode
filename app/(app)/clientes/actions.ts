"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth/current-user";
import { assertPermission, type Permission } from "@/lib/rbac";
import { logActivity } from "@/lib/activity";
import { clientSchema, CLIENT_FIELD_LABELS, type ClientInput } from "@/lib/validators/client";
import type { CurrentUser } from "@/lib/auth/current-user";

export type ActionResult = {
  ok: boolean;
  message?: string;
  fieldErrors?: Record<string, string[]>;
  /** Id do cliente criado/atualizado — usado pelo formulário para redirecionar. */
  clientId?: string;
};

function fieldErrorsFrom(error: {
  flatten: () => { fieldErrors: Record<string, string[] | undefined> };
}): Record<string, string[]> {
  const flat = error.flatten().fieldErrors;
  return Object.fromEntries(
    Object.entries(flat).filter(([, v]) => v !== undefined),
  ) as Record<string, string[]>;
}

/** Extrai os campos do formulário como strings (FormData pode conter File/null). */
function rawFromForm(formData: FormData) {
  const str = (key: string): string => {
    const value = formData.get(key);
    return typeof value === "string" ? value : "";
  };
  return {
    legalName: str("legalName"),
    tradeName: str("tradeName"),
    document: str("document"),
    contactName: str("contactName"),
    email: str("email"),
    phone: str("phone"),
    whatsapp: str("whatsapp"),
    website: str("website"),
    segment: str("segment"),
    product: str("product"),
    contract: str("contract"),
    startDate: str("startDate"),
    ownerId: str("ownerId"),
    status: str("status"),
    notes: str("notes"),
    links: str("links"),
  };
}

/** Mapeia a saída do schema para o shape persistido no Prisma. */
function dataFromParsed(input: ClientInput) {
  return {
    legalName: input.legalName,
    tradeName: input.tradeName,
    document: input.document,
    contactName: input.contactName,
    email: input.email,
    phone: input.phone,
    whatsapp: input.whatsapp,
    website: input.website,
    segment: input.segment,
    product: input.product,
    contractCents: input.contract,
    startDate: input.startDate,
    ownerId: input.ownerId,
    status: input.status,
    notes: input.notes,
    links: input.links.length > 0 ? JSON.stringify(input.links) : null,
  };
}

type ClientData = ReturnType<typeof dataFromParsed>;

/** Autoriza a ação; retorna ActionResult de erro quando não permitido. */
async function authorize(permission: Permission): Promise<
  { ok: true; user: CurrentUser } | { ok: false; result: ActionResult }
> {
  const user = await requireUser();
  try {
    assertPermission(user.role, permission);
  } catch (error) {
    return {
      ok: false,
      result: { ok: false, message: (error as Error).message },
    };
  }
  return { ok: true, user };
}

/** Garante que o responsável interno informado existe e está ativo. */
async function validateOwner(ownerId: string | null): Promise<ActionResult | null> {
  if (!ownerId) return null;
  const owner = await db.user.findFirst({
    where: { id: ownerId, deletedAt: null, status: "ACTIVE" },
    select: { id: true },
  });
  if (!owner) {
    return { ok: false, fieldErrors: { ownerId: ["Responsável interno inválido"] } };
  }
  return null;
}

export async function createClientAction(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const auth = await authorize("clients.create");
  if (!auth.ok) return auth.result;

  const parsed = clientSchema.safeParse(rawFromForm(formData));
  if (!parsed.success) {
    return {
      ok: false,
      message: "Verifique os campos destacados.",
      fieldErrors: fieldErrorsFrom(parsed.error),
    };
  }

  const data = dataFromParsed(parsed.data);
  const ownerError = await validateOwner(data.ownerId);
  if (ownerError) return ownerError;

  const client = await db.client.create({ data });

  await logActivity({
    actorId: auth.user.id,
    entityType: "CLIENT",
    entityId: client.id,
    action: "CREATED",
    message: `Cliente "${client.legalName}" criado`,
    newValue: data,
  });

  revalidatePath("/clientes");
  return { ok: true, message: "Cliente criado com sucesso!", clientId: client.id };
}

export async function updateClientAction(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const auth = await authorize("clients.edit");
  if (!auth.ok) return auth.result;

  const id = formData.get("id");
  if (typeof id !== "string" || id.length === 0) {
    return { ok: false, message: "Cliente inválido." };
  }

  const existing = await db.client.findUnique({ where: { id } });
  if (!existing) {
    return { ok: false, message: "Cliente não encontrado." };
  }

  const parsed = clientSchema.safeParse(rawFromForm(formData));
  if (!parsed.success) {
    return {
      ok: false,
      message: "Verifique os campos destacados.",
      fieldErrors: fieldErrorsFrom(parsed.error),
    };
  }

  const data = dataFromParsed(parsed.data);
  const ownerError = await validateOwner(data.ownerId);
  if (ownerError) return ownerError;

  // Diff dos campos relevantes para o histórico de auditoria.
  const fields = Object.keys(data) as (keyof ClientData)[];
  const oldValue: Record<string, unknown> = {};
  const newValue: Record<string, unknown> = {};
  for (const field of fields) {
    const before =
      field === "startDate" ? (existing.startDate?.toISOString() ?? null) : existing[field];
    const after =
      field === "startDate" ? (data.startDate?.toISOString() ?? null) : data[field];
    if (before !== after) {
      oldValue[field] = before;
      newValue[field] = after;
    }
  }

  await db.client.update({ where: { id }, data });

  const changedFields = Object.keys(newValue);
  if (changedFields.length > 0) {
    const labels = changedFields
      .map((field) => CLIENT_FIELD_LABELS[field] ?? field)
      .join(", ");
    await logActivity({
      actorId: auth.user.id,
      entityType: "CLIENT",
      entityId: id,
      action: newValue.status !== undefined && changedFields.length === 1 ? "STATUS_CHANGED" : "UPDATED",
      message: `Cliente atualizado — campos alterados: ${labels}`,
      oldValue,
      newValue,
    });
  }

  revalidatePath("/clientes");
  revalidatePath(`/clientes/${id}`);
  return { ok: true, message: "Cliente atualizado com sucesso!", clientId: id };
}

export async function archiveClientAction(clientId: string): Promise<ActionResult> {
  const auth = await authorize("clients.archive");
  if (!auth.ok) return auth.result;

  if (typeof clientId !== "string" || clientId.length === 0) {
    return { ok: false, message: "Cliente inválido." };
  }

  const client = await db.client.findUnique({ where: { id: clientId } });
  if (!client) return { ok: false, message: "Cliente não encontrado." };
  if (client.archivedAt) return { ok: false, message: "Este cliente já está arquivado." };

  const archivedAt = new Date();
  await db.client.update({ where: { id: clientId }, data: { archivedAt } });

  await logActivity({
    actorId: auth.user.id,
    entityType: "CLIENT",
    entityId: clientId,
    action: "ARCHIVED",
    message: `Cliente "${client.legalName}" arquivado`,
    oldValue: { archivedAt: null },
    newValue: { archivedAt: archivedAt.toISOString() },
  });

  revalidatePath("/clientes");
  revalidatePath(`/clientes/${clientId}`);
  return { ok: true, message: "Cliente arquivado." };
}

export async function unarchiveClientAction(clientId: string): Promise<ActionResult> {
  const auth = await authorize("clients.archive");
  if (!auth.ok) return auth.result;

  if (typeof clientId !== "string" || clientId.length === 0) {
    return { ok: false, message: "Cliente inválido." };
  }

  const client = await db.client.findUnique({ where: { id: clientId } });
  if (!client) return { ok: false, message: "Cliente não encontrado." };
  if (!client.archivedAt) return { ok: false, message: "Este cliente não está arquivado." };

  await db.client.update({ where: { id: clientId }, data: { archivedAt: null } });

  await logActivity({
    actorId: auth.user.id,
    entityType: "CLIENT",
    entityId: clientId,
    action: "UNARCHIVED",
    message: `Cliente "${client.legalName}" restaurado`,
    oldValue: { archivedAt: client.archivedAt.toISOString() },
    newValue: { archivedAt: null },
  });

  revalidatePath("/clientes");
  revalidatePath(`/clientes/${clientId}`);
  return { ok: true, message: "Cliente restaurado." };
}
