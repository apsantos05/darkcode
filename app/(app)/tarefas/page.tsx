import Link from "next/link";
import { Plus } from "lucide-react";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth/current-user";
import { PageHeader } from "@/components/layout/page-header";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { buttonVariants } from "@/components/ui/button";
import { TASK_STATUS, PRIORITIES } from "@/lib/constants";
import { formatDate } from "@/lib/format";
export default async function TasksPage() {
  await requireUser(); const tasks = await db.task.findMany({ where: { archivedAt: null }, orderBy: [{ dueDate: "asc" }, { createdAt: "desc" }], take: 100, include: { project: true, responsible: true } });
  return <><PageHeader title="Todas as tarefas" description={`${tasks.length} tarefas carregadas do Supabase`} actions={<Link href="/tarefas/nova" className={buttonVariants()}><Plus className="h-4 w-4" />Nova tarefa</Link>} /><Table><THead><TR><TH>Tarefa</TH><TH>Projeto</TH><TH>Responsável</TH><TH>Prioridade</TH><TH>Status</TH><TH>Prazo</TH></TR></THead><TBody>{tasks.map((task) => <TR key={task.id}><TD><Link className="font-medium hover:text-primary" href={`/tarefas/${task.id}`}>{task.title}</Link></TD><TD>{task.project?.name ?? "—"}</TD><TD>{task.responsible?.fullName ?? "Não definido"}</TD><TD>{PRIORITIES[task.priority as keyof typeof PRIORITIES] ?? task.priority}</TD><TD>{TASK_STATUS[task.status as keyof typeof TASK_STATUS] ?? task.status}</TD><TD>{formatDate(task.dueDate)}</TD></TR>)}</TBody></Table></>;
}
