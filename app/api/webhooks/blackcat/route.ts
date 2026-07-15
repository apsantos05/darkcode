import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { rateLimit } from "@/lib/rate-limit";
import { getBlackcatTransactionStatus } from "@/lib/integrations/blackcat/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const webhookSchema = z.object({
  event: z.enum(["transaction.created", "transaction.paid", "transaction.failed"]),
  transactionId: z.string().min(4).max(160),
  externalReference: z.string().max(160).optional(),
  status: z.string().min(2).max(40),
});

function revenueStatus(status: string) {
  switch (status.toUpperCase()) {
    case "PAID": return "PAID";
    case "REFUNDED": return "REFUNDED";
    case "CANCELLED":
    case "CANCELED":
    case "FAILED": return "CANCELED";
    default: return "PENDING";
  }
}
export async function POST(request: Request) {
  const contentLength = Number(request.headers.get("content-length") || 0);
  if (contentLength > 64_000) return Response.json({ ok: false }, { status: 413 });

  if (request.headers.get("x-webhook-source")?.toLowerCase() !== "blackcat-api") {
    return Response.json({ ok: false }, { status: 401 });
  }

  const forwardedFor = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  if (!rateLimit(`blackcat:webhook:${forwardedFor}`, 120, 60_000)) {
    return Response.json({ ok: false }, { status: 429 });
  }

  const raw: unknown = await request.json().catch(() => null);
  const parsed = webhookSchema.safeParse(raw);
  if (!parsed.success) return Response.json({ ok: false }, { status: 400 });

  const headerEvent = request.headers.get("x-webhook-event");
  if (headerEvent && headerEvent !== parsed.data.event) {
    return Response.json({ ok: false }, { status: 400 });
  }

  const charge = await db.paymentCharge.findFirst({
    where: {
      provider: "BLACKCAT",
      OR: [
        { providerTransactionId: parsed.data.transactionId },
        ...(parsed.data.externalReference
          ? [{ externalReference: parsed.data.externalReference }]
          : []),
      ],
    },
  });

  // O dashboard só processa cobranças originadas nele próprio.
  if (!charge) return Response.json({ ok: true, ignored: true }, { status: 202 });

  try {
    // A documentação não fornece assinatura criptográfica do webhook. Por isso,
    // o status é sempre reconfirmado server-to-server antes de alterar o financeiro.
    const transaction = await getBlackcatTransactionStatus(parsed.data.transactionId);
    if (transaction.transactionId !== parsed.data.transactionId) {
      return Response.json({ ok: false }, { status: 409 });
    }

    const status = transaction.status.toUpperCase();
    const paidAt = transaction.paidAt ? new Date(transaction.paidAt) : null;
    const feeCents = transaction.fees ?? charge.feeCents;
    const netCents = transaction.netAmount ?? transaction.amount - feeCents;

    await db.$transaction(async (tx) => {
      let revenueId = charge.revenueId;
      if (status === "PAID" && !revenueId) {
        const revenue = await tx.revenue.create({
          data: {
            description: charge.description,
            clientId: charge.clientId,
            projectId: charge.projectId,
            grossCents: transaction.amount,
            feeCents,
            netCents,
            saleDate: charge.createdAt,
            receiveDate: paidAt ?? new Date(),
            status: "PAID",
            paymentMethod: "PIX",
            platform: "BLACKCAT",
            note: `BlackCat: ${transaction.transactionId}`,
            createdById: charge.createdById,
          },
        });
        revenueId = revenue.id;
      } else if (revenueId) {
        await tx.revenue.update({
          where: { id: revenueId },
          data: {
            grossCents: transaction.amount,
            feeCents,
            netCents,
            status: revenueStatus(status),
            receiveDate: status === "PAID" ? paidAt ?? new Date() : undefined,
          },
        });
      }

      await tx.paymentCharge.update({
        where: { id: charge.id },
        data: {
          providerTransactionId: transaction.transactionId,
          status,
          grossCents: transaction.amount,
          feeCents,
          netCents,
          paidAt,
          revenueId,
        },
      });
    });

    revalidatePath("/financeiro");
    revalidatePath("/dashboard");
    return Response.json({ ok: true });
  } catch {
    return Response.json({ ok: false }, { status: 503 });
  }
}
