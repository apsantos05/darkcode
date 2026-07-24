import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth/current-user";
import { PageHeader } from "@/components/layout/page-header";
import { ChargeForm } from "../charge-form";

export default async function NewPaymentChargePage() {
  await requireRole("ADMIN", "MANAGER");
  const [clients, projects] = await Promise.all([
    db.client.findMany({
      where: { archivedAt: null },
      orderBy: [{ tradeName: "asc" }, { legalName: "asc" }],
      select: { id: true, legalName: true, tradeName: true, contactName: true, email: true, phone: true, whatsapp: true, document: true },
    }),
    db.project.findMany({
      where: { archivedAt: null },
      orderBy: { name: "asc" },
      select: { id: true, name: true, clientId: true },
    }),
  ]);

  return (
    <>
      <PageHeader title="Nova cobrança" description="Gere um PIX pela BlackCat e acompanhe a confirmação automaticamente." />
      <ChargeForm
        clients={clients.map((client) => ({
          id: client.id,
          name: client.tradeName || client.legalName,
          contactName: client.contactName || "",
          email: client.email || "",
          phone: client.phone || client.whatsapp || "",
          document: client.document || "",
        }))}
        projects={projects}
      />
    </>
  );
}
