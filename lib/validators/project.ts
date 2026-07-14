import { z } from "zod";
import { PRIORITIES, PROJECT_STATUS, type Priority, type ProjectStatus } from "@/lib/constants";
import { parseBRLToCents } from "@/lib/format";

const PROJECT_STATUS_KEYS = Object.keys(PROJECT_STATUS) as [ProjectStatus, ...ProjectStatus[]];
const PRIORITY_KEYS = Object.keys(PRIORITIES) as [Priority, ...Priority[]];

function isValidUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

/** Texto opcional: string vazia vira null. */
const optionalText = z
  .string()
  .optional()
  .transform((value) => {
    const trimmed = value?.trim();
    return trimmed ? trimmed : null;
  });

/** Id opcional vindo de <select>: string vazia vira null. */
const optionalId = z
  .string()
  .optional()
  .transform((value) => (value?.trim() ? value.trim() : null));

/** Data opcional de <input type="date"> (AAAA-MM-DD) → Date ao meio-dia UTC (estável em America/Sao_Paulo). */
const optionalDate = z
  .string()
  .optional()
  .transform((value) => (value?.trim() ? value.trim() : null))
  .refine((value) => value === null || /^\d{4}-\d{2}-\d{2}$/.test(value), {
    message: "Data inválida",
  })
  .transform((value) => (value ? new Date(`${value}T12:00:00.000Z`) : null));

/** Moeda pt-BR ("1.234,56") → centavos (Int, nunca negativo). */
const moneyToCents = z
  .string()
  .optional()
  .transform((value) => parseBRLToCents(value ?? ""))
  .refine((cents) => Number.isInteger(cents) && cents >= 0, {
    message: "Informe um valor válido (ex.: 1.234,56)",
  });

/** Uma URL por linha → JSON array string (null quando vazio). */
const linksToJson = z
  .string()
  .optional()
  .transform((value) =>
    (value ?? "")
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean),
  )
  .refine((lines) => lines.every(isValidUrl), {
    message: "Cada linha deve conter uma URL válida iniciando com http:// ou https://",
  })
  .transform((lines) => (lines.length > 0 ? JSON.stringify(lines) : null));

export const projectSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(2, "O nome deve ter no mínimo 2 caracteres")
      .max(160, "O nome deve ter no máximo 160 caracteres"),
    clientId: z.string().trim().min(1, "Selecione o cliente"),
    description: optionalText,
    scope: optionalText,
    managerId: optionalId,
    startDate: optionalDate,
    dueDate: optionalDate,
    contractCents: moneyToCents,
    receivedCents: moneyToCents,
    status: z.enum(PROJECT_STATUS_KEYS, { message: "Status inválido" }),
    priority: z.enum(PRIORITY_KEYS, { message: "Prioridade inválida" }),
    links: linksToJson,
    notes: optionalText,
    memberIds: z.array(z.string().min(1)).default([]),
  })
  .refine(
    (data) => !data.startDate || !data.dueDate || data.dueDate >= data.startDate,
    { message: "O prazo não pode ser anterior à data de início", path: ["dueDate"] },
  );

export type ProjectInput = z.infer<typeof projectSchema>;
