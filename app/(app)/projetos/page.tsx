import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { CalendarClock, FolderKanban, Plus, Search } from "lucide-react";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth/current-user";
import { hasPermission } from "@/lib/rbac";
import { formatBRL, formatDate } from "@/lib/format";
import {
  PRIORITIES,
  PROJECT_STATUS,
  type Priority,
  type ProjectStatus,
} from "@/lib/constants";
import { PageHeader } from "@/components/layout/page-header";
import { Badge, PRIORITY_TONE, PROJECT_STATUS_TONE } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input, Select, Checkbox, Label } from "@/components/ui/input";
import { Avatar } from "@/components/ui/avatar";
import { EmptyState } from "@/components/ui/empty-state";
import { Pagination } from "@/components/ui/pagination";
import { isProjectOverdue, projectProgress } from "./progress";

const PAGE_SIZE = 12;

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function single(value: string | string[] | undefined): string {
  return Array.isArray(value) ? (value[0] ?? "") : (value ?? "");
}

export default async function ProjetosPage({ searchParams }: { searchParams: SearchParams }) {
  const user = await requireUser();
  const params = await searchParams;

  const q = single(params.q).trim();
  const statusParam = single(params.status);
  const clienteParam = single(params.cliente);
  const prioridadeParam = single(params.prioridade);
  const showArchived = single(params.arquivados) === "1";
  const page = Math.max(1, Number.parseInt(single(params.pagina), 10) || 1);

  const status = statusParam in PROJECT_STATUS ? (statusParam as ProjectStatus) : undefined;
  const prioridade = prioridadeParam in PRIORITIES ? (prioridadeParam as Priority) : undefined;

  const where: Prisma.ProjectWhereInput = {
    archivedAt: showArchived ? { not: null } : null,
    ...(q ? { name: { contains: q } } : {}),
    ...(status ? { status } : {}),
    ...(clienteParam ? { clientId: clienteParam } : {}),
    ...(prioridade ? { priority: prioridade } : {}),
  };

  const [totalItems, projects, clients] = await Promise.all([
    db.project.count({ where }),
    db.project.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: {
        client: { select: { id: true, legalName: true, tradeName: true } },
        manager: { select: { id: true, fullName: true, avatarUrl: true } },
        members: {
          include: { user: { select: { id: true, fullName: true, avatarUrl: true } } },
        },
        tasks: { where: { archivedAt: null }, select: { status: true } },
      },
    }),
    db.client.findMany({
      where: { archivedAt: null },
      orderBy: { legalName: "asc" },
      select: { id: true, legalName: true, tradeName: true },
    }),
  ]);

  const totalPages = Math.max(1, Math.ceil(totalItems / PAGE_SIZE));
  const canCreate = hasPermission(user.role, "projects.create");
  const hasFilters = Boolean(q || status || clienteParam || prioridade || showArchived);

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Projetos"
        description="Acompanhe o andamento dos projetos da agência."
        actions={
          canCreate ? (
            <Link href="/projetos/novo" className={buttonVariants({ variant: "primary", size: "md" })}>
              <Plus className="h-4 w-4" aria-hidden />
              Novo projeto
            </Link>
          ) : undefined
        }
      />

      <form
        method="get"
        action="/projetos"
        className="mb-6 grid grid-cols-1 gap-3 rounded-xl border border-border bg-card p-4 sm:grid-cols-2 lg:grid-cols-6"
      >
        <div className="relative sm:col-span-2">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted"
            aria-hidden
          />
          <Input
            type="search"
            name="q"
            defaultValue={q}
            placeholder="Buscar por nome…"
            aria-label="Buscar projetos por nome"
            className="pl-9"
          />
        </div>
        <Select name="status" defaultValue={statusParam} aria-label="Filtrar por status">
          <option value="">Todos os status</option>
          {Object.entries(PROJECT_STATUS).map(([key, label]) => (
            <option key={key} value={key}>
              {label}
            </option>
          ))}
        </Select>
        <Select name="cliente" defaultValue={clienteParam} aria-label="Filtrar por cliente">
          <option value="">Todos os clientes</option>
          {clients.map((client) => (
            <option key={client.id} value={client.id}>
              {client.tradeName || client.legalName}
            </option>
          ))}
        </Select>
        <Select name="prioridade" defaultValue={prioridadeParam} aria-label="Filtrar por prioridade">
          <option value="">Todas as prioridades</option>
          {Object.entries(PRIORITIES).map(([key, label]) => (
            <option key={key} value={key}>
              {label}
            </option>
          ))}
        </Select>
        <div className="flex items-center justify-between gap-3">
          <Label className="flex cursor-pointer items-center gap-2 text-sm text-muted">
            <Checkbox name="arquivados" value="1" defaultChecked={showArchived} />
            Arquivados
          </Label>
          <Button type="submit" variant="secondary" size="sm">
            Filtrar
          </Button>
        </div>
      </form>

      {projects.length === 0 ? (
        <EmptyState
          icon={FolderKanban}
          title={hasFilters ? "Nenhum projeto encontrado" : "Nenhum projeto cadastrado"}
          description={
            hasFilters
              ? "Ajuste os filtros ou limpe a busca para ver outros projetos."
              : "Crie o primeiro projeto para começar a acompanhar o trabalho da equipe."
          }
          action={
            canCreate && !hasFilters ? (
              <Link href="/projetos/novo" className={buttonVariants({ variant: "primary", size: "md" })}>
                <Plus className="h-4 w-4" aria-hidden />
                Novo projeto
              </Link>
            ) : undefined
          }
        />
      ) : (
        <>
          <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3" role="list">
            {projects.map((project) => {
              const progress = projectProgress(project.tasks);
              const overdue = isProjectOverdue(project.dueDate, project.status);
              return (
                <li key={project.id}>
                  <Link
                    href={`/projetos/${project.id}`}
                    className="flex h-full flex-col gap-4 rounded-xl border border-border bg-card p-5 transition-colors hover:border-primary/40 hover:bg-card-hover"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h2 className="truncate font-semibold" title={project.name}>
                          {project.name}
                        </h2>
                        <p className="mt-0.5 truncate text-sm text-muted">
                          {project.client.tradeName || project.client.legalName}
                        </p>
                      </div>
                      <div className="flex shrink-0 flex-col items-end gap-1.5">
                        <Badge tone={PROJECT_STATUS_TONE[project.status] ?? "neutral"}>
                          {PROJECT_STATUS[project.status as ProjectStatus] ?? project.status}
                        </Badge>
                        <Badge tone={PRIORITY_TONE[project.priority] ?? "neutral"}>
                          {PRIORITIES[project.priority as Priority] ?? project.priority}
                        </Badge>
                      </div>
                    </div>

                    <div>
                      <div className="mb-1 flex items-center justify-between text-xs text-muted">
                        <span>Progresso</span>
                        <span className="font-medium text-foreground">{progress}%</span>
                      </div>
                      <div
                        className="h-2 w-full overflow-hidden rounded-full bg-surface"
                        role="progressbar"
                        aria-valuenow={progress}
                        aria-valuemin={0}
                        aria-valuemax={100}
                        aria-label={`Progresso do projeto ${project.name}: ${progress}%`}
                      >
                        <div
                          className="h-full rounded-full bg-primary transition-all"
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-between gap-3 text-sm">
                      <span
                        className={`inline-flex items-center gap-1.5 ${overdue ? "font-medium text-danger" : "text-muted"}`}
                      >
                        <CalendarClock className="h-4 w-4" aria-hidden />
                        {project.dueDate ? formatDate(project.dueDate) : "Sem prazo"}
                        {overdue && <span className="sr-only">(atrasado)</span>}
                      </span>
                      <span className="font-medium">{formatBRL(project.contractCents)}</span>
                    </div>

                    <div className="mt-auto flex items-center justify-between gap-3 border-t border-border pt-3">
                      {project.manager ? (
                        <span className="flex min-w-0 items-center gap-2 text-sm text-muted">
                          <Avatar name={project.manager.fullName} src={project.manager.avatarUrl} size="sm" />
                          <span className="truncate">{project.manager.fullName}</span>
                        </span>
                      ) : (
                        <span className="text-sm text-muted">Sem gestor</span>
                      )}
                      {project.members.length > 0 && (
                        <span className="flex shrink-0 -space-x-2" aria-label={`${project.members.length} membros`}>
                          {project.members.slice(0, 4).map((member) => (
                            <Avatar
                              key={member.id}
                              name={member.user.fullName}
                              src={member.user.avatarUrl}
                              size="sm"
                              className="ring-2 ring-card"
                            />
                          ))}
                          {project.members.length > 4 && (
                            <span className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-border bg-surface text-[10px] font-semibold text-muted ring-2 ring-card">
                              +{project.members.length - 4}
                            </span>
                          )}
                        </span>
                      )}
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
          <Pagination page={page} totalPages={totalPages} totalItems={totalItems} />
        </>
      )}
    </div>
  );
}
