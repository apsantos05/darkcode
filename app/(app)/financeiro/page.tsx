import Link from "next/link";
import { ExternalLink, Plus, Zap } from "lucide-react";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth/current-user";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { Badge, REVENUE_STATUS_TONE } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { formatBRL, formatDate } from "@/lib/format";
import { REVENUE_STATUS } from "@/lib/constants";

const CHARGE_STATUS: Record<string, string> = {
  CREATING: "Criando",
  PENDING: "Aguardando pagamento",
  PAID: "Pago",
  FAILED: "Falhou",
  CANCELLED: "Cancelado",
  CANCELED: "Cancelado",
  REFUNDED: "Reembolsado",
};

function chargeTone(status: string) {
  if (status === "PAID") return "success" as const;
  if (["FAILED", "CANCELLED", "CANCELED", "REFUNDED"].includes(status)) return "danger" as const;
  return "warning" as const;
}
export default async function FinancePage() {
  await requireRole("ADMIN", "MANAGER");
  const [revenues, total, charges] = await Promise.all([
    db.revenue.findMany({
      where: { deletedAt: null },
      orderBy: { saleDate: "desc" },
      take: 100,
      include: { client: true, project: true },
    }),
    db.revenue.aggregate({
      where: { deletedAt: null, status: { in: ["PAID", "PARTIALLY_PAID"] } },
      _sum: { netCents: true },
    }),
    db.paymentCharge.findMany({
      orderBy: { createdAt: "desc" },
      take: 50,
      include: { client: true, project: true },
    }),
  ]);
  const configured = Boolean(process.env.BLACKCAT_API_KEY);

  return (
    <>
      <PageHeader
        title="Financeiro"
        description="Receitas contabilizadas e cobranças integradas à BlackCat"
        actions={
          <Link href="/financeiro/cobrancas/nova" className={buttonVariants({ variant: "primary" })}>
            <Plus className="h-4 w-4" aria-hidden /> Nova cobrança
          </Link>
        }
      />

      <div className="mb-5 grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Faturamento líquido contabilizado</CardTitle></CardHeader>
          <CardContent className="font-mono text-3xl font-bold tabular-nums">{formatBRL(total._sum.netCents ?? 0)}</CardContent>
        </Card>
        <Card className="border-primary/30 bg-[linear-gradient(135deg,rgb(21_24_33),rgb(76_29_149_/_0.16))]">
          <CardHeader><CardTitle className="flex items-center gap-2"><Zap className="h-4 w-4 text-neon" aria-hidden /> Integração BlackCat</CardTitle></CardHeader>
          <CardContent>
            <Badge tone={configured ? "success" : "warning"}>{configured ? "Conectada" : "Aguardando chave da API"}</Badge>
            <p className="mt-2 text-sm text-muted">Cobranças PIX e confirmação automática por webhook.</p>
          </CardContent>
        </Card>
      </div>

      <Card className="mb-5">
        <CardHeader><CardTitle>Cobranças BlackCat</CardTitle></CardHeader>
        <CardContent>
          {charges.length === 0 ? (
            <EmptyState
              icon={Zap}
              title="Nenhuma cobrança gerada"
              description="Crie a primeira cobrança PIX diretamente pelo CRM."
              action={<Link href="/financeiro/cobrancas/nova" className={buttonVariants({ variant: "outline" })}>Gerar cobrança</Link>}
            />
          ) : (
            <Table>
              <THead><TR><TH>Descrição</TH><TH>Cliente</TH><TH>Criada em</TH><TH>Status</TH><TH className="text-right">Valor</TH><TH><span className="sr-only">Abrir</span></TH></TR></THead>
              <TBody>
                {charges.map((charge) => (
                  <TR key={charge.id}>
                    <TD className="font-medium">{charge.description}</TD>
                    <TD>{charge.client?.tradeName || charge.client?.legalName || "—"}</TD>
                    <TD>{formatDate(charge.createdAt)}</TD>
                    <TD><Badge tone={chargeTone(charge.status)}>{CHARGE_STATUS[charge.status] || charge.status}</Badge></TD>
                    <TD className="text-right font-mono tabular-nums">{formatBRL(charge.grossCents)}</TD>
                    <TD className="text-right">
                      {charge.invoiceUrl && <a href={charge.invoiceUrl} target="_blank" rel="noreferrer" aria-label={`Abrir cobrança ${charge.description}`} className="inline-flex text-muted hover:text-neon"><ExternalLink className="h-4 w-4" aria-hidden /></a>}
                    </TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Receitas</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <THead><TR><TH>Descrição</TH><TH>Cliente</TH><TH>Venda</TH><TH>Origem</TH><TH>Status</TH><TH className="text-right">Líquido</TH></TR></THead>
            <TBody>
              {revenues.map((revenue) => (
                <TR key={revenue.id}>
                  <TD>{revenue.description}</TD>
                  <TD>{revenue.client?.tradeName ?? revenue.client?.legalName ?? "—"}</TD>
                  <TD>{formatDate(revenue.saleDate)}</TD>
                  <TD>{revenue.platform === "BLACKCAT" ? "BlackCat" : revenue.platform}</TD>
                  <TD><Badge tone={REVENUE_STATUS_TONE[revenue.status]}>{REVENUE_STATUS[revenue.status as keyof typeof REVENUE_STATUS] ?? revenue.status}</Badge></TD>
                  <TD className="text-right font-medium">{formatBRL(revenue.netCents)}</TD>
                </TR>
              ))}
            </TBody>
          </Table>
        </CardContent>
      </Card>
    </>
  );
}
