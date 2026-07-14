import "server-only";
import { db } from "@/lib/db";
import type { NotificationType } from "@/lib/constants";

type LogInput = {
  actorId: string | null;
  entityType: "TASK" | "PROJECT" | "CLIENT" | "REVENUE" | "USER" | "DEADLINE_REQUEST";
  entityId: string;
  action: string;
  message?: string;
  oldValue?: unknown;
  newValue?: unknown;
};

/** Registra uma entrada imutável no histórico de auditoria. */
export async function logActivity(input: LogInput): Promise<void> {
  await db.activityLog.create({
    data: {
      actorId: input.actorId,
      entityType: input.entityType,
      entityId: input.entityId,
      action: input.action,
      message: input.message,
      oldValue: input.oldValue === undefined ? null : JSON.stringify(input.oldValue),
      newValue: input.newValue === undefined ? null : JSON.stringify(input.newValue),
    },
  });
}

type NotifyInput = {
  userId: string;
  type: NotificationType;
  title: string;
  body?: string;
  link?: string;
};

/** Cria uma notificação interna para um usuário. */
export async function notify(input: NotifyInput): Promise<void> {
  await db.notification.create({ data: input });
}

export async function notifyMany(userIds: string[], input: Omit<NotifyInput, "userId">): Promise<void> {
  const unique = [...new Set(userIds)];
  if (unique.length === 0) return;
  await db.notification.createMany({
    data: unique.map((userId) => ({ userId, ...input })),
  });
}
