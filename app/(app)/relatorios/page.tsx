import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth/current-user";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatBRL } from "@/lib/format";

export default async function ReportsPage() {
  await requireRole("ADMIN", "MANAGER");
  const [clients, projects, tasks, completed, revenue] = await Promise.all([db.client.count({ where: { archivedAt: null } }), db.project.count({ where: { archivedAt: null } }), db.task.count({ where: { archivedAt: null } }), db.task.count({ where: { archivedAt: null, status: "DONE" } }), db.revenue.aggregate({ where: { deletedAt: null, status: { in: ["PAID", "PARTIALLY_PAID"] } }, _sum: { netCents: true } })]);
  const cards = [["Clientes", clients], ["Projetos", projects], ["Tarefas", tasks], ["Tarefas concluídas", completed]] as const;
  return <><PageHeader title="Relatórios" description="Visão consolidada dos dados operacionais" /><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{cards.map(([label, value]) => <Card key={label}><CardHeader><CardTitle>{label}</CardTitle></CardHeader><CardContent className="text-3xl font-bold">{value}</CardContent></Card>)}</div><Card className="mt-4"><CardHeader><CardTitle>Receita líquida contabilizada</CardTitle></CardHeader><CardContent className="text-3xl font-bold">{formatBRL(revenue._sum.netCents ?? 0)}</CardContent></Card></>;
}
