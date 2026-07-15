import { notFound } from "next/navigation";
import { Trash2 } from "lucide-react";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth/current-user";
import { hasPermission } from "@/lib/rbac";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { PRIORITIES, TASK_STATUS } from "@/lib/constants";
import { formatDate, formatDateTime } from "@/lib/format";
import { addChecklistItemAction, addCommentAction, addTimeEntryAction, removeChecklistItemAction, removeCommentAction } from "../actions";
import { ChecklistToggle } from "./checklist-toggle";
import { TaskToolbar } from "./task-toolbar";

export default async function TaskDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;
  const task = await db.task.findFirst({
    where: { id, archivedAt: null },
    include: {
      project: true, client: true, responsible: true, creator: true,
      assignees: { include: { user: true } },
      checklistItems: { orderBy: { position: "asc" } },
      comments: { where: { deletedAt: null }, orderBy: { createdAt: "desc" }, include: { author: true } },
      timeEntries: { orderBy: { workedAt: "desc" }, include: { user: true } },
      tags: { include: { tag: true } },
    },
  });
  if (!task) notFound();
  const member = task.creatorId === user.id || task.responsibleId === user.id || task.assignees.some((item) => item.userId === user.id);
  if (!hasPermission(user.role, "tasks.deleteAny") && !member) notFound();
  const canArchive = hasPermission(user.role, "tasks.deleteAny") || task.creatorId === user.id;
  const totalHours = task.timeEntries.reduce((sum, entry) => sum + entry.hours, 0);

  return <div>
    <PageHeader title={task.title} description={`${TASK_STATUS[task.status as keyof typeof TASK_STATUS] ?? task.status} · ${PRIORITIES[task.priority as keyof typeof PRIORITIES] ?? task.priority}`} actions={<TaskToolbar id={id} status={task.status} canArchive={canArchive} />} />
    <div className="grid gap-4 xl:grid-cols-3">
      <Card className="xl:col-span-2"><CardHeader><CardTitle>Detalhes</CardTitle></CardHeader><CardContent className="space-y-3 text-sm">
        <p className="whitespace-pre-wrap break-words">{task.description ?? "Sem descrição."}</p>
        <div className="grid gap-2 sm:grid-cols-2"><p><span className="text-muted">Projeto:</span> {task.project?.name ?? "—"}</p><p><span className="text-muted">Cliente:</span> {task.client?.tradeName ?? task.client?.legalName ?? "—"}</p><p><span className="text-muted">Prazo:</span> {formatDate(task.dueDate)}</p><p><span className="text-muted">Responsável:</span> {task.responsible?.fullName ?? "Não definido"}</p><p><span className="text-muted">Criada por:</span> {task.creator.fullName}</p><p><span className="text-muted">Horas:</span> {totalHours}h / {task.estimatedHours ?? "—"}h</p></div>
        <p><span className="text-muted">Participantes:</span> {task.assignees.map((item) => item.user.fullName).join(", ") || "—"}</p>
        {task.tags.length > 0 && <div className="flex flex-wrap gap-2">{task.tags.map((item) => <span key={item.tagId} className="rounded-full bg-primary/10 px-2 py-1 text-xs text-neon">{item.tag.name}</span>)}</div>}
      </CardContent></Card>
      <Card><CardHeader><CardTitle>Checklist</CardTitle></CardHeader><CardContent className="space-y-3">
        {task.checklistItems.map((item) => <div key={item.id} className="flex items-center gap-2"><ChecklistToggle taskId={id} itemId={item.id} done={Boolean(item.doneAt)} label={item.content} /><span className={`min-w-0 flex-1 break-words text-sm ${item.doneAt ? "text-muted line-through" : ""}`}>{item.content}</span><form action={removeChecklistItemAction.bind(null, id, item.id)}><Button variant="ghost" size="iconSm" aria-label="Remover item"><Trash2 className="h-3.5 w-3.5" aria-hidden /></Button></form></div>)}
        <form action={addChecklistItemAction.bind(null, id)} className="flex flex-col gap-2 sm:flex-row"><Input name="content" required maxLength={500} placeholder="Novo item…" /><Button size="sm">Adicionar Item</Button></form>
      </CardContent></Card>
    </div>
    <div className="mt-4 grid gap-4 lg:grid-cols-2">
      <Card><CardHeader><CardTitle>Comentários</CardTitle></CardHeader><CardContent className="space-y-4"><form action={addCommentAction.bind(null, id)} className="space-y-2"><Textarea name="content" required maxLength={4000} placeholder="Escreva um comentário…" /><Button size="sm">Adicionar Comentário</Button></form>{task.comments.map((comment) => <div key={comment.id} className="border-t border-border pt-3 text-sm"><div className="flex justify-between gap-2"><p className="min-w-0 break-words whitespace-pre-wrap">{comment.content}</p>{(comment.authorId === user.id || hasPermission(user.role, "tasks.deleteAny")) && <form action={removeCommentAction.bind(null, id, comment.id)}><Button variant="ghost" size="iconSm" aria-label="Remover comentário"><Trash2 className="h-3.5 w-3.5" aria-hidden /></Button></form>}</div><p className="mt-1 text-xs text-muted">{comment.author.fullName} · {formatDateTime(comment.createdAt)}</p></div>)}</CardContent></Card>
      <Card><CardHeader><CardTitle>Horas Trabalhadas</CardTitle></CardHeader><CardContent className="space-y-4"><form action={addTimeEntryAction.bind(null, id)} className="grid gap-2 sm:grid-cols-2"><Input name="hours" required inputMode="decimal" placeholder="Ex.: 2,5" aria-label="Horas trabalhadas" /><Input name="workedAt" type="date" aria-label="Data do trabalho" /><Input className="sm:col-span-2" name="note" placeholder="Observação…" aria-label="Observação" /><Button size="sm" className="sm:col-span-2">Registrar Horas</Button></form>{task.timeEntries.map((entry) => <div key={entry.id} className="border-t border-border pt-3 text-sm"><p><strong>{entry.hours}h</strong> · {entry.user.fullName}</p><p className="break-words text-xs text-muted">{formatDate(entry.workedAt)}{entry.note ? ` · ${entry.note}` : ""}</p></div>)}</CardContent></Card>
    </div>
  </div>;
}
