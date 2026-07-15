import Link from "next/link";
import { format, formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { LucideIcon } from "lucide-react";
import {
  Activity,
  AlertTriangle,
  CalendarClock,
  CheckCircle2,
  ClipboardList,
  FolderKanban,
  ListTodo,
  Target,
  Users,
  Trophy,
} from "lucide-react";
import { requireUser } from "@/lib/auth/current-user";
import { hasPermission } from "@/lib/rbac";
import { cn } from "@/lib/utils";
import {
  formatBRL,
  formatDate,
  greetingForHour,
  toSaoPaulo,
} from "@/lib/format";
import { PRIORITIES, PROJECT_STATUS, type Priority, type ProjectStatus } from "@/lib/constants";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge, PRIORITY_TONE, PROJECT_STATUS_TONE } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/layout/page-header";
import { getDashboardData } from "./queries";
import { RevenueOverviewCard } from "./revenue-overview-card";
import {
  ClientRevenueBarChart,
  ProjectStatusBarChart,
  RevenueAreaChart,
  TaskStatusDonutChart,
} from "./charts";

const PERIOD_OPTIONS = [7, 15, 30, 90] as const;
type PeriodDays = (typeof PERIOD_OPTIONS)[number];

function parsePeriod(raw: string | string[] | undefined): PeriodDays {
  const value = Array.isArray(raw) ? raw[0] : raw;
  const parsed = Number(value);
  return (PERIOD_OPTIONS as readonly number[]).includes(parsed)
    ? (parsed as PeriodDays)
    : 30;
}

function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const [user, params] = await Promise.all([requireUser(), searchParams]);
  const canViewFinance = hasPermission(user.role, "finance.view");
  const periodDays = parsePeriod(params.periodo);

  const nowSP = toSaoPaulo(new Date());
  const greeting = greetingForHour(nowSP.getHours());
  const firstName = user.fullName.trim().split(/\s+/)[0] ?? user.fullName;
  const todayLong = capitalize(
    format(nowSP, "EEEE, d 'de' MMMM 'de' yyyy", { locale: ptBR }),
  );

  const data = await getDashboardData(user.id, {
    includeFinance: canViewFinance,
    periodDays,
  });
  const { finance } = data;

  return (
    <div className="space-y-6">
      <PageHeader title={`${greeting}, ${firstName}`} description={todayLong} />

      {/* Linha 1 — cards de faturamento (apenas finance.view) */}
      {finance && <RevenueOverviewCard periods={finance.revenuePeriods} />}

      {/* Linha 2 — indicadores operacionais */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 xl:grid-cols-8">
        <StatCard label="Clientes ativos" value={data.activeClients} icon={Users} />
        <StatCard
          label="Projetos em andamento"
          value={data.projectsInProgress}
          icon={FolderKanban}
        />
        <StatCard
          label="Projetos em atraso"
          value={data.overdueProjects}
          icon={AlertTriangle}
          danger={data.overdueProjects > 0}
        />
        <StatCard label="Tarefas pendentes" value={data.pendingTasks} icon={ListTodo} />
        <StatCard
          label="Tarefas vencidas"
          value={data.overdueTasks}
          icon={CalendarClock}
          danger={data.overdueTasks > 0}
        />
        <StatCard
          label="Concluídas no mês"
          value={data.completedThisMonth}
          icon={CheckCircle2}
        />
        <StatCard label="Metas ativas" value={data.activeGoals} icon={Target} />
        <StatCard label="Missões pendentes" value={data.pendingMissions} icon={Trophy} />
      </div>

      {/* Meta mensal (dado financeiro — apenas finance.view) */}
      {finance && <MonthlyGoalCard goal={finance.monthlyGoal} />}

      {/* Filtro de período dos gráficos */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold">Visão do período</h2>
        <div className="flex flex-wrap items-center gap-2">
          {PERIOD_OPTIONS.map((option) => (
            <Link
              key={option}
              href={`/dashboard?periodo=${option}`}
              className={cn(
                "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                option === periodDays
                  ? "border-primary bg-primary text-foreground shadow-glow-sm"
                  : "border-border bg-card text-muted hover:bg-card-hover hover:text-foreground",
              )}
            >
              {option} dias
            </Link>
          ))}
        </div>
      </div>

      {/* Gráficos */}
      {finance && (
        <Card>
          <CardHeader>
            <CardTitle>Faturamento diário</CardTitle>
            <CardDescription>Últimos {periodDays} dias</CardDescription>
          </CardHeader>
          <CardContent>
            <RevenueAreaChart data={finance.dailySeries} />
          </CardContent>
        </Card>
      )}

      <div className={cn("grid gap-4 lg:grid-cols-2", finance && "xl:grid-cols-3")}>
        {finance && (
          <Card>
            <CardHeader>
              <CardTitle>Faturamento por cliente</CardTitle>
              <CardDescription>Top 8 no período de {periodDays} dias</CardDescription>
            </CardHeader>
            <CardContent>
              <ClientRevenueBarChart data={finance.revenueByClient} />
            </CardContent>
          </Card>
        )}
        <Card>
          <CardHeader>
            <CardTitle>Tarefas por status</CardTitle>
            <CardDescription>Distribuição atual das tarefas abertas e fechadas</CardDescription>
          </CardHeader>
          <CardContent>
            <TaskStatusDonutChart data={data.tasksByStatus} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Projetos por situação</CardTitle>
            <CardDescription>Quantidade de projetos em cada status</CardDescription>
          </CardHeader>
          <CardContent>
            <ProjectStatusBarChart data={data.projectsByStatus} />
          </CardContent>
        </Card>
      </div>

      {/* Linha final — listas */}
      <div className="grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Minhas tarefas prioritárias</CardTitle>
            <CardDescription>Tarefas abertas atribuídas a você</CardDescription>
          </CardHeader>
          <CardContent>
            {data.myTasks.length === 0 ? (
              <EmptyState
                icon={ClipboardList}
                title="Nenhuma tarefa aberta"
                description="Você está em dia! Novas tarefas atribuídas a você aparecerão aqui."
              />
            ) : (
              <ul className="space-y-1">
                {data.myTasks.map((task) => {
                  const overdue = task.dueDate !== null && task.dueDate < nowSP;
                  return (
                    <li key={task.id}>
                      <Link
                        href={`/tarefas/${task.id}`}
                        className="flex items-center justify-between gap-3 rounded-lg px-2 py-2 transition-colors hover:bg-card-hover"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium">{task.title}</p>
                          <p className={cn("text-xs", overdue ? "text-danger" : "text-muted")}>
                            {task.dueDate
                              ? overdue
                                ? `Venceu em ${formatDate(task.dueDate)}`
                                : `Prazo ${formatDate(task.dueDate)}`
                              : "Sem prazo"}
                          </p>
                        </div>
                        <Badge tone={PRIORITY_TONE[task.priority] ?? "neutral"}>
                          {PRIORITIES[task.priority as Priority] ?? task.priority}
                        </Badge>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Projetos em risco</CardTitle>
            <CardDescription>Prazo próximo, tarefas atrasadas ou status atrasado</CardDescription>
          </CardHeader>
          <CardContent>
            {data.riskProjects.length === 0 ? (
              <EmptyState
                icon={FolderKanban}
                title="Nenhum projeto em risco"
                description="Todos os projetos estão dentro do prazo."
              />
            ) : (
              <ul className="space-y-1">
                {data.riskProjects.map((project) => (
                  <li key={project.id}>
                    <Link
                      href={`/projetos/${project.id}`}
                      className="flex items-center justify-between gap-3 rounded-lg px-2 py-2 transition-colors hover:bg-card-hover"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{project.name}</p>
                        <p className="truncate text-xs text-muted">
                          {project.clientName} · Prazo {formatDate(project.dueDate)}
                        </p>
                        {project.overdueTasks > 0 && (
                          <p className="text-xs text-danger">
                            {project.overdueTasks}{" "}
                            {project.overdueTasks === 1
                              ? "tarefa atrasada"
                              : "tarefas atrasadas"}
                          </p>
                        )}
                      </div>
                      <Badge tone={PROJECT_STATUS_TONE[project.status] ?? "neutral"}>
                        {PROJECT_STATUS[project.status as ProjectStatus] ?? project.status}
                      </Badge>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Próximos prazos</CardTitle>
            <CardDescription>Tarefas abertas que vencem nos próximos 7 dias</CardDescription>
          </CardHeader>
          <CardContent>
            {data.upcomingDeadlines.length === 0 ? (
              <EmptyState
                icon={CalendarClock}
                title="Nenhum prazo nos próximos 7 dias"
                description="Sem vencimentos próximos na equipe."
              />
            ) : (
              <ul className="space-y-1">
                {data.upcomingDeadlines.map((task) => (
                  <li key={task.id}>
                    <Link
                      href={`/tarefas/${task.id}`}
                      className="flex items-center gap-3 rounded-lg px-2 py-2 transition-colors hover:bg-card-hover"
                    >
                      <Avatar
                        name={task.responsible?.fullName ?? "Sem responsável"}
                        src={task.responsible?.avatarUrl}
                        size="sm"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{task.title}</p>
                        <p className="truncate text-xs text-muted">
                          {task.responsible?.fullName ?? "Sem responsável"}
                        </p>
                      </div>
                      <span className="shrink-0 text-xs text-muted">
                        {formatDate(task.dueDate)}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Atividades recentes</CardTitle>
            <CardDescription>Últimas movimentações da equipe</CardDescription>
          </CardHeader>
          <CardContent>
            {data.recentActivities.length === 0 ? (
              <EmptyState
                icon={Activity}
                title="Nenhuma atividade registrada"
                description="As ações da equipe aparecerão aqui."
              />
            ) : (
              <ul className="space-y-1">
                {data.recentActivities.map((activity) => (
                  <li key={activity.id} className="flex items-start gap-3 px-2 py-2">
                    <Avatar
                      name={activity.actor?.fullName ?? "Sistema"}
                      src={activity.actor?.avatarUrl}
                      size="sm"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm">
                        <span className="font-medium">
                          {activity.actor?.fullName ?? "Sistema"}
                        </span>{" "}
                        <span className="text-muted">
                          {activity.message ?? "registrou uma atividade"}
                        </span>
                      </p>
                      <p className="text-xs text-muted">
                        {formatDistanceToNow(activity.createdAt, {
                          locale: ptBR,
                          addSuffix: true,
                        })}
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
  );
}

/** Card compacto de indicador operacional. */
function StatCard({
  label,
  value,
  icon: Icon,
  danger = false,
}: {
  label: string;
  value: number;
  icon: LucideIcon;
  danger?: boolean;
}) {
  return (
    <Card>
      <CardContent className="flex flex-col gap-2 p-4">
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs text-muted">{label}</span>
          <Icon
            className={cn("h-4 w-4 shrink-0", danger ? "text-danger" : "text-neon")}
            aria-hidden
          />
        </div>
        <span className={cn("text-2xl font-bold tracking-tight", danger && "text-danger")}>
          {value}
        </span>
      </CardContent>
    </Card>
  );
}

/** Card da meta mensal com barra de progresso. */
function MonthlyGoalCard({
  goal,
}: {
  goal: { goalCents: number; revenueCents: number; progressPercent: number | null };
}) {
  const percent = goal.progressPercent;
  const width = percent === null ? 0 : Math.min(percent, 100);
  return (
    <Card>
      <CardContent className="flex flex-col gap-3 p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Target className="h-4 w-4 text-neon" aria-hidden />
            <span className="text-sm text-muted">Meta mensal</span>
          </div>
          <span className="text-sm font-medium">
            {percent === null
              ? "Meta não definida"
              : `${percent.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}% atingido`}
          </span>
        </div>
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <span className="text-2xl font-bold tracking-tight">
            {formatBRL(goal.revenueCents)}
          </span>
          <span className="text-sm text-muted">
            {goal.goalCents > 0 ? `de ${formatBRL(goal.goalCents)}` : "sem meta configurada"}
          </span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-border/60">
          <div
            className="h-full rounded-full bg-primary shadow-glow-sm transition-[width]"
            style={{ width: `${width}%` }}
          />
        </div>
      </CardContent>
    </Card>
  );
}
