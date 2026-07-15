"use client";
import Link from "next/link";
import { useActionState } from "react";
import { AREAS, USER_ROLES, USER_STATUS } from "@/lib/constants";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, Input, Select } from "@/components/ui/input";
import type { UserActionResult } from "./actions";

export type UserFormDefaults = { fullName: string; username: string; email: string; position: string; area: string; role: string; status: string };
export const EMPTY_USER_DEFAULTS: UserFormDefaults = { fullName: "", username: "", email: "", position: "", area: "", role: "COLLABORATOR", status: "ACTIVE" };

export function UserForm({ action, defaults, editing = false }: { action: (prev: UserActionResult | null, data: FormData) => Promise<UserActionResult>; defaults: UserFormDefaults; editing?: boolean }) {
  const [state, formAction, pending] = useActionState(action, null); const errors = state?.fieldErrors ?? {};
  return <form action={formAction} className="space-y-6">
    {state && !state.ok && state.message && <p role="alert" className="rounded-lg border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">{state.message}</p>}
    <Card><CardHeader><CardTitle>Dados de acesso</CardTitle></CardHeader><CardContent className="grid gap-4 sm:grid-cols-2">
      <Field label="Nome completo" htmlFor="fullName" required error={errors.fullName}><Input id="fullName" name="fullName" defaultValue={defaults.fullName} required /></Field>
      <Field label="Nome de usuário" htmlFor="username" required error={errors.username}><Input id="username" name="username" defaultValue={defaults.username} required autoCapitalize="none" /></Field>
      <Field label="E-mail" htmlFor="email" required error={errors.email}><Input id="email" name="email" type="email" defaultValue={defaults.email} required /></Field>
      <Field label={editing ? "Nova senha (opcional)" : "Senha"} htmlFor="password" required={!editing} error={errors.password}><Input id="password" name="password" type="password" required={!editing} minLength={editing ? undefined : 8} autoComplete="new-password" /></Field>
    </CardContent></Card>
    <Card><CardHeader><CardTitle>Cargo e permissões</CardTitle></CardHeader><CardContent className="grid gap-4 sm:grid-cols-2">
      <Field label="Cargo" htmlFor="position" error={errors.position}><Input id="position" name="position" defaultValue={defaults.position} placeholder="Ex.: Diretor comercial" /></Field>
      <Field label="Área" htmlFor="area" error={errors.area}><Select id="area" name="area" defaultValue={defaults.area}><option value="">Sem área definida</option>{AREAS.map((area) => <option key={area} value={area}>{area}</option>)}</Select></Field>
      <Field label="Nível de acesso" htmlFor="role" required error={errors.role}><Select id="role" name="role" defaultValue={defaults.role}>{Object.entries(USER_ROLES).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</Select></Field>
      <Field label="Status" htmlFor="status" required error={errors.status}><Select id="status" name="status" defaultValue={defaults.status}>{Object.entries(USER_STATUS).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</Select></Field>
    </CardContent></Card>
    <div className="flex justify-end gap-2"><Link href="/admin/usuarios" className={buttonVariants({ variant: "secondary" })}>Cancelar</Link><Button type="submit" loading={pending}>{editing ? "Salvar alterações" : "Criar usuário"}</Button></div>
  </form>;
}
