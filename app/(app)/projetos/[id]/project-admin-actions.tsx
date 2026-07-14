"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Archive, ArchiveRestore, Pencil } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/dialog";
import { archiveProjectAction, unarchiveProjectAction } from "../actions";

export function ProjectAdminActions({
  projectId,
  projectName,
  archived,
  canEdit,
  canArchive,
}: {
  projectId: string;
  projectName: string;
  archived: boolean;
  canEdit: boolean;
  canArchive: boolean;
}) {
  const router = useRouter();
  const [confirmOpen, setConfirmOpen] = React.useState(false);
  const [isPending, startTransition] = React.useTransition();
  const [error, setError] = React.useState<string | null>(null);

  const handleArchive = () => {
    setError(null);
    startTransition(async () => {
      const result = await archiveProjectAction(projectId);
      if (result.ok) {
        setConfirmOpen(false);
        router.push("/projetos");
      } else {
        setError(result.message ?? "Não foi possível arquivar o projeto.");
        setConfirmOpen(false);
      }
    });
  };

  const handleUnarchive = () => {
    setError(null);
    startTransition(async () => {
      const result = await unarchiveProjectAction(projectId);
      if (!result.ok) {
        setError(result.message ?? "Não foi possível desarquivar o projeto.");
      } else {
        router.refresh();
      }
    });
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      {error && (
        <p className="w-full text-xs text-danger" role="alert">
          {error}
        </p>
      )}
      {canEdit && !archived && (
        <Link
          href={`/projetos/${projectId}/editar`}
          className={buttonVariants({ variant: "secondary", size: "sm" })}
        >
          <Pencil className="h-4 w-4" aria-hidden />
          Editar
        </Link>
      )}
      {canArchive &&
        (archived ? (
          <Button variant="success" size="sm" onClick={handleUnarchive} loading={isPending}>
            {!isPending && <ArchiveRestore className="h-4 w-4" aria-hidden />}
            Desarquivar
          </Button>
        ) : (
          <Button variant="danger" size="sm" onClick={() => setConfirmOpen(true)}>
            <Archive className="h-4 w-4" aria-hidden />
            Arquivar
          </Button>
        ))}

      <ConfirmDialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={handleArchive}
        title="Arquivar projeto"
        description={`Tem certeza que deseja arquivar o projeto "${projectName}"? Ele deixará de aparecer na listagem padrão, mas poderá ser desarquivado depois.`}
        confirmLabel="Arquivar"
        loading={isPending}
      />
    </div>
  );
}
