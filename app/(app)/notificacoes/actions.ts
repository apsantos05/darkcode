"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth/current-user";
import type { ActionResult } from "@/app/(auth)/actions";
import { assertPermission } from "@/lib/rbac";
import { logActivity, notifyMany } from "@/lib/activity";

const createNotificationSchema = z.object({
  target: z.string().min(1, "Selecione os destinatários"),
  title: z.string().trim().min(2, "Informe um título").max(160),
  body: z.string().trim().min(2, "Escreva a mensagem").max(2000),
  link: z.string().trim().max(500).optional().transform((value) => value || undefined).refine((value) => !value || value.startsWith("/"), "Use um link interno iniciado por /")
});

export async function createNotificationAction(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  const actor = await requireUser(); assertPermission(actor.role, "settings.admin");
  const parsed = createNotificationSchema.safeParse({ target: formData.get("target"), title: formData.get("title"), body: formData.get("body"), link: formData.get("link") });
  if (!parsed.success) return { ok: false, fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]> };
  const users = await db.user.findMany({ where: { status: "ACTIVE", deletedAt: null, ...(parsed.data.target === "ALL" ? {} : { id: parsed.data.target }) }, select: { id: true } });
  if (!users.length) return { ok: false, fieldErrors: { target: ["Nenhum destinatário ativo foi encontrado."] } };
  await notifyMany(users.map((user) => user.id), { type: "ANNOUNCEMENT", title: parsed.data.title, body: parsed.data.body, link: parsed.data.link });
  await logActivity({ actorId: actor.id, entityType: "USER", entityId: actor.id, action: "NOTIFICATION_SENT", message: `Notificação enviada para ${users.length} usuário${users.length === 1 ? "" : "s"}` });
  revalidatePath("/notificacoes");
  return { ok: true, message: `Notificação enviada para ${users.length} usuário${users.length === 1 ? "" : "s"}.` };
}

/** Marca uma notificação como lida — somente se pertencer ao usuário atual. */
export async function markReadAction(id: string): Promise<ActionResult> {
  const user = await requireUser();

  const parsed = z.string().min(1).safeParse(id);
  if (!parsed.success) {
    return { ok: false, message: "Notificação inválida." };
  }

  const notification = await db.notification.findUnique({
    where: { id: parsed.data },
    select: { id: true, userId: true, readAt: true },
  });
  // Validação de dono: nunca permitir marcar notificação de outro usuário.
  if (!notification || notification.userId !== user.id) {
    return { ok: false, message: "Notificação não encontrada." };
  }

  if (!notification.readAt) {
    await db.notification.update({
      where: { id: notification.id },
      data: { readAt: new Date() },
    });
  }

  revalidatePath("/notificacoes");
  return { ok: true };
}

/** Marca todas as notificações não lidas do usuário atual como lidas. */
export async function markAllReadAction(): Promise<ActionResult> {
  const user = await requireUser();

  const result = await db.notification.updateMany({
    where: { userId: user.id, readAt: null },
    data: { readAt: new Date() },
  });

  revalidatePath("/notificacoes");
  return {
    ok: true,
    message:
      result.count > 0
        ? `${result.count} ${result.count === 1 ? "notificação marcada" : "notificações marcadas"} como lida${result.count === 1 ? "" : "s"}.`
        : "Nenhuma notificação pendente.",
  };
}
