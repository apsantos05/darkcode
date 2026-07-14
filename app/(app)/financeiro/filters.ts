import type { Prisma } from "@prisma/client";
import { REVENUE_STATUS } from "@/lib/constants";

/**
 * Filtros da listagem de receitas — compartilhados entre a página
 * (/financeiro) e a exportação CSV (/financeiro/exportar) para que ambas
 * apliquem EXATAMENTE as mesmas regras.
 */
export type RevenueFilters = {
  inicio?: string; // yyyy-mm-dd
  fim?: string; // yyyy-mm-dd
  cliente?: string; // Client.id
  projeto?: string; // Project.id
  status?: string; // chave de REVENUE_STATUS
  q?: string; // busca em description
};

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

type SearchParamsLike = URLSearchParams | Record<string, string | string[] | undefined>;

function readParam(params: SearchParamsLike, key: string): string | undefined {
  let raw: string | undefined;
  if (params instanceof URLSearchParams) {
    raw = params.get(key) ?? undefined;
  } else {
    const value = params[key];
    raw = Array.isArray(value) ? value[0] : value;
  }
  const trimmed = raw?.trim();
  return trimmed ? trimmed : undefined;
}

/** Normaliza e sanitiza os searchParams (página ou route handler). */
export function parseRevenueFilters(params: SearchParamsLike): RevenueFilters {
  const inicio = readParam(params, "inicio");
  const fim = readParam(params, "fim");
  const status = readParam(params, "status");
  return {
    inicio: inicio && DATE_RE.test(inicio) ? inicio : undefined,
    fim: fim && DATE_RE.test(fim) ? fim : undefined,
    cliente: readParam(params, "cliente"),
    projeto: readParam(params, "projeto"),
    status: status && status in REVENUE_STATUS ? status : undefined,
    q: readParam(params, "q")?.slice(0, 200),
  };
}

// Limites do dia no fuso America/Sao_Paulo (UTC-3 fixo; o Brasil não adota
// horário de verão desde 2019).
function startOfDaySaoPaulo(date: string): Date {
  return new Date(`${date}T00:00:00.000-03:00`);
}

function endOfDaySaoPaulo(date: string): Date {
  return new Date(`${date}T23:59:59.999-03:00`);
}

/** Constrói o where do Prisma. Sempre exclui receitas com exclusão lógica. */
export function buildRevenueWhere(filters: RevenueFilters): Prisma.RevenueWhereInput {
  const where: Prisma.RevenueWhereInput = { deletedAt: null };
  if (filters.inicio || filters.fim) {
    where.saleDate = {
      ...(filters.inicio ? { gte: startOfDaySaoPaulo(filters.inicio) } : {}),
      ...(filters.fim ? { lte: endOfDaySaoPaulo(filters.fim) } : {}),
    };
  }
  if (filters.cliente) where.clientId = filters.cliente;
  if (filters.projeto) where.projectId = filters.projeto;
  if (filters.status) where.status = filters.status;
  // PostgreSQL: a busca textual usa comparação case-insensitive.
  if (filters.q) where.description = { contains: filters.q };
  return where;
}

/** Querystring com os filtros ativos (para presets e link de exportação). */
export function revenueFilterQueryString(filters: RevenueFilters): string {
  const params = new URLSearchParams();
  if (filters.inicio) params.set("inicio", filters.inicio);
  if (filters.fim) params.set("fim", filters.fim);
  if (filters.cliente) params.set("cliente", filters.cliente);
  if (filters.projeto) params.set("projeto", filters.projeto);
  if (filters.status) params.set("status", filters.status);
  if (filters.q) params.set("q", filters.q);
  return params.toString();
}
