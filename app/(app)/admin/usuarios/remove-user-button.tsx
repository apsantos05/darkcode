"use client";
import { useTransition } from "react";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { archiveUserAction } from "./actions";
export function RemoveUserButton({ id, name }: { id: string; name: string }) {
  const [pending, startTransition] = useTransition();
  return <Button type="button" variant="danger" size="iconSm" loading={pending} aria-label={`Remover ${name}`} onClick={() => { if (!window.confirm(`Remover o acesso de ${name}? O histórico será preservado.`)) return; startTransition(async () => { const result = await archiveUserAction(id); if (result.ok) toast.success(result.message); else toast.error(result.message); }); }}>{!pending && <Trash2 className="h-4 w-4" />}</Button>;
}
