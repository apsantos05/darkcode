import { z } from "zod";
import { CLIENT_STATUS, type ClientStatus } from "@/lib/constants";
import { parseBRLToCents } from "@/lib/format";

const CLIENT_STATUS_KEYS = Object.keys(CLIENT_STATUS) as [ClientStatus, ...ClientStatus[]];

/** Campo de texto opcional: apara espaços e converte string vazia em null. */
const optionalText = (max: number, label: string) =>
  z
    .string()
    .trim()
    .max(max, `${label} deve ter no máximo ${max} caracteres`)
    .transform((value) => (value === "" ? null : value));

/** Prefixa https:// quando o protocolo foi omitido. */
function normalizeUrl(value: string): string {
  return /^https?:\/\//i.test(value) ? value : `https://${value}`;
}

function isValidUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return (url.protocol === "http:" || url.protocol === "https:") && url.hostname.includes(".");
  } catch {
    return false;
  }
}

/** Validação leve de CPF/CNPJ: apenas caracteres e quantidade de dígitos (11 ou 14). */
function isValidDocument(value: string): boolean {
  if (!/^[\d.\-/\s]+$/.test(value)) return false;
  const digits = value.replace(/\D/g, "");
  return digits.length === 11 || digits.length === 14;
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const MONEY_REGEX = /^(R\$\s*)?(\d{1,3}(\.\d{3})*|\d+)(,\d{1,2})?$/;

export const clientSchema = z.object({
  legalName: z
    .string()
    .trim()
    .min(2, "O nome deve ter ao menos 2 caracteres")
    .max(160, "O nome deve ter no máximo 160 caracteres"),
  tradeName: optionalText(160, "O nome fantasia"),
  document: optionalText(24, "O documento").refine(
    (value) => value === null || isValidDocument(value),
    { message: "Documento inválido — informe um CPF (11 dígitos) ou CNPJ (14 dígitos)" },
  ),
  contactName: optionalText(120, "O nome do contato"),
  email: optionalText(160, "O e-mail").refine(
    (value) => value === null || EMAIL_REGEX.test(value),
    { message: "E-mail inválido" },
  ),
  phone: optionalText(30, "O telefone"),
  whatsapp: optionalText(30, "O WhatsApp"),
  website: optionalText(300, "O site")
    .transform((value) => (value === null ? null : normalizeUrl(value)))
    .refine((value) => value === null || isValidUrl(value), { message: "URL inválida" }),
  segment: optionalText(80, "O segmento"),
  product: optionalText(160, "O produto/serviço"),
  contract: z
    .string()
    .trim()
    .refine((value) => value === "" || MONEY_REGEX.test(value), {
      message: "Valor inválido — use o formato 1.234,56",
    })
    .transform((value) => (value === "" ? 0 : parseBRLToCents(value)))
    .refine((cents) => cents >= 0 && cents <= 100_000_000_000, {
      message: "Valor fora do intervalo permitido",
    }),
  startDate: z
    .string()
    .trim()
    .refine((value) => value === "" || /^\d{4}-\d{2}-\d{2}$/.test(value), {
      message: "Data inválida",
    })
    .transform((value) => (value === "" ? null : new Date(`${value}T12:00:00-03:00`)))
    .refine((date) => date === null || !Number.isNaN(date.getTime()), {
      message: "Data inválida",
    }),
  ownerId: optionalText(40, "O responsável interno"),
  status: z.enum(CLIENT_STATUS_KEYS),
  notes: optionalText(4000, "As observações"),
  links: z
    .string()
    .trim()
    .max(4000, "A lista de links deve ter no máximo 4000 caracteres")
    .transform((value) =>
      value === ""
        ? []
        : value
            .split(/\r?\n/)
            .map((line) => line.trim())
            .filter(Boolean)
            .map(normalizeUrl),
    )
    .refine((urls) => urls.length <= 20, { message: "Informe no máximo 20 links" })
    .refine((urls) => urls.every(isValidUrl), {
      message: "Cada linha deve conter uma URL válida",
    }),
});

export type ClientInput = z.infer<typeof clientSchema>;

/** Labels PT-BR dos campos do cliente (usados em mensagens de auditoria). */
export const CLIENT_FIELD_LABELS: Record<string, string> = {
  legalName: "Nome/Razão social",
  tradeName: "Nome fantasia",
  document: "CPF/CNPJ",
  contactName: "Contato",
  email: "E-mail",
  phone: "Telefone",
  whatsapp: "WhatsApp",
  website: "Site",
  segment: "Segmento",
  product: "Produto/Serviço",
  contractCents: "Valor do contrato",
  startDate: "Data de entrada",
  ownerId: "Responsável interno",
  status: "Status",
  notes: "Observações",
  links: "Links",
};
