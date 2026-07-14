import { z } from "zod";
import { parseBRLToCents } from "@/lib/format";
import {
  PAYMENT_METHODS,
  PLATFORMS,
  REVENUE_STATUS,
  type PaymentMethod,
  type Platform,
  type RevenueStatus,
} from "@/lib/constants";

export const REVENUE_STATUS_VALUES = Object.keys(REVENUE_STATUS) as [RevenueStatus, ...RevenueStatus[]];
export const PAYMENT_METHOD_VALUES = Object.keys(PAYMENT_METHODS) as [PaymentMethod, ...PaymentMethod[]];
export const PLATFORM_VALUES = Object.keys(PLATFORMS) as [Platform, ...Platform[]];

/** "1.234,56", "1234,56" ou "R$ 1.234,56" — sempre vírgula como separador decimal. */
const CURRENCY_RE = /^(R\$\s*)?(\d{1,3}(\.\d{3})*|\d+)(,\d{1,2})?$/;

/** Campo monetário pt-BR: valida o formato e converte para centavos (Int). */
function currencyField(requiredError: string) {
  return z
    .string({ error: requiredError })
    .trim()
    .min(1, requiredError)
    .regex(CURRENCY_RE, "Valor inválido. Use o formato 0,00 (ex.: 1.234,56)")
    .transform((value) => parseBRLToCents(value));
}

/**
 * Campo de data vinda de <input type="date"> (yyyy-mm-dd).
 * Armazenada ao meio-dia UTC (09:00 em America/Sao_Paulo), garantindo que o
 * dia do calendário seja o mesmo tanto em UTC quanto no fuso de exibição.
 */
function dateField(requiredError: string) {
  return z
    .string({ error: requiredError })
    .trim()
    .min(1, requiredError)
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Data inválida")
    .transform((value) => new Date(`${value}T12:00:00Z`))
    .refine((date) => !Number.isNaN(date.getTime()), "Data inválida");
}

/** Converte "" / null / undefined em undefined para campos opcionais de FormData. */
const emptyToUndefined = (value: unknown) =>
  value === null || value === undefined || (typeof value === "string" && value.trim() === "")
    ? undefined
    : value;

/**
 * Schema canônico de receita. Usado pelas server actions do módulo financeiro
 * e pelo webhook de gateways (o adaptador de cada gateway deve normalizar o
 * payload para este formato antes de validar).
 *
 * IMPORTANTE: `gross` e `fee` saem em CENTAVOS após o parse. O valor líquido
 * (netCents) é SEMPRE calculado no servidor como gross - fee — nunca aceito
 * do cliente.
 */
export const revenueSchema = z
  .object({
    description: z
      .string({ error: "Informe a descrição" })
      .trim()
      .min(2, "A descrição deve ter no mínimo 2 caracteres")
      .max(200, "A descrição deve ter no máximo 200 caracteres"),
    clientId: z.preprocess(emptyToUndefined, z.string().max(64, "Cliente inválido").optional()),
    projectId: z.preprocess(emptyToUndefined, z.string().max(64, "Projeto inválido").optional()),
    gross: currencyField("Informe o valor bruto").refine(
      (cents) => cents > 0,
      "O valor bruto deve ser maior que zero",
    ),
    fee: z.preprocess(
      (value) => (emptyToUndefined(value) === undefined ? "0" : value),
      currencyField("Informe as taxas").refine((cents) => cents >= 0, "As taxas não podem ser negativas"),
    ),
    saleDate: dateField("Informe a data da venda"),
    receiveDate: z.preprocess(emptyToUndefined, dateField("Data de recebimento inválida").optional()),
    status: z.enum(REVENUE_STATUS_VALUES, { error: "Status inválido" }),
    paymentMethod: z.enum(PAYMENT_METHOD_VALUES, { error: "Forma de pagamento inválida" }),
    platform: z.enum(PLATFORM_VALUES, { error: "Plataforma inválida" }),
    note: z.preprocess(
      emptyToUndefined,
      z.string().trim().max(2000, "A observação deve ter no máximo 2000 caracteres").optional(),
    ),
  })
  .refine((data) => data.fee <= data.gross, {
    message: "As taxas não podem ser maiores que o valor bruto",
    path: ["fee"],
  });

export type RevenueInput = z.infer<typeof revenueSchema>;
