import { notFound } from "next/navigation";
import { format } from "date-fns";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth/current-user";
import { toSaoPaulo } from "@/lib/format";
import { PageHeader } from "@/components/layout/page-header";
import { ClientForm, type ClientFormInitial } from "@/app/(app)/clientes/client-form";

export const metadata = { title: "Editar cliente" };

/** Centavos -> valor de input pt-BR ("1.234,56"). */
function centsToInput(cents: number): string {
  return (cents / 100).toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/** Date -> valor de input date (yyyy-MM-dd) no fuso de São Paulo. */
function dateToInput(date: Date | null): string {
  if (!date) return "";
  return format(toSaoPaulo(date), "yyyy-MM-dd");
}

/** JSON string de links -> textarea (uma URL por linha). */
function linksToInput(raw: string | null): string {
  if (!raw) return "";
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed)
      ? parsed.filter((v): v is string => typeof v === "string").join("\n")
      : "";
  } catch {
    return "";
  }
}

export default async function EditarClientePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireRole("ADMIN", "MANAGER");

  const { id } = await params;
  const client = await db.client.findUnique({ where: { id } });
  if (!client) notFound();

  const owners = await db.user.findMany({
    where: {
      deletedAt: null,
      status: "ACTIVE",
      role: { in: ["ADMIN", "MANAGER", "COLLABORATOR"] },
    },
    select: { id: true, fullName: true },
    orderBy: { fullName: "asc" },
  });

  const initial: ClientFormInitial = {
    id: client.id,
    legalName: client.legalName,
    tradeName: client.tradeName ?? "",
    document: client.document ?? "",
    contactName: client.contactName ?? "",
    email: client.email ?? "",
    phone: client.phone ?? "",
    whatsapp: client.whatsapp ?? "",
    website: client.website ?? "",
    segment: client.segment ?? "",
    product: client.product ?? "",
    contract: centsToInput(client.contractCents),
    startDate: dateToInput(client.startDate),
    ownerId: client.ownerId ?? "",
    status: client.status,
    notes: client.notes ?? "",
    links: linksToInput(client.links),
  };

  return (
    <div className="mx-auto max-w-3xl animate-fade-in">
      <PageHeader
        title="Editar cliente"
        description={client.legalName}
      />
      <ClientForm owners={owners} initial={initial} />
    </div>
  );
}
