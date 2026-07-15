import { z } from "zod";
import { parseBRLToCents } from "@/lib/format";

const CURRENCY_RE = /^(R\$\s*)?(\d{1,3}(\.\d{3})*|\d+)(,\d{1,2})?$/;
const digits = (value: string) => value.replace(/\D/g, "");

export const paymentChargeSchema = z.object({
  description: z.string().trim().min(2, "Informe a descrição").max(160),
  clientId: z.string().uuid("Selecione um cliente"),
  projectId: z.union([z.literal(""), z.string().uuid("Projeto inválido")]).optional().transform((value) => value || undefined),
  amount: z
    .string()
    .trim()
    .regex(CURRENCY_RE, "Use o formato 0,00")
    .transform(parseBRLToCents)
    .refine((value) => value >= 100, "A cobrança mínima é de R$ 1,00"),
  customerName: z.string().trim().min(3, "Informe o nome do pagador").max(160),
  customerEmail: z.string().trim().email("Informe um e-mail válido").max(160),
  customerPhone: z
    .string()
    .transform(digits)
    .refine((value) => value.length >= 10 && value.length <= 13, "Informe um telefone válido"),
  customerDocument: z
    .string()
    .transform(digits)
    .refine((value) => value.length === 11 || value.length === 14, "Informe um CPF ou CNPJ válido"),
  expiresInDays: z.coerce.number().int().min(1).max(30).default(2),
});

export type PaymentChargeInput = z.infer<typeof paymentChargeSchema>;
