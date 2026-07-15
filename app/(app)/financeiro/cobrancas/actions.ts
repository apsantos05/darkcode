"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth/current-user";
import { assertPermission } from "@/lib/rbac";
import { rateLimit } from "@/lib/rate-limit";
import { paymentChargeSchema } from "@/lib/validators/payment-charge";
import {
  BlackcatApiError,
  createBlackcatPixSale,
} from "@/lib/integrations/blackcat/client";

export type ChargeActionResult = {
  ok: boolean;
  message?: string;
  fieldErrors?: Record<string, string[]>;
  charge?: {
    id: string;
    transactionId: string;
    invoiceUrl?: string;
    pixCopyPaste?: string;
  };
};

export async function createPaymentChargeAction(
  _previous: ChargeActionResult | null,
  formData: FormData,
): Promise<ChargeActionResult> {
  const user = await requireUser();
  assertPermission(user.role, "finance.manage");

  if (!rateLimit(`blackcat:create:${user.id}`, 6, 60_000)) {
    return { ok: false, message: "Muitas cobranças em sequência. Aguarde um minuto e tente novamente." };
  }

  const parsed = paymentChargeSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { ok: false, fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const input = parsed.data;
  const [client, project] = await Promise.all([
    db.client.findFirst({ where: { id: input.clientId, archivedAt: null } }),
    input.projectId
      ? db.project.findFirst({ where: { id: input.projectId, archivedAt: null } })
      : null,
  ]);

  if (!client) return { ok: false, fieldErrors: { clientId: ["Cliente não encontrado"] } };
  if (project && project.clientId !== client.id) {
    return { ok: false, fieldErrors: { projectId: ["O projeto não pertence ao cliente selecionado"] } };
  }

  const externalReference = `DC-${randomUUID()}`;
  const charge = await db.paymentCharge.create({
    data: {
      externalReference,
      description: input.description,
      grossCents: input.amount,
      netCents: input.amount,
      status: "CREATING",
      paymentMethod: "PIX",
      clientId: client.id,
      projectId: project?.id,
      createdById: user.id,
    },
  });

  try {
    const appUrl = process.env.APP_URL?.replace(/\/$/, "");
    if (!appUrl?.startsWith("https://")) {
      throw new BlackcatApiError("Configure a APP_URL pública com HTTPS antes de gerar cobranças.");
    }

    const transaction = await createBlackcatPixSale({
      amount: input.amount,
      description: input.description,
      externalReference,
      customer: {
        name: input.customerName,
        email: input.customerEmail,
        phone: input.customerPhone,
        document: {
          type: input.customerDocument.length === 11 ? "cpf" : "cnpj",
          number: input.customerDocument,
        },
      },
      postbackUrl: `${appUrl}/api/webhooks/blackcat`,
      expiresInDays: input.expiresInDays,
    });

    const updated = await db.paymentCharge.update({
      where: { id: charge.id },
      data: {
        providerTransactionId: transaction.transactionId,
        status: transaction.status.toUpperCase(),
        grossCents: transaction.amount,
        feeCents: transaction.fees ?? 0,
        netCents: transaction.netAmount ?? transaction.amount - (transaction.fees ?? 0),
        invoiceUrl: transaction.invoiceUrl,
        pixCopyPaste: transaction.paymentData?.copyPaste,
        expiresAt: transaction.paymentData?.expiresAt
          ? new Date(transaction.paymentData.expiresAt)
          : null,
      },
    });

    revalidatePath("/financeiro");
    return {
      ok: true,
      message: "Cobrança PIX criada com sucesso.",
      charge: {
        id: updated.id,
        transactionId: transaction.transactionId,
        invoiceUrl: updated.invoiceUrl ?? undefined,
        pixCopyPaste: updated.pixCopyPaste ?? undefined,
      },
    };
  } catch (error) {
    await db.paymentCharge.update({
      where: { id: charge.id },
      data: { status: "FAILED" },
    });

    const message =
      error instanceof BlackcatApiError
        ? error.message
        : "Não foi possível comunicar com a BlackCat agora. Tente novamente.";
    return { ok: false, message };
  }
}
