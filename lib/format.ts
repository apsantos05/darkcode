import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { TZDate } from "@date-fns/tz";

export const TIMEZONE = "America/Sao_Paulo";

/** Converte uma data para o fuso America/Sao_Paulo. */
export function toSaoPaulo(date: Date): TZDate {
  return new TZDate(date, TIMEZONE);
}

/** Formata centavos como moeda BRL: 12345 -> "R$ 123,45". */
export function formatBRL(cents: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(cents / 100);
}

/** DD/MM/AAAA */
export function formatDate(date: Date | string | null | undefined): string {
  if (!date) return "—";
  return format(toSaoPaulo(new Date(date)), "dd/MM/yyyy", { locale: ptBR });
}

/** DD/MM/AAAA HH:mm */
export function formatDateTime(date: Date | string | null | undefined): string {
  if (!date) return "—";
  return format(toSaoPaulo(new Date(date)), "dd/MM/yyyy HH:mm", { locale: ptBR });
}

/** HH:mm */
export function formatTime(date: Date | string | null | undefined): string {
  if (!date) return "—";
  return format(toSaoPaulo(new Date(date)), "HH:mm", { locale: ptBR });
}

/** Variação percentual entre períodos. Retorna null quando não há base de comparação. */
export function percentChange(current: number, previous: number): number | null {
  if (previous === 0) return current === 0 ? 0 : null;
  return ((current - previous) / previous) * 100;
}

export function formatPercent(value: number): string {
  return `${value >= 0 ? "+" : ""}${value.toLocaleString("pt-BR", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  })}%`;
}

/** Converte string monetária pt-BR ("1.234,56") para centavos. */
export function parseBRLToCents(value: string): number {
  const normalized = value.replace(/[R$\s.]/g, "").replace(",", ".");
  const parsed = Number.parseFloat(normalized);
  if (Number.isNaN(parsed)) return 0;
  return Math.round(parsed * 100);
}

export function greetingForHour(hour: number): string {
  if (hour >= 5 && hour < 12) return "Bom dia";
  if (hour >= 12 && hour < 18) return "Boa tarde";
  return "Boa noite";
}
