"use client";
import { useTransition } from "react";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toggleChecklistItemAction } from "../actions";

export function ChecklistToggle({ taskId, itemId, done, label }: { taskId: string; itemId: string; done: boolean; label: string }) {
  const [pending, startTransition] = useTransition();
  return <Button type="button" variant={done ? "success" : "secondary"} size="iconSm" loading={pending} aria-label={`${done ? "Desmarcar" : "Marcar"} ${label}`} onClick={() => startTransition(() => toggleChecklistItemAction(taskId, itemId))}>{!pending && <Check className="h-3.5 w-3.5" aria-hidden />}</Button>;
}
