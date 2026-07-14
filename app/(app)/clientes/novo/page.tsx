import { requireRole } from "@/lib/auth/current-user";
import { db } from "@/lib/db";
import { PageHeader } from "@/components/layout/page-header";
import { ClientForm } from "@/app/(app)/clientes/client-form";

export const metadata = { title: "Novo cliente" };

export default async function NovoClientePage() {
  await requireRole("ADMIN", "MANAGER");

  const owners = await db.user.findMany({
    where: {
      deletedAt: null,
      status: "ACTIVE",
      role: { in: ["ADMIN", "MANAGER", "COLLABORATOR"] },
    },
    select: { id: true, fullName: true },
    orderBy: { fullName: "asc" },
  });

  return (
    <div className="mx-auto max-w-3xl animate-fade-in">
      <PageHeader
        title="Novo cliente"
        description="Cadastre um cliente na carteira da Dark Code"
      />
      <ClientForm owners={owners} />
    </div>
  );
}
