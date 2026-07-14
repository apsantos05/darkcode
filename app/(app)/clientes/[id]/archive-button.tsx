"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Archive, ArchiveRestore } from "lucide-react";
import {
  archiveClientAction,
  unarchiveClientAction,
} from "@/app/(app)/clientes/actions";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/dialog";

export function ArchiveClientButton({
  clientId,
  clientName,
  archived,
}: {
  clientId: string;
  clientName: string;
  archived: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  const onConfirm = () => {
    startTransition(async () => {
      const result = archived
        ? await unarchiveClientAction(clientId)
        : await archiveClientAction(clientId);
      if (result.ok) {
        toast.success(result.message ?? "Operação concluída.");
        setOpen(false);
        router.refresh();
      } else {
        toast.error(result.message ?? "Não foi possível concluir a operação.");
      }
    });
  };

  return (
    <>
      <Button
        variant={archived ? "success" : "danger"}
        onClick={() => setOpen(true)}
        aria-label={archived ? `Restaurar cliente ${clientName}` : `Arquivar cliente ${clientName}`}
      >
        {archived ? (
          <ArchiveRestore className="h-4 w-4" aria-hidden />
        ) : (
          <Archive className="h-4 w-4" aria-hidden />
        )}
        {archived ? "Restaurar" : "Arquivar"}
      </Button>

      <ConfirmDialog
        open={open}
        onClose={() => setOpen(false)}
        onConfirm={onConfirm}
        loading={pending}
        title={archived ? "Restaurar cliente" : "Arquivar cliente"}
        description={
          archived
            ? `O cliente "${clientName}" voltará a aparecer na listagem principal.`
            : `O cliente "${clientName}" será arquivado e deixará de aparecer na listagem principal. Nenhum dado será excluído — você pode restaurá-lo a qualquer momento.`
        }
        confirmLabel={archived ? "Restaurar" : "Arquivar"}
      />
    </>
  );
}
