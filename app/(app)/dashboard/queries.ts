import "server-only";

import { addDays, format, startOfDay, startOfMonth, subDays } from "date-fns";
import { db } from "@/lib/db";
import {
  PRIORITY_ORDER,
  PROJECT_STATUS,
  REVENUE_COUNTED_STATUSES,
  TASK_CLOSED_STATUSES,
  TASK_STATUS,
  type Priority,
} from "@/lib/constants";
import { percentChange, toSaoPaulo } from "@/lib/format";

// ---------------------------------------------------------------------------
// Módulo server-only com todas as queries agregadas do dashboard.
// Regras: "faturamento" = soma de netCents de Revenue com status contado
// (PAID/PARTIALLY_PAID) e deletedAt=null, por saleDate. Períodos calculados
// no fuso America/Sao_Paulo. Valores monetários em centavos, exceto onde
// indicado (séries de gráfico usam reais para consumo direto no Recharts).
// ---------------------------------------------------------------------------

/** Status de projeto que mantêm o projeto "aberto". */
const PROJECT_CLOSED_STATUSES = ["DONE", "CANCELED"] as const;

/** Status de projeto considerados "em andamento" no card. */
const PROJECT_ACTIVE_STATUSES = ["IN_PROGRESS", "IN_REVIEW", "PLANNING", "WAITING_CLIENT"] as const;

/** Agora no fuso America/Sao_Paulo (TZDate — funciona com date-fns v4 e Prisma). */
function nowSP() {
  return toSaoPaulo(new Date());
}

// ---------------------------------------------------------------------------
// Faturamento
// ---------------------------------------------------------------------------

/** Soma de netCents no intervalo [start, end) considerando apenas receitas contadas. */
export async function revenueInRange(start: Date, end: Date): Promise<number> {
  const result = await db.revenue.aggregate({
    where: {
      deletedAt: null,
      status: { in: [...REVENUE_COUNTED_STATUSES] },
      saleDate: { gte: start, lt: end },
    },
    _sum: { netCents: true },
  });
  return result._sum.netCents ?? 0;
}

export type RevenuePeriodKey = "today" | "7d" | "15d" | "30d" | "90d";

export type RevenuePeriodData = {
  key: RevenuePeriodKey;
  label: string;
  currentCents: number;
  previousCents: number;
  /** Variação % vs período anterior; null quando não há base de comparação. */
  change: number | null;
};

/**
 * Períodos disponíveis no card de faturamento, cada um comparado ao intervalo
 * equivalente imediatamente anterior.
 */
export async function getRevenuePeriods(): Promise<RevenuePeriodData[]> {
  const now = nowSP();
  const todayStart = startOfDay(now);

  const periods = [
    {
      key: "today" as const,
      label: "Hoje",
      start: todayStart,
      end: now,
      prevStart: startOfDay(subDays(now, 1)),
      prevEnd: todayStart,
    },
    ...([7, 15, 30, 90] as const).map((n) => ({
      key: `${n}d` as RevenuePeriodKey,
      label: `${n} dias`,
      start: startOfDay(subDays(now, n - 1)),
      end: now,
      prevStart: startOfDay(subDays(now, 2 * n - 1)),
      prevEnd: startOfDay(subDays(now, n - 1)),
    })),
  ];

  return Promise.all(
    periods.map(async (p) => {
      const [currentCents, previousCents] = await Promise.all([
        revenueInRange(p.start, p.end),
        revenueInRange(p.prevStart, p.prevEnd),
      ]);
      // Sem faturamento em nenhum dos períodos => sem base de comparação ("—").
      const change =
        currentCents === 0 && previousCents === 0
          ? null
          : percentChange(currentCents, previousCents);
      return { key: p.key, label: p.label, currentCents, previousCents, change };
    }),
  );
}

export type DailyRevenuePoint = { date: string; total: number };

/**
 * Série diária de faturamento dos últimos `days` dias (incluindo hoje),
 * preenchendo dias sem venda com 0. `total` em reais para o gráfico.
 */
export async function getDailyRevenueSeries(days: number): Promise<DailyRevenuePoint[]> {
  const now = nowSP();
  const start = startOfDay(subDays(now, days - 1));

  const revenues = await db.revenue.findMany({
    where: {
      deletedAt: null,
      status: { in: [...REVENUE_COUNTED_STATUSES] },
      saleDate: { gte: start, lte: now },
    },
    select: { saleDate: true, netCents: true },
  });

  const totalsByDay = new Map<string, number>();
  for (const revenue of revenues) {
    const key = format(toSaoPaulo(revenue.saleDate), "dd/MM");
    totalsByDay.set(key, (totalsByDay.get(key) ?? 0) + revenue.netCents);
  }

  const series: DailyRevenuePoint[] = [];
  for (let i = 0; i < days; i++) {
    const key = format(addDays(start, i), "dd/MM");
    series.push({ date: key, total: (totalsByDay.get(key) ?? 0) / 100 });
  }
  return series;
}

export type ClientRevenueSlice = { name: string; total: number };

/** Faturamento por cliente no período (top 8). `total` em reais para o gráfico. */
export async function getRevenueByClient(days: number): Promise<ClientRevenueSlice[]> {
  const now = nowSP();
  const start = startOfDay(subDays(now, days - 1));

  const grouped = await db.revenue.groupBy({
    by: ["clientId"],
    where: {
      deletedAt: null,
      status: { in: [...REVENUE_COUNTED_STATUSES] },
      saleDate: { gte: start, lte: now },
    },
    _sum: { netCents: true },
  });

  const clientIds = grouped
    .map((g) => g.clientId)
    .filter((id): id is string => id !== null);
  const clients = clientIds.length
    ? await db.client.findMany({
        where: { id: { in: clientIds } },
        select: { id: true, legalName: true, tradeName: true },
      })
    : [];
  const nameById = new Map(clients.map((c) => [c.id, c.tradeName ?? c.legalName]));

  return grouped
    .map((g) => ({
      name: g.clientId ? (nameById.get(g.clientId) ?? "Cliente removido") : "Sem cliente",
      total: (g._sum.netCents ?? 0) / 100,
    }))
    .filter((slice) => slice.total > 0)
    .sort((a, b) => b.total - a.total)
    .slice(0, 8);
}

export type MonthlyGoalData = {
  goalCents: number;
  revenueCents: number;
  /** % da meta atingida; null quando não há meta definida. */
  progressPercent: number | null;
};

/** Meta mensal (Setting 'monthly_goal_cents') vs faturamento do mês corrente. */
export async function getMonthlyGoal(): Promise<MonthlyGoalData> {
  const now = nowSP();
  const monthStart = startOfMonth(now);

  const [setting, revenueCents] = await Promise.all([
    db.setting.findUnique({ where: { key: "monthly_goal_cents" } }),
    revenueInRange(monthStart, now),
  ]);

  const goalCents = setting ? Number.parseInt(setting.value, 10) || 0 : 0;
  const progressPercent = goalCents > 0 ? (revenueCents / goalCents) * 100 : null;
  return { goalCents, revenueCents, progressPercent };
}

// ---------------------------------------------------------------------------
// Contadores operacionais
// ---------------------------------------------------------------------------

/** Clientes com status ACTIVE e não arquivados. */
export function getActiveClientsCount(): Promise<number> {
  return db.client.count({ where: { status: "ACTIVE", archivedAt: null } });
}

/** Projetos abertos em andamento (IN_PROGRESS/IN_REVIEW/PLANNING/WAITING_CLIENT). */
export function getProjectsInProgressCount(): Promise<number> {
  return db.project.count({
    where: { archivedAt: null, status: { in: [...PROJECT_ACTIVE_STATUSES] } },
  });
}

/** Projetos em atraso: abertos com dueDate no passado, ou status LATE. */
export function getOverdueProjectsCount(): Promise<number> {
  const now = nowSP();
  return db.project.count({
    where: {
      archivedAt: null,
      OR: [
        { status: "LATE" },
        { status: { notIn: [...PROJECT_CLOSED_STATUSES] }, dueDate: { lt: now } },
      ],
    },
  });
}

/** Tarefas abertas (status fora de DONE/CANCELED). */
export function getPendingTasksCount(): Promise<number> {
  return db.task.count({
    where: { archivedAt: null, status: { notIn: [...TASK_CLOSED_STATUSES] } },
  });
}

/** Tarefas vencidas: abertas com dueDate no passado. */
export function getOverdueTasksCount(): Promise<number> {
  const now = nowSP();
  return db.task.count({
    where: {
      archivedAt: null,
      status: { notIn: [...TASK_CLOSED_STATUSES] },
      dueDate: { lt: now },
    },
  });
}

/** Tarefas concluídas no mês corrente (por completedAt). */
export function getTasksCompletedThisMonthCount(): Promise<number> {
  const now = nowSP();
  const monthStart = startOfMonth(now);
  return db.task.count({
    where: { archivedAt: null, completedAt: { gte: monthStart, lte: now } },
  });
}

export function getActiveGoalsCount(): Promise<number> {
  return db.goal.count({ where: { archivedAt: null, status: { in: ["PLANNING", "IN_PROGRESS"] } } });
}

export function getPendingMissionsCount(userId: string): Promise<number> {
  return db.mission.count({
    where: { archivedAt: null, status: { notIn: ["DONE", "CANCELED"] }, OR: [{ assigneeId: userId }, { assigneeId: null }] },
  });
}

// ---------------------------------------------------------------------------
// Distribuições por status (gráficos)
// ---------------------------------------------------------------------------

export type StatusCount = { status: string; label: string; count: number };

/** Tarefas não arquivadas agrupadas por status, com label PT-BR. */
export async function getTasksByStatus(): Promise<StatusCount[]> {
  const grouped = await db.task.groupBy({
    by: ["status"],
    where: { archivedAt: null },
    _count: { _all: true },
  });
  const countByStatus = new Map(grouped.map((g) => [g.status, g._count._all]));
  return Object.entries(TASK_STATUS)
    .map(([status, label]) => ({ status, label, count: countByStatus.get(status) ?? 0 }))
    .filter((entry) => entry.count > 0);
}

/** Projetos não arquivados agrupados por status, com label PT-BR. */
export async function getProjectsByStatus(): Promise<StatusCount[]> {
  const grouped = await db.project.groupBy({
    by: ["status"],
    where: { archivedAt: null },
    _count: { _all: true },
  });
  const countByStatus = new Map(grouped.map((g) => [g.status, g._count._all]));
  return Object.entries(PROJECT_STATUS)
    .map(([status, label]) => ({ status, label, count: countByStatus.get(status) ?? 0 }))
    .filter((entry) => entry.count > 0);
}

// ---------------------------------------------------------------------------
// Listas da linha final
// ---------------------------------------------------------------------------

export type MyPriorityTask = {
  id: string;
  title: string;
  priority: string;
  status: string;
  dueDate: Date | null;
};

/**
 * Tarefas abertas do usuário (responsável ou atribuído), ordenadas por
 * PRIORITY_ORDER e depois por prazo mais próximo. Top 6.
 */
export async function getMyPriorityTasks(userId: string): Promise<MyPriorityTask[]> {
  const tasks = await db.task.findMany({
    where: {
      archivedAt: null,
      status: { notIn: [...TASK_CLOSED_STATUSES] },
      OR: [{ responsibleId: userId }, { assignees: { some: { userId } } }],
    },
    select: { id: true, title: true, priority: true, status: true, dueDate: true },
  });

  const priorityRank = (priority: string) => {
    const index = PRIORITY_ORDER.indexOf(priority as Priority);
    return index === -1 ? PRIORITY_ORDER.length : index;
  };

  return tasks
    .sort(
      (a, b) =>
        priorityRank(a.priority) - priorityRank(b.priority) ||
        (a.dueDate?.getTime() ?? Number.POSITIVE_INFINITY) -
          (b.dueDate?.getTime() ?? Number.POSITIVE_INFINITY),
    )
    .slice(0, 6);
}

export type RiskProject = {
  id: string;
  name: string;
  status: string;
  dueDate: Date | null;
  clientName: string;
  overdueTasks: number;
};

/**
 * Projetos em risco: abertos com prazo em menos de 7 dias (ou vencido),
 * com tarefas atrasadas ou status LATE. Top 5, com contagem de tarefas atrasadas.
 */
export async function getProjectsAtRisk(): Promise<RiskProject[]> {
  const now = nowSP();
  const soon = addDays(now, 7);

  const projects = await db.project.findMany({
    where: { archivedAt: null, status: { notIn: [...PROJECT_CLOSED_STATUSES] } },
    select: {
      id: true,
      name: true,
      status: true,
      dueDate: true,
      client: { select: { legalName: true, tradeName: true } },
      _count: {
        select: {
          tasks: {
            where: {
              archivedAt: null,
              status: { notIn: [...TASK_CLOSED_STATUSES] },
              dueDate: { lt: now },
            },
          },
        },
      },
    },
  });

  return projects
    .map((p) => ({
      id: p.id,
      name: p.name,
      status: p.status,
      dueDate: p.dueDate,
      clientName: p.client.tradeName ?? p.client.legalName,
      overdueTasks: p._count.tasks,
    }))
    .filter(
      (p) =>
        p.status === "LATE" ||
        p.overdueTasks > 0 ||
        (p.dueDate !== null && p.dueDate < soon),
    )
    .sort(
      (a, b) =>
        (a.dueDate?.getTime() ?? Number.POSITIVE_INFINITY) -
          (b.dueDate?.getTime() ?? Number.POSITIVE_INFINITY) ||
        b.overdueTasks - a.overdueTasks,
    )
    .slice(0, 5);
}

export type UpcomingDeadline = {
  id: string;
  title: string;
  dueDate: Date | null;
  responsible: { fullName: string; avatarUrl: string | null } | null;
};

/** Tarefas abertas com prazo nos próximos 7 dias (a partir de agora). Top 8. */
export function getUpcomingDeadlines(): Promise<UpcomingDeadline[]> {
  const now = nowSP();
  return db.task.findMany({
    where: {
      archivedAt: null,
      status: { notIn: [...TASK_CLOSED_STATUSES] },
      dueDate: { gte: now, lt: addDays(now, 7) },
    },
    orderBy: { dueDate: "asc" },
    take: 8,
    select: {
      id: true,
      title: true,
      dueDate: true,
      responsible: { select: { fullName: true, avatarUrl: true } },
    },
  });
}

export type RecentActivity = {
  id: string;
  message: string | null;
  action: string;
  entityType: string;
  createdAt: Date;
  actor: { fullName: string; avatarUrl: string | null } | null;
};

/** Últimas 12 atividades da equipe (ActivityLog), com ator. */
export function getRecentActivities(): Promise<RecentActivity[]> {
  return db.activityLog.findMany({
    orderBy: { createdAt: "desc" },
    take: 12,
    select: {
      id: true,
      message: true,
      action: true,
      entityType: true,
      createdAt: true,
      actor: { select: { fullName: true, avatarUrl: true } },
    },
  });
}

// ---------------------------------------------------------------------------
// Agregador
// ---------------------------------------------------------------------------

export type DashboardFinanceData = {
  revenuePeriods: RevenuePeriodData[];
  dailySeries: DailyRevenuePoint[];
  revenueByClient: ClientRevenueSlice[];
  monthlyGoal: MonthlyGoalData;
};

export type DashboardData = {
  /** Dados financeiros — null quando o usuário não possui finance.view. */
  finance: DashboardFinanceData | null;
  activeClients: number;
  projectsInProgress: number;
  overdueProjects: number;
  pendingTasks: number;
  overdueTasks: number;
  completedThisMonth: number;
  activeGoals: number;
  pendingMissions: number;
  tasksByStatus: StatusCount[];
  projectsByStatus: StatusCount[];
  myTasks: MyPriorityTask[];
  riskProjects: RiskProject[];
  upcomingDeadlines: UpcomingDeadline[];
  recentActivities: RecentActivity[];
};

/** Executa todas as queries do dashboard em paralelo. */
export async function getDashboardData(
  userId: string,
  options: { includeFinance: boolean; periodDays: number },
): Promise<DashboardData> {
  const financePromise: Promise<DashboardFinanceData | null> = options.includeFinance
    ? Promise.all([
        getRevenuePeriods(),
        getDailyRevenueSeries(options.periodDays),
        getRevenueByClient(options.periodDays),
        getMonthlyGoal(),
      ]).then(([revenuePeriods, dailySeries, revenueByClient, monthlyGoal]) => ({
        revenuePeriods,
        dailySeries,
        revenueByClient,
        monthlyGoal,
      }))
    : Promise.resolve(null);

  const [
    finance,
    activeClients,
    projectsInProgress,
    overdueProjects,
    pendingTasks,
    overdueTasks,
    completedThisMonth,
    activeGoals,
    pendingMissions,
    tasksByStatus,
    projectsByStatus,
    myTasks,
    riskProjects,
    upcomingDeadlines,
    recentActivities,
  ] = await Promise.all([
    financePromise,
    getActiveClientsCount(),
    getProjectsInProgressCount(),
    getOverdueProjectsCount(),
    getPendingTasksCount(),
    getOverdueTasksCount(),
    getTasksCompletedThisMonthCount(),
    getActiveGoalsCount(),
    getPendingMissionsCount(userId),
    getTasksByStatus(),
    getProjectsByStatus(),
    getMyPriorityTasks(userId),
    getProjectsAtRisk(),
    getUpcomingDeadlines(),
    getRecentActivities(),
  ]);

  return {
    finance,
    activeClients,
    projectsInProgress,
    overdueProjects,
    pendingTasks,
    overdueTasks,
    completedThisMonth,
    activeGoals,
    pendingMissions,
    tasksByStatus,
    projectsByStatus,
    myTasks,
    riskProjects,
    upcomingDeadlines,
    recentActivities,
  };
}
