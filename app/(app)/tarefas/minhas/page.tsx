import Link from "next/link";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth/current-user";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { TASK_STATUS, PRIORITIES } from "@/lib/constants";
import { formatDate } from "@/lib/format";

export default async function MyTasksPage() {
  const user = await requireUser();
  const tasks = await db.task.findMany({ where: { archivedAt: null, OR: [{ responsibleId: user.id }, { assignees: { some: { userId: user.id } } }] }, orderBy: [{ dueDate: "asc" }, { createdAt: "desc" }], include: { project: true } });
  return <><PageHeader title="Minhas tarefas" description="Itens sob sua responsabilidade ou participação" /><div className="grid gap-3">{tasks.map((task) => <Link href={`/tarefas/${task.id}`} key={task.id}><Card className="transition-colors hover:bg-card-hover"><CardContent className="flex flex-wrap items-center justify-between gap-3 pt-5"><div><p className="font-medium">{task.title}</p><p className="text-sm text-muted">{task.project?.name ?? "Sem projeto"}</p></div><div className="text-right text-sm"><p>{PRIORITIES[task.priority as keyof typeof PRIORITIES] ?? task.priority} · {TASK_STATUS[task.status as keyof typeof TASK_STATUS] ?? task.status}</p><p className="text-muted">{formatDate(task.dueDate)}</p></div></CardContent></Card></Link>)}</div></>;
}
