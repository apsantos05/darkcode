"use client";
import Link from "next/link";
import { useActionState } from "react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, Input, Select, Textarea } from "@/components/ui/input";
import { createNotificationAction } from "./actions";
export function NotificationForm({ users }: { users: { id: string; fullName: string; position: string | null }[] }) {
  const [state, action, pending] = useActionState(createNotificationAction, null); const errors = state?.fieldErrors ?? {};
  return <form action={action} className="space-y-6"><Card><CardHeader><CardTitle>Novo comunicado</CardTitle></CardHeader><CardContent className="space-y-4">
    {state?.message && <p role="status" className={`rounded-lg border px-4 py-3 text-sm ${state.ok ? "border-success/30 bg-success/10 text-success" : "border-danger/30 bg-danger/10 text-danger"}`}>{state.message}</p>}
    <Field label="Destinatários" htmlFor="target" required error={errors.target}><Select id="target" name="target" defaultValue="ALL"><option value="ALL">Toda a equipe ativa</option>{users.map((user) => <option key={user.id} value={user.id}>{user.fullName}{user.position ? ` — ${user.position}` : ""}</option>)}</Select></Field>
    <Field label="Título" htmlFor="title" required error={errors.title}><Input id="title" name="title" required maxLength={160} placeholder="Ex.: Reunião geral amanhã" /></Field>
    <Field label="Mensagem" htmlFor="body" required error={errors.body}><Textarea id="body" name="body" required maxLength={2000} className="min-h-32" placeholder="Escreva a notificação que será enviada" /></Field>
    <Field label="Link interno (opcional)" htmlFor="link" error={errors.link}><Input id="link" name="link" placeholder="Ex.: /tarefas ou /projetos" /></Field>
  </CardContent></Card><div className="flex justify-end gap-2"><Link href="/notificacoes" className={buttonVariants({ variant: "secondary" })}>Voltar</Link><Button type="submit" loading={pending}>Enviar notificação</Button></div></form>;
}
