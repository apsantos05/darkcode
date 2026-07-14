"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth/current-user";
import type { ActionResult } from "@/app/(auth)/actions";

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
