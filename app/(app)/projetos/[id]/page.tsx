import Link from "next/link";
import { notFound } from "next/navigation";
import {
  Activity,
  ArrowLeft,
  Banknote,
  CalendarClock,
  ExternalLink,
  FolderKanban,
  Link2,
  ListTodo,
  OctagonAlert,
  Plus,
} from "lucide-react";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth/current-user";
import { hasPermission } from "@/lib/rbac";
import { formatBRL, formatDate, formatDateTime } from "@/lib/format";
import {
  PRIORITIES,
  PROJECT_STATUS,
  REVENUE_COUNTED_STATUSES,
  REVENUE_STATUS,
  TASK_CLOSED_STATUSES,
  TASK_STATUS,
  type Priority,
  type ProjectStatus,
  type RevenueStatus,
  type TaskStatus,
} from "@/lib/constants";
import {
  Badge,
  PRIORITY_TONE,
  PROJECT_STATUS_TONE,
  REVENUE_STATUS_TONE,
  TASK_STATUS_TONE,
} from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { Avatar } from "@/components/ui/avatar";
import { EmptyState } from "@/components/ui/empty-state";
import { countOpenTasks, isProjectOverdue, isTaskOverdue, projectProgress } from "../progress";
import { MembersSection } from "./members-section";
import { ProjectAdminActions } from "./project-admin-actions";

function parseLinks(raw: string | null): string[] {
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string") : [];
  } catch {
    return [];
  }
}

export default async function ProjetoDetalhePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const [user, { id }] = await Promise.all([requireUser(), params]);

  const project = await db.project.findUnique({
    where: { id },
    include: {
      client: { select: { id: true, legalName: true, tradeName: true } },
      manager: { select: { id: true, fullName: true, avatarUrl: true, position: true } },
      members: {
        include: {
          user: { select: { id: true, fullName: true, avatarUrl: true, position: true } },
        },
        orderBy: { createdAt: "asc" },
      },
      tasks: {
        where: { archivedAt: null },
        include: {
          responsible: { select: { id: true, fullName: true, avatarUrl: true } },
        },
        orderBy: { createdAt: "desc" },
      },
      revenues: {
        where: { deletedAt: null },
        orderBy: { saleDate: "desc" },
      },
    },
  });

  if (!project) notFound();

  const memberUserIds = project.members.map((member) => member.userId);

  const [activities, availableUsers] = await Promise.all([
    db.activityLog.findMany({
      where: { entityType: "PROJECT", entityId: project.id },
      include: { actor: { select: { fullName: true, avatarUrl: true } } },
      orderBy: { createdAt: "desc" },
      take: 15,
    }),
    db.user.findMany({
      where: {
        status: "ACTIVE",
        deletedAt: null,
        role: { not: "CLIENT" },
        id: { notIn: memberUserIds.length > 0 ? memberUserIds : ["__none__"] },
      },
      orderBy: { fullName: "asc" },
      select: { id: true, fullName: true, avatarUrl: true, position: true },
    }),
  ]);

  const canEdit = hasPermission(user.role, "projects.edit");
  const canArchive = hasPermission(user.role, "projects.archive");

  const progress = projectProgress(project.tasks);
  const openTasksCount = countOpenTasks(project.tasks);
  const overdue = isProjectOverdue(project.dueDate, project.status);
  const clientName = project.client.tradeName || project.client.legalName;
  const links = parseLinks(project.links);

  const blockedTasks = project.tasks.filter((task) => task.status === "BLOCKED");
  const upcomingTasks = project.tasks
    .filter(
      (task) => task.dueDate && !TASK_CLOSED_STATUSES.includes(task.status as TaskStatus),
    )
    .sort((a, b) => (a.dueDate as Date).getTime() - (b.dueDate as Date).getTime())
    .slice(0, 5);

  const receivedFromRevenues = project.revenues
    .filter((revenue) =>
      (REVENUE_COUNTED_STATUSES as readonly string[]).includes(revenue.status),
    )
    .reduce((sum, revenue) => sum + revenue.netCents, 0);

  return (
    <div className="animate-fade-in space-y-6">
      {/* Cabeçalho */}
      <div>
        <Link
          href="/projetos"
          className="mb-3 inline-flex items-center gap-1.5 text-sm text-muted transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden />
          Voltar para projetos
        </Link>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-2xl font-bold tracking-tight">{project.name}</h1>
              <Badge tone={PROJECT_STATUS_TONE[project.status] ?? "neutral"}>
                {PROJECT_STATUS[project.status as ProjectStatus] ?? project.status}
              </Badge>
              <Badge tone={PRIORITY_TONE[project.priority] ?? "neutral"}>
                {PRIORITIES[project.priority as Priority] ?? project.priority}
              </Badge>
              {project.archivedAt && <Badge tone="warning">Arquivado</Badge>}
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-muted">
              <span>
                Cliente:{" "}
                <Link
                  href={`/clientes/${project.client.id}`}
                  className="font-medium text-neon transition-colors hover:underline"
                >
                  {clientName}
                </Link>
              </span>
              {project.manager && (
                <span className="inline-flex items-center gap-2">
                  Gestor:
                  <Avatar name={project.manager.fullName} src={project.manager.avatarUrl} size="sm" />
                  <span className="text-foreground">{project.manager.fullName}</span>
                </span>
              )}
            </div>
          </div>
          <ProjectAdminActions
            projectId={project.id}
            projectName={project.name}
            archived={Boolean(project.archivedAt)}
            canEdit={canEdit}
            canArchive={canArchive}
          />
        </div>
      </div>

      {/* Cards de resumo */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardContent className="p-5">
            <p className="text-sm text-muted">Progresso</p>
            <p className="mt-1 text-2xl font-bold">{progress}%</p>
            <div
              className="mt-3 h-2 w-full overflow-hidden rounded-full bg-surface"
              role="progressbar"
              aria-valuenow={progress}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label={`Progresso do projeto: ${progress}%`}
            >
              <div
                className="h-full rounded-full bg-primary transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-sm text-muted">Financeiro</p>
            <p className="mt-1 text-2xl font-bold">{formatBRL(project.contractCents)}</p>
            <p className="mt-3 text-xs text-muted">
              Recebido: <span className="font-medium text-success">{formatBRL(project.receivedCents)}</span>
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-sm text-muted">Prazo</p>
            <p className={`mt-1 text-2xl font-bold ${overdue ? "text-danger" : ""}`}>
              {project.dueDate ? formatDate(project.dueDate) : "—"}
            </p>
            <p className="mt-3 text-xs">
              {overdue ? (
                <span className="font-medium text-danger">Projeto atrasado</span>
              ) : (
                <span className="text-muted">
                  Início: {project.startDate ? formatDate(project.startDate) : "—"}
                </span>
              )}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-sm text-muted">Tarefas abertas</p>
            <p className="mt-1 text-2xl font-bold">{openTasksCount}</p>
            <p className="mt-3 text-xs text-muted">
              {project.tasks.length} {project.tasks.length === 1 ? "tarefa no total" : "tarefas no total"}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        {/* Coluna principal */}
        <div className="space-y-6 xl:col-span-2">
          {/* Sobre o projeto */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FolderKanban className="h-4 w-4 text-neon" aria-hidden />
                Sobre o projeto
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <div>
                <h3 className="mb-1 text-xs font-semibold uppercase tracking-wider text-muted">
                  Descrição
                </h3>
                <p className="whitespace-pre-line text-sm">
                  {project.description || <span className="text-muted">Sem descrição.</span>}
                </p>
              </div>
              <div>
                <h3 className="mb-1 text-xs font-semibold uppercase tracking-wider text-muted">
                  Escopo
                </h3>
                <p className="whitespace-pre-line text-sm">
                  {project.scope || <span className="text-muted">Sem escopo definido.</span>}
                </p>
              </div>
              <div>
                <h3 className="mb-1 text-xs font-semibold uppercase tracking-wider text-muted">
                  Observações
                </h3>
                <p className="whitespace-pre-line text-sm">
                  {project.notes || <span className="text-muted">Sem observações.</span>}
                </p>
              </div>
              <div>
                <h3 className="mb-1 text-xs font-semibold uppercase tracking-wider text-muted">
                  Links
                </h3>
                {links.length === 0 ? (
                  <p className="text-sm text-muted">Nenhum link cadastrado.</p>
                ) : (
                  <ul className="space-y-1" role="list">
                    {links.map((link) => (
                      <li key={link}>
                        <a
                          href={link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex max-w-full items-center gap-1.5 text-sm text-neon transition-colors hover:underline"
                        >
                          <Link2 className="h-3.5 w-3.5 shrink-0" aria-hidden />
                          <span className="truncate">{link}</span>
                          <ExternalLink className="h-3 w-3 shrink-0" aria-hidden />
                          <span className="sr-only">(abre em nova aba)</span>
                        </a>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Tarefas do projeto */}
          <Card>
            <CardHeader className="flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <ListTodo className="h-4 w-4 text-neon" aria-hidden />
                Tarefas ({project.tasks.length})
              </CardTitle>
              <Link
                href={`/tarefas/nova?projeto=${project.id}`}
                className={buttonVariants({ variant: "outline", size: "sm" })}
              >
                <Plus className="h-4 w-4" aria-hidden />
                Nova tarefa
              </Link>
            </CardHeader>
            <CardContent>
              {project.tasks.length === 0 ? (
                <EmptyState
                  icon={ListTodo}
                  title="Nenhuma tarefa neste projeto"
                  description="Crie a primeira tarefa para começar a medir o progresso."
                />
              ) : (
                <Table>
                  <THead>
                    <TR>
                      <TH>Título</TH>
                      <TH>Responsável</TH>
                      <TH>Status</TH>
                      <TH>Prioridade</TH>
                      <TH>Prazo</TH>
                    </TR>
                  </THead>
                  <TBody>
                    {project.tasks.map((task) => {
                      const taskOverdue = isTaskOverdue(task.dueDate, task.status);
                      return (
                        <TR key={task.id}>
                          <TD>
                            <Link
                              href={`/tarefas/${task.id}`}
                              className="font-medium transition-colors hover:text-neon"
                            >
                              {task.title}
                            </Link>
                          </TD>
                          <TD>
                            {task.responsible ? (
                              <span className="flex items-center gap-2">
                                <Avatar
                                  name={task.responsible.fullName}
                                  src={task.responsible.avatarUrl}
                                  size="sm"
                                />
                                <span className="whitespace-nowrap text-sm">
                                  {task.responsible.fullName}
                                </span>
                              </span>
                            ) : (
                              <span className="text-sm text-muted">—</span>
                            )}
                          </TD>
                          <TD>
                            <Badge tone={TASK_STATUS_TONE[task.status] ?? "neutral"}>
                              {TASK_STATUS[task.status as TaskStatus] ?? task.status}
                            </Badge>
                          </TD>
                          <TD>
                            <Badge tone={PRIORITY_TONE[task.priority] ?? "neutral"}>
                              {PRIORITIES[task.priority as Priority] ?? task.priority}
                            </Badge>
                          </TD>
                          <TD>
                            <span
                              className={`whitespace-nowrap text-sm ${taskOverdue ? "font-medium text-danger" : ""}`}
                            >
                              {formatDate(task.dueDate)}
                              {taskOverdue && <span className="sr-only">(atrasada)</span>}
                            </span>
                          </TD>
                        </TR>
                      );
                    })}
                  </TBody>
                </Table>
              )}
            </CardContent>
          </Card>

          {/* Faturamento */}
          <Card>
            <CardHeader className="flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Banknote className="h-4 w-4 text-neon" aria-hidden />
                Faturamento
              </CardTitle>
              <span className="text-sm text-muted">
                Total recebido:{" "}
                <span className="font-semibold text-success">{formatBRL(receivedFromRevenues)}</span>
              </span>
            </CardHeader>
            <CardContent>
              {project.revenues.length === 0 ? (
                <p className="text-sm text-muted">Nenhuma receita vinculada a este projeto.</p>
              ) : (
                <Table>
                  <THead>
                    <TR>
                      <TH>Descrição</TH>
                      <TH>Líquido</TH>
                      <TH>Data</TH>
                      <TH>Status</TH>
                    </TR>
                  </THead>
                  <TBody>
                    {project.revenues.map((revenue) => (
                      <TR key={revenue.id}>
                        <TD className="font-medium">{revenue.description}</TD>
                        <TD className="whitespace-nowrap">{formatBRL(revenue.netCents)}</TD>
                        <TD className="whitespace-nowrap text-sm text-muted">
                          {formatDate(revenue.saleDate)}
                        </TD>
                        <TD>
                          <Badge tone={REVENUE_STATUS_TONE[revenue.status] ?? "neutral"}>
                            {REVENUE_STATUS[revenue.status as RevenueStatus] ?? revenue.status}
                          </Badge>
                        </TD>
                      </TR>
                    ))}
                  </TBody>
                </Table>
              )}
            </CardContent>
          </Card>

          {/* Riscos e bloqueios */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <OctagonAlert className="h-4 w-4 text-danger" aria-hidden />
                Riscos e bloqueios ({blockedTasks.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {blockedTasks.length === 0 ? (
                <p className="text-sm text-muted">Nenhuma tarefa bloqueada no momento.</p>
              ) : (
                <ul className="space-y-3" role="list">
                  {blockedTasks.map((task) => (
                    <li
                      key={task.id}
                      className="rounded-lg border border-danger/30 bg-danger/5 px-4 py-3"
                    >
                      <Link
                        href={`/tarefas/${task.id}`}
                        className="font-medium transition-colors hover:text-neon"
                      >
                        {task.title}
                      </Link>
                      <p className="mt-1 text-sm text-muted">
                        {task.blockReason || "Motivo do bloqueio não informado."}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Coluna lateral */}
        <div className="space-y-6">
          <MembersSection
            projectId={project.id}
            members={project.members.map((member) => ({
              userId: member.userId,
              fullName: member.user.fullName,
              avatarUrl: member.user.avatarUrl,
              position: member.user.position,
            }))}
            availableUsers={availableUsers.map((candidate) => ({
              userId: candidate.id,
              fullName: candidate.fullName,
              avatarUrl: candidate.avatarUrl,
              position: candidate.position,
            }))}
            canManage={canEdit && !project.archivedAt}
          />

          {/* Próximos prazos */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CalendarClock className="h-4 w-4 text-neon" aria-hidden />
                Próximos prazos
              </CardTitle>
            </CardHeader>
            <CardContent>
              {upcomingTasks.length === 0 ? (
                <p className="text-sm text-muted">Nenhuma tarefa aberta com prazo definido.</p>
              ) : (
                <ul className="space-y-2" role="list">
                  {upcomingTasks.map((task) => {
                    const taskOverdue = isTaskOverdue(task.dueDate, task.status);
                    return (
                      <li key={task.id} className="flex items-center justify-between gap-3">
                        <Link
                          href={`/tarefas/${task.id}`}
                          className="min-w-0 truncate text-sm transition-colors hover:text-neon"
                        >
                          {task.title}
                        </Link>
                        <span
                          className={`shrink-0 text-xs ${taskOverdue ? "font-medium text-danger" : "text-muted"}`}
                        >
                          {formatDate(task.dueDate)}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              )}
            </CardContent>
          </Card>

          {/* Atividades recentes */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-4 w-4 text-neon" aria-hidden />
                Atividades recentes
              </CardTitle>
            </CardHeader>
            <CardContent>
              {activities.length === 0 ? (
                <p className="text-sm text-muted">Nenhuma atividade registrada.</p>
              ) : (
                <ul className="space-y-4" role="list">
                  {activities.map((activity) => (
                    <li key={activity.id} className="flex gap-3">
                      <Avatar
                        name={activity.actor?.fullName ?? "Sistema"}
                        src={activity.actor?.avatarUrl}
                        size="sm"
                        className="mt-0.5 shrink-0"
                      />
                      <div className="min-w-0">
                        <p className="text-sm">
                          <span className="font-medium">{activity.actor?.fullName ?? "Sistema"}</span>{" "}
                          <span className="text-muted">{activity.message ?? activity.action}</span>
                        </p>
                        <p className="mt-0.5 text-xs text-muted">
                          {formatDateTime(activity.createdAt)}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
