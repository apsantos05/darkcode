"use client";

// Gráficos do dashboard — client components que recebem dados prontos
// (serializáveis) por props. Recharts não lê classes Tailwind, então as
// cores usam os hex da paleta Dark Code diretamente.

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export type DailyRevenuePoint = { date: string; total: number };
export type ClientRevenueSlice = { name: string; total: number };
export type StatusCount = { status: string; label: string; count: number };

const PALETTE = {
  purple: "#7C3AED",
  neon: "#A855F7",
  green: "#22C55E",
  yellow: "#F59E0B",
  red: "#EF4444",
  blue: "#0EA5E9",
  gray: "#94A3B8",
  grid: "#292D3A",
  card: "#151821",
  foreground: "#F8FAFC",
} as const;

/** Cores por status de tarefa — coerentes com os tons dos badges. */
const TASK_STATUS_COLORS: Record<string, string> = {
  NOT_STARTED: PALETTE.gray,
  IN_ANALYSIS: PALETTE.blue,
  IN_PROGRESS: PALETTE.purple,
  WAITING_CLIENT: PALETTE.yellow,
  WAITING_THIRD_PARTY: "#FBBF24",
  IN_REVIEW: "#38BDF8",
  DONE: PALETTE.green,
  BLOCKED: PALETTE.red,
  CANCELED: "#64748B",
};

/** Cores por status de projeto — coerentes com os tons dos badges. */
const PROJECT_STATUS_COLORS: Record<string, string> = {
  PLANNING: PALETTE.blue,
  IN_PROGRESS: PALETTE.purple,
  IN_REVIEW: PALETTE.yellow,
  WAITING_CLIENT: "#FBBF24",
  PAUSED: PALETTE.gray,
  DONE: PALETTE.green,
  CANCELED: "#64748B",
  LATE: PALETTE.red,
};

const brl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const brlCompact = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  notation: "compact",
  maximumFractionDigits: 1,
});

const tooltipProps = {
  contentStyle: {
    backgroundColor: PALETTE.card,
    border: `1px solid ${PALETTE.grid}`,
    borderRadius: 8,
    fontSize: 12,
  },
  labelStyle: { color: PALETTE.gray },
  itemStyle: { color: PALETTE.foreground },
} as const;

function ChartEmpty({ message = "Sem dados no período" }: { message?: string }) {
  return (
    <div className="flex h-[280px] items-center justify-center text-sm text-muted">
      {message}
    </div>
  );
}

/** AreaChart do faturamento diário (gradiente roxo). */
export function RevenueAreaChart({ data }: { data: DailyRevenuePoint[] }) {
  if (data.length === 0) return <ChartEmpty />;
  return (
    <ResponsiveContainer width="100%" height={280}>
      <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="dashboardRevenueGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={PALETTE.neon} stopOpacity={0.4} />
            <stop offset="100%" stopColor={PALETTE.purple} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid stroke={PALETTE.grid} strokeDasharray="3 3" vertical={false} />
        <XAxis
          dataKey="date"
          tick={{ fill: PALETTE.gray, fontSize: 11 }}
          tickLine={false}
          axisLine={{ stroke: PALETTE.grid }}
          minTickGap={24}
        />
        <YAxis
          tick={{ fill: PALETTE.gray, fontSize: 11 }}
          tickLine={false}
          axisLine={false}
          width={72}
          tickFormatter={(value) => brlCompact.format(Number(value))}
        />
        <Tooltip
          {...tooltipProps}
          cursor={{ stroke: PALETTE.grid }}
          formatter={(value) => [brl.format(Number(value)), "Faturamento"]}
        />
        <Area
          type="monotone"
          dataKey="total"
          stroke={PALETTE.neon}
          strokeWidth={2}
          fill="url(#dashboardRevenueGradient)"
          activeDot={{ r: 4, fill: PALETTE.neon, stroke: PALETTE.card }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

/** BarChart horizontal do faturamento por cliente (top 8). */
export function ClientRevenueBarChart({ data }: { data: ClientRevenueSlice[] }) {
  if (data.length === 0) return <ChartEmpty />;
  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={data} layout="vertical" margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
        <CartesianGrid stroke={PALETTE.grid} strokeDasharray="3 3" horizontal={false} />
        <XAxis
          type="number"
          tick={{ fill: PALETTE.gray, fontSize: 11 }}
          tickLine={false}
          axisLine={{ stroke: PALETTE.grid }}
          tickFormatter={(value) => brlCompact.format(Number(value))}
        />
        <YAxis
          type="category"
          dataKey="name"
          width={130}
          tick={{ fill: PALETTE.gray, fontSize: 11 }}
          tickLine={false}
          axisLine={false}
        />
        <Tooltip
          {...tooltipProps}
          cursor={{ fill: "rgba(124, 58, 237, 0.08)" }}
          formatter={(value) => [brl.format(Number(value)), "Faturamento"]}
        />
        <Bar dataKey="total" fill={PALETTE.purple} radius={[0, 4, 4, 0]} barSize={18} />
      </BarChart>
    </ResponsiveContainer>
  );
}

/** Donut de tarefas por status, cores coerentes com os badges. */
export function TaskStatusDonutChart({ data }: { data: StatusCount[] }) {
  if (data.length === 0) return <ChartEmpty message="Nenhuma tarefa cadastrada" />;
  return (
    <ResponsiveContainer width="100%" height={280}>
      <PieChart>
        <Pie
          data={data}
          dataKey="count"
          nameKey="label"
          innerRadius={58}
          outerRadius={88}
          paddingAngle={2}
          stroke="none"
        >
          {data.map((entry) => (
            <Cell
              key={entry.status}
              fill={TASK_STATUS_COLORS[entry.status] ?? PALETTE.gray}
            />
          ))}
        </Pie>
        <Tooltip
          {...tooltipProps}
          formatter={(value, name) => [`${value} tarefa(s)`, String(name)]}
        />
        <Legend
          layout="vertical"
          align="right"
          verticalAlign="middle"
          iconType="circle"
          iconSize={8}
          formatter={(value) => (
            <span style={{ color: PALETTE.gray, fontSize: 12 }}>{value}</span>
          )}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}

/** BarChart horizontal de projetos por situação. */
export function ProjectStatusBarChart({ data }: { data: StatusCount[] }) {
  if (data.length === 0) return <ChartEmpty message="Nenhum projeto cadastrado" />;
  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={data} layout="vertical" margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
        <CartesianGrid stroke={PALETTE.grid} strokeDasharray="3 3" horizontal={false} />
        <XAxis
          type="number"
          allowDecimals={false}
          tick={{ fill: PALETTE.gray, fontSize: 11 }}
          tickLine={false}
          axisLine={{ stroke: PALETTE.grid }}
        />
        <YAxis
          type="category"
          dataKey="label"
          width={140}
          tick={{ fill: PALETTE.gray, fontSize: 11 }}
          tickLine={false}
          axisLine={false}
        />
        <Tooltip
          {...tooltipProps}
          cursor={{ fill: "rgba(124, 58, 237, 0.08)" }}
          formatter={(value) => [`${value} projeto(s)`, "Quantidade"]}
        />
        <Bar dataKey="count" radius={[0, 4, 4, 0]} barSize={18}>
          {data.map((entry) => (
            <Cell
              key={entry.status}
              fill={PROJECT_STATUS_COLORS[entry.status] ?? PALETTE.gray}
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
