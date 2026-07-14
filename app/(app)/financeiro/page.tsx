import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth/current-user";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { formatBRL, formatDate } from "@/lib/format";
import { REVENUE_STATUS } from "@/lib/constants";

export default async function FinancePage() {
  await requireRole("ADMIN", "MANAGER");
  const [revenues, total] = await Promise.all([db.revenue.findMany({ where: { deletedAt: null }, orderBy: { saleDate: "desc" }, take: 100, include: { client: true, project: true } }), db.revenue.aggregate({ where: { deletedAt: null, status: { in: ["PAID", "PARTIALLY_PAID"] } }, _sum: { netCents: true } })]);
  return <><PageHeader title="Financeiro" description="Receitas reais registradas no banco" /><Card className="mb-5"><CardHeader><CardTitle>Faturamento líquido contabilizado</CardTitle></CardHeader><CardContent className="text-3xl font-bold">{formatBRL(total._sum.netCents ?? 0)}</CardContent></Card><Table><THead><TR><TH>Descrição</TH><TH>Cliente</TH><TH>Venda</TH><TH>Status</TH><TH className="text-right">Líquido</TH></TR></THead><TBody>{revenues.map((r) => <TR key={r.id}><TD>{r.description}</TD><TD>{r.client?.tradeName ?? r.client?.legalName ?? "—"}</TD><TD>{formatDate(r.saleDate)}</TD><TD>{REVENUE_STATUS[r.status as keyof typeof REVENUE_STATUS] ?? r.status}</TD><TD className="text-right font-medium">{formatBRL(r.netCents)}</TD></TR>)}</TBody></Table></>;
}
