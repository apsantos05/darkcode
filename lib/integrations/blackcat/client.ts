import "server-only";
import { z } from "zod";

const transactionSchema = z.object({
  transactionId: z.string().min(1),
  status: z.string().min(1),
  paymentMethod: z.string().min(1),
  amount: z.number().int().nonnegative(),
  netAmount: z.number().int().nonnegative().optional(),
  fees: z.number().int().nonnegative().optional(),
  invoiceUrl: z.string().url().optional(),
  createdAt: z.string().datetime().optional(),
  paidAt: z.string().datetime().optional(),
  endToEndId: z.string().optional(),
  paymentData: z
    .object({
      copyPaste: z.string().optional(),
      expiresAt: z.string().datetime().optional(),
    })
    .passthrough()
    .optional(),
});

const apiResponseSchema = z.object({
  success: z.boolean(),
  data: transactionSchema.optional(),
  message: z.string().optional(),
  error: z.string().optional(),
});

export type BlackcatTransaction = z.infer<typeof transactionSchema>;

export type CreateBlackcatSaleInput = {
  amount: number;
  description: string;
  externalReference: string;
  customer: {
    name: string;
    email: string;
    phone: string;
    document: { type: "cpf" | "cnpj"; number: string };
  };
  postbackUrl: string;
  expiresInDays: number;
};

export class BlackcatApiError extends Error {
  constructor(message: string, readonly status?: number) {
    super(message);
    this.name = "BlackcatApiError";
  }
}
function configuration() {
  const apiKey = process.env.BLACKCAT_API_KEY?.trim();
  const baseUrl = (
    process.env.BLACKCAT_API_BASE_URL?.trim() || "https://api.blackcatoficial.com/api"
  ).replace(/\/$/, "");

  if (!apiKey) {
    throw new BlackcatApiError("A integração BlackCat ainda não possui uma chave de API configurada.");
  }

  return { apiKey, baseUrl };
}

async function request(path: string, init?: RequestInit): Promise<BlackcatTransaction> {
  const { apiKey, baseUrl } = configuration();
  let response: Response;
  try {
    response = await fetch(`${baseUrl}${path}`, {
      ...init,
      cache: "no-store",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        "X-API-Key": apiKey,
        ...init?.headers,
      },
      signal: AbortSignal.timeout(12_000),
    });
  } catch {
    throw new BlackcatApiError(
      "Não foi possível conectar à API da BlackCat. Tente novamente em instantes.",
    );
  }

  const raw: unknown = await response.json().catch(() => null);
  const parsed = apiResponseSchema.safeParse(raw);

  if (!response.ok || !parsed.success || !parsed.data.success || !parsed.data.data) {
    const rawRecord =
      raw && typeof raw === "object" ? (raw as Record<string, unknown>) : undefined;
    const rawMessage =
      typeof rawRecord?.message === "string"
        ? rawRecord.message
        : typeof rawRecord?.error === "string"
          ? rawRecord.error
          : undefined;
    const message = parsed.success
      ? parsed.data.message || parsed.data.error
      : rawMessage;
    throw new BlackcatApiError(
      message ||
        (response.status === 401
          ? "A BlackCat recusou a chave privada configurada. Gere uma nova chave no painel e atualize a integração."
          : "A BlackCat não conseguiu processar a solicitação."),
      response.status,
    );
  }

  return parsed.data.data;
}

export function createBlackcatPixSale(input: CreateBlackcatSaleInput) {
  return request("/sales/create-sale", {
    method: "POST",
    body: JSON.stringify({
      amount: input.amount,
      currency: "BRL",
      paymentMethod: "pix",
      items: [
        {
          title: input.description,
          quantity: 1,
          unitPrice: input.amount,
          tangible: false,
        },
      ],
      customer: input.customer,
      pix: { expiresInDays: input.expiresInDays },
      externalRef: input.externalReference,
      metadata: `Dark Code CRM | ${input.externalReference}`,
      postbackUrl: input.postbackUrl,
    }),
  });
}

export function getBlackcatTransactionStatus(transactionId: string) {
  return request(`/sales/${encodeURIComponent(transactionId)}/status`, { method: "GET" });
}
