"use client";

import { useTransition } from "react";
import { Check, CheckCheck } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { markAllReadAction, markReadAction } from "./actions";

/** Botão por item: marca uma notificação como lida. */
export function MarkReadButton({ id }: { id: string }) {
  const [pending, startTransition] = useTransition();

  return (
    <Button
      variant="ghost"
      size="sm"
      loading={pending}
      onClick={() =>
        startTransition(async () => {
          const result = await markReadAction(id);
          if (!result.ok) {
            toast.error(result.message ?? "Não foi possível marcar como lida.");
          }
        })
      }
    >
      {!pending && <Check className="h-3.5 w-3.5" aria-hidden />}
      Marcar como lida
    </Button>
  );
}

/** Botão do topo: marca todas as notificações não lidas do usuário. */
export function MarkAllReadButton({ unreadCount }: { unreadCount: number }) {
  const [pending, startTransition] = useTransition();

  return (
    <Button
      variant="secondary"
      size="sm"
      loading={pending}
      disabled={unreadCount === 0}
      onClick={() =>
        startTransition(async () => {
          const result = await markAllReadAction();
          if (result.ok) {
            toast.success(result.message ?? "Notificações marcadas como lidas.");
          } else {
            toast.error(result.message ?? "Não foi possível concluir a ação.");
          }
        })
      }
    >
      {!pending && <CheckCheck className="h-4 w-4" aria-hidden />}
      Marcar todas como lidas
      {unreadCount > 0 && (
        <span className="ml-1 rounded-full bg-primary/20 px-1.5 py-0.5 text-[10px] font-bold text-neon">
          {unreadCount}
        </span>
      )}
    </Button>
  );
}
