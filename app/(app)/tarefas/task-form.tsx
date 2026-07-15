"use client";
import Link from "next/link";
import { useActionState } from "react";
import { PRIORITIES, TASK_STATUS } from "@/lib/constants";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox, Field, Input, Select, Textarea } from "@/components/ui/input";
import type { TaskActionResult } from "./actions";
type Option = { id: string; name?: string; fullName?: string; position?: string | null };
export function TaskForm({ action, projects, users, tasks, projectId = "" }: { action: (prev: TaskActionResult | null, data: FormData) => Promise<TaskActionResult>; projects: Option[]; users: Option[]; tasks: Option[]; projectId?: string }) {
  const [state, formAction, pending] = useActionState(action, null); const errors = state?.fieldErrors ?? {};
  return <form action={formAction} className="space-y-6">{state && !state.ok && state.message && <p role="alert" className="rounded-lg border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">{state.message}</p>}
    <Card><CardHeader><CardTitle>Dados da tarefa</CardTitle></CardHeader><CardContent className="grid gap-4 sm:grid-cols-2">
      <Field className="sm:col-span-2" label="Título" htmlFor="title" required error={errors.title}><Input id="title" name="title" required maxLength={200} placeholder="O que precisa ser feito?" /></Field>
      <Field className="sm:col-span-2" label="Descrição" htmlFor="description" error={errors.description}><Textarea id="description" name="description" placeholder="Detalhes, resultado esperado e orientações" /></Field>
      <Field label="Projeto" htmlFor="projectId" error={errors.projectId}><Select id="projectId" name="projectId" defaultValue={projectId}><option value="">Sem projeto</option>{projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</Select></Field>
      <Field label="Responsável" htmlFor="responsibleId" error={errors.responsibleId}><Select id="responsibleId" name="responsibleId"><option value="">Sem responsável</option>{users.map((u) => <option key={u.id} value={u.id}>{u.fullName}{u.position ? ` — ${u.position}` : ""}</option>)}</Select></Field>
      <Field label="Prioridade" htmlFor="priority" error={errors.priority}><Select id="priority" name="priority" defaultValue="MEDIUM">{Object.entries(PRIORITIES).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</Select></Field>
      <Field label="Status" htmlFor="status" error={errors.status}><Select id="status" name="status" defaultValue="NOT_STARTED">{Object.entries(TASK_STATUS).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</Select></Field>
      <Field label="Início" htmlFor="startDate" error={errors.startDate}><Input id="startDate" name="startDate" type="date" /></Field><Field label="Prazo" htmlFor="dueDate" error={errors.dueDate}><Input id="dueDate" name="dueDate" type="date" /></Field>
      <Field label="Horas estimadas" htmlFor="estimatedHours" error={errors.estimatedHours}><Input id="estimatedHours" name="estimatedHours" inputMode="decimal" placeholder="Ex.: 4,5" /></Field>
      <Field label="Depende da tarefa" htmlFor="dependsOnId" error={errors.dependsOnId}><Select id="dependsOnId" name="dependsOnId"><option value="">Nenhuma</option>{tasks.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}</Select></Field>
      <Field className="sm:col-span-2" label="Tags (separadas por vírgula)" htmlFor="tagNames" error={errors.tagNames}><Input id="tagNames" name="tagNames" placeholder="site, urgente, cliente" /></Field>
      <Field className="sm:col-span-2" label="Motivo do bloqueio (se aplicável)" htmlFor="blockReason" error={errors.blockReason}><Textarea id="blockReason" name="blockReason" /></Field>
    </CardContent></Card>
    <Card><CardHeader><CardTitle>Participantes</CardTitle></CardHeader><CardContent><div className="grid gap-2 sm:grid-cols-2">{users.map((u) => <label key={u.id} className="flex items-center gap-2 rounded-lg p-2 hover:bg-card-hover"><Checkbox name="participantIds" value={u.id} /><span className="text-sm">{u.fullName}</span></label>)}</div>{errors.participantIds && <p className="mt-2 text-xs text-danger">{errors.participantIds[0]}</p>}</CardContent></Card>
    <div className="flex justify-end gap-2"><Link href="/tarefas" className={buttonVariants({ variant: "secondary" })}>Cancelar</Link><Button type="submit" loading={pending}>Criar tarefa</Button></div>
  </form>;
}
