import { timingSafeEqual } from "node:crypto";
import { addDays, startOfDay } from "date-fns";
import { db } from "@/lib/db";
import { notifyMany } from "@/lib/activity";
import { TASK_CLOSED_STATUSES } from "@/lib/constants";

function authorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  const header = request.headers.get("authorization");
  if (!secret || !header?.startsWith("Bearer ")) return false;
  const provided = Buffer.from(header.slice(7));
  const expected = Buffer.from(secret);
  return provided.length === expected.length && timingSafeEqual(provided, expected);
}

export async function GET(request: Request) {
  if (!authorized(request)) return Response.json({ ok: false }, { status: 401 });
  const now = new Date();
  const tasks = await db.task.findMany({
    where: { archivedAt: null, status: { notIn: [...TASK_CLOSED_STATUSES] }, dueDate: { lt: addDays(now, 1) } },
    select: { id: true, title: true, dueDate: true, responsibleId: true, assignees: { select: { userId: true } } },
  });
  let sent = 0;
  for (const task of tasks) {
    if (!task.dueDate) continue;
    const type = task.dueDate < now ? "TASK_OVERDUE" : "TASK_DUE_SOON";
    const link = `/tarefas/${task.id}`;
    const recipients = [...new Set([...(task.responsibleId ? [task.responsibleId] : []), ...task.assignees.map((a) => a.userId)])];
    if (!recipients.length) continue;
    const existing = await db.notification.findMany({
      where: { userId: { in: recipients }, type, link, createdAt: { gte: startOfDay(now) } }, select: { userId: true },
    });
    const alreadySent = new Set(existing.map((item) => item.userId));
    const pending = recipients.filter((id) => !alreadySent.has(id));
    await notifyMany(pending, { type, title: type === "TASK_OVERDUE" ? "Tarefa vencida" : "Prazo próximo", body: task.title, link });
    sent += pending.length;
  }
  return Response.json({ ok: true, tasks: tasks.length, notifications: sent });
}
