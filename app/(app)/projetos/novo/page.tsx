import type { Metadata } from "next";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth/current-user";
import { PageHeader } from "@/components/layout/page-header";
import { createProjectAction } from "../actions";
import { EMPTY_PROJECT_DEFAULTS, ProjectForm } from "../project-form";

export const metadata: Metadata = { title: "Novo projeto — Dark Code CRM" };

export default async function NovoProjetoPage() {
  await requireRole("ADMIN", "MANAGER");

  const [clients, managers, users] = await Promise.all([
    db.client.findMany({
      where: { archivedAt: null },
      orderBy: { legalName: "asc" },
      select: { id: true, legalName: true, tradeName: true },
    }),
    db.user.findMany({
      where: { role: { in: ["ADMIN", "MANAGER"] }, status: "ACTIVE", deletedAt: null },
      orderBy: { fullName: "asc" },
      select: { id: true, fullName: true, avatarUrl: true, position: true },
    }),
    db.user.findMany({
      where: { status: "ACTIVE", deletedAt: null, role: { not: "CLIENT" } },
      orderBy: { fullName: "asc" },
      select: { id: true, fullName: true, avatarUrl: true, position: true },
    }),
  ]);

  return (
    <div className="mx-auto max-w-3xl animate-fade-in">
      <PageHeader
        title="Novo projeto"
        description="Cadastre um projeto e monte a equipe responsável."
      />
      <ProjectForm
        action={createProjectAction}
        clients={clients}
        managers={managers}
        users={users}
        defaults={EMPTY_PROJECT_DEFAULTS}
        cancelHref="/projetos"
        submitLabel="Criar projeto"
      />
    </div>
  );
}
