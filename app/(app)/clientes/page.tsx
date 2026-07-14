import Link from "next/link";
import { redirect } from "next/navigation";
import { Plus, Users } from "lucide-react";
import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth/current-user";
import { hasPermission } from "@/lib/rbac";
import { CLIENT_STATUS, type ClientStatus } from "@/lib/constants";
import { formatBRL, formatDate } from "@/lib/format";
import { PageHeader } from "@/components/layout/page-header";
import { buttonVariants } from "@/components/ui/button";
import { Badge, CLIENT_STATUS_TONE } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { EmptyState } from "@/components/ui/empty-state";
import { Pagination } from "@/components/ui/pagination";
import { ClientsFilters } from "./clients-filters";

export const metadata = { title: "Clientes" };

const PAGE_SIZE = 20;

type SearchParams = {
  q?: string;
  status?: string;
  responsavel?: string;
  arquivados?: string;
  pagina?: string;
};

export default async function ClientesPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const user = await requireUser();
  if (!hasPermission(user.role, "clients.view")) redirect("/dashboard");

  const sp = await searchParams;
  const q = (sp.q ?? "").trim();
  const status = sp.status && sp.status in CLIENT_STATUS ? (sp.status as ClientStatus) : "";
  const responsavel = sp.responsavel ?? "";
  const showArchived = sp.arquivados === "1";
  const page = Math.max(1, Number.parseInt(sp.pagina ?? "1", 10) || 1);
  const canCreate = hasPermission(user.role, "clients.create");

  const where: Prisma.ClientWhereInput = {
    archivedAt: showArchived ? { not: null } : null,
    ...(status ? { status } : {}),
    ...(responsavel ? { ownerId: responsavel } : {}),
    ...(q
      ? {
          OR: [
            { legalName: { contains: q } },
            { tradeName: { contains: q } },
            { contactName: { contains: q } },
            { email: { contains: q } },
          ],
        }
      : {}),
  };

  const [clients, totalItems, owners] = await Promise.all([
    db.client.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: {
        owner: { select: { id: true, fullName: true, avatarUrl: true } },
        _count: {
          select: {
            projects: {
              where: { archivedAt: null, status: { notIn: ["DONE", "CANCELED"] } },
            },
          },
        },
      },
    }),
    db.client.count({ where }),
    db.user.findMany({
      where: {
        deletedAt: null,
        status: "ACTIVE",
        role: { in: ["ADMIN", "MANAGER", "COLLABORATOR"] },
      },
      select: { id: true, fullName: true },
      orderBy: { fullName: "asc" },
    }),
  ]);

  const totalPages = Math.max(1, Math.ceil(totalItems / PAGE_SIZE));
  const hasFilters = Boolean(q || status || responsavel || showArchived);

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Clientes"
        description="Carteira de clientes da Dark Code"
        actions={
          canCreate ? (
            <Link href="/clientes/novo" className={buttonVariants({ variant: "primary" })}>
              <Plus className="h-4 w-4" aria-hidden />
              Novo cliente
            </Link>
          ) : undefined
        }
      />

      <ClientsFilters
        owners={owners}
        q={q}
        status={status}
        responsavel={responsavel}
        arquivados={showArchived}
      />

      {clients.length === 0 ? (
        <EmptyState
          icon={Users}
          title={hasFilters ? "Nenhum cliente encontrado" : "Nenhum cliente cadastrado"}
          description={
            hasFilters
              ? "Ajuste os filtros ou limpe a busca para ver outros resultados."
              : "Cadastre o primeiro cliente para começar a organizar a carteira."
          }
          action={
            canCreate && !hasFilters ? (
              <Link href="/clientes/novo" className={buttonVariants({ variant: "primary" })}>
                <Plus className="h-4 w-4" aria-hidden />
                Novo cliente
              </Link>
            ) : undefined
          }
        />
      ) : (
        <>
          <Table>
            <THead>
              <TR>
                <TH>Nome</TH>
                <TH>Responsável interno</TH>
                <TH>Status</TH>
                <TH>Contrato</TH>
                <TH>Entrada</TH>
                <TH className="text-center">Projetos ativos</TH>
              </TR>
            </THead>
            <TBody>
              {clients.map((client) => (
                <TR key={client.id}>
                  <TD>
                    <Link href={`/clientes/${client.id}`} className="group block">
                      <span className="font-medium transition-colors group-hover:text-neon">
                        {client.legalName}
                      </span>
                      {client.tradeName && (
                        <span className="block text-xs text-muted">{client.tradeName}</span>
                      )}
                    </Link>
                  </TD>
                  <TD>
                    {client.owner ? (
                      <span className="flex items-center gap-2">
                        <Avatar name={client.owner.fullName} src={client.owner.avatarUrl} size="sm" />
                        <span className="text-sm">{client.owner.fullName}</span>
                      </span>
                    ) : (
                      <span className="text-muted">—</span>
                    )}
                  </TD>
                  <TD>
                    <Badge tone={CLIENT_STATUS_TONE[client.status] ?? "neutral"}>
                      {CLIENT_STATUS[client.status as ClientStatus] ?? client.status}
                    </Badge>
                  </TD>
                  <TD className="whitespace-nowrap">{formatBRL(client.contractCents)}</TD>
                  <TD className="whitespace-nowrap">{formatDate(client.startDate)}</TD>
                  <TD className="text-center tabular-nums">{client._count.projects}</TD>
                </TR>
              ))}
            </TBody>
          </Table>

          <Pagination page={page} totalPages={totalPages} totalItems={totalItems} />
        </>
      )}
    </div>
  );
}
