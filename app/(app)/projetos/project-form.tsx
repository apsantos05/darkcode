"use client";

import Link from "next/link";
import { useActionState } from "react";
import { PRIORITIES, PROJECT_STATUS } from "@/lib/constants";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox, Field, Input, Select, Textarea } from "@/components/ui/input";
import { Avatar } from "@/components/ui/avatar";
import type { ActionResult } from "./actions";

export type ProjectFormClientOption = {
  id: string;
  legalName: string;
  tradeName: string | null;
};

export type ProjectFormUserOption = {
  id: string;
  fullName: string;
  avatarUrl: string | null;
  position: string | null;
};

export type ProjectFormDefaults = {
  name: string;
  clientId: string;
  description: string;
  scope: string;
  managerId: string;
  startDate: string; // AAAA-MM-DD
  dueDate: string; // AAAA-MM-DD
  contract: string; // moeda pt-BR
  received: string; // moeda pt-BR
  status: string;
  priority: string;
  links: string; // uma URL por linha
  notes: string;
  memberIds: string[];
};

export const EMPTY_PROJECT_DEFAULTS: ProjectFormDefaults = {
  name: "",
  clientId: "",
  description: "",
  scope: "",
  managerId: "",
  startDate: "",
  dueDate: "",
  contract: "",
  received: "",
  status: "PLANNING",
  priority: "MEDIUM",
  links: "",
  notes: "",
  memberIds: [],
};

export function ProjectForm({
  action,
  clients,
  managers,
  users,
  defaults,
  cancelHref,
  submitLabel,
}: {
  action: (prev: ActionResult | null, formData: FormData) => Promise<ActionResult>;
  clients: ProjectFormClientOption[];
  managers: ProjectFormUserOption[];
  users: ProjectFormUserOption[];
  defaults: ProjectFormDefaults;
  cancelHref: string;
  submitLabel: string;
}) {
  const [state, formAction, isPending] = useActionState(action, null);
  const errors = state?.fieldErrors ?? {};

  return (
    <form action={formAction} className="space-y-6">
      {state && !state.ok && state.message && (
        <p
          className="rounded-lg border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger"
          role="alert"
        >
          {state.message}
        </p>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Dados do projeto</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Nome" htmlFor="name" required error={errors.name} className="sm:col-span-2">
            <Input
              id="name"
              name="name"
              defaultValue={defaults.name}
              maxLength={160}
              required
              placeholder="Ex.: Site institucional — Fase 2"
            />
          </Field>

          <Field label="Cliente" htmlFor="clientId" required error={errors.clientId}>
            <Select id="clientId" name="clientId" defaultValue={defaults.clientId} required>
              <option value="">Selecione o cliente</option>
              {clients.map((client) => (
                <option key={client.id} value={client.id}>
                  {client.tradeName || client.legalName}
                </option>
              ))}
            </Select>
          </Field>

          <Field label="Gestor" htmlFor="managerId" error={errors.managerId}>
            <Select id="managerId" name="managerId" defaultValue={defaults.managerId}>
              <option value="">Sem gestor definido</option>
              {managers.map((manager) => (
                <option key={manager.id} value={manager.id}>
                  {manager.fullName}
                </option>
              ))}
            </Select>
          </Field>

          <Field label="Status" htmlFor="status" required error={errors.status}>
            <Select id="status" name="status" defaultValue={defaults.status} required>
              {Object.entries(PROJECT_STATUS).map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </Select>
          </Field>

          <Field label="Prioridade" htmlFor="priority" required error={errors.priority}>
            <Select id="priority" name="priority" defaultValue={defaults.priority} required>
              {Object.entries(PRIORITIES).map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </Select>
          </Field>

          <Field label="Data de início" htmlFor="startDate" error={errors.startDate}>
            <Input id="startDate" name="startDate" type="date" defaultValue={defaults.startDate} />
          </Field>

          <Field label="Prazo de entrega" htmlFor="dueDate" error={errors.dueDate}>
            <Input id="dueDate" name="dueDate" type="date" defaultValue={defaults.dueDate} />
          </Field>

          <Field label="Valor contratado (R$)" htmlFor="contract" error={errors.contractCents}>
            <Input
              id="contract"
              name="contract"
              inputMode="decimal"
              defaultValue={defaults.contract}
              placeholder="0,00"
            />
          </Field>

          <Field label="Valor recebido (R$)" htmlFor="received" error={errors.receivedCents}>
            <Input
              id="received"
              name="received"
              inputMode="decimal"
              defaultValue={defaults.received}
              placeholder="0,00"
            />
          </Field>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Detalhes</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-4">
          <Field label="Descrição" htmlFor="description" error={errors.description}>
            <Textarea
              id="description"
              name="description"
              defaultValue={defaults.description}
              placeholder="Resumo do projeto, objetivos e contexto"
            />
          </Field>

          <Field label="Escopo" htmlFor="scope" error={errors.scope}>
            <Textarea
              id="scope"
              name="scope"
              defaultValue={defaults.scope}
              placeholder="Entregáveis e limites do que está contratado"
            />
          </Field>

          <Field label="Links (uma URL por linha)" htmlFor="links" error={errors.links}>
            <Textarea
              id="links"
              name="links"
              defaultValue={defaults.links}
              placeholder={"https://drive.google.com/…\nhttps://figma.com/…"}
            />
          </Field>

          <Field label="Observações" htmlFor="notes" error={errors.notes}>
            <Textarea
              id="notes"
              name="notes"
              defaultValue={defaults.notes}
              placeholder="Anotações internas sobre o projeto"
            />
          </Field>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Membros da equipe</CardTitle>
        </CardHeader>
        <CardContent>
          {users.length === 0 ? (
            <p className="text-sm text-muted">Nenhum usuário ativo disponível.</p>
          ) : (
            <fieldset>
              <legend className="sr-only">Selecione os membros do projeto</legend>
              <ul className="grid max-h-72 grid-cols-1 gap-1 overflow-y-auto pr-1 sm:grid-cols-2" role="list">
                {users.map((member) => (
                  <li key={member.id}>
                    <label className="flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2 transition-colors hover:bg-card-hover">
                      <Checkbox
                        name="memberIds"
                        value={member.id}
                        defaultChecked={defaults.memberIds.includes(member.id)}
                      />
                      <Avatar name={member.fullName} src={member.avatarUrl} size="sm" />
                      <span className="min-w-0">
                        <span className="block truncate text-sm">{member.fullName}</span>
                        {member.position && (
                          <span className="block truncate text-xs text-muted">{member.position}</span>
                        )}
                      </span>
                    </label>
                  </li>
                ))}
              </ul>
            </fieldset>
          )}
          {errors.memberIds && (
            <p className="mt-2 text-xs text-danger" role="alert">
              {errors.memberIds[0]}
            </p>
          )}
        </CardContent>
      </Card>

      <div className="flex items-center justify-end gap-2">
        <Link href={cancelHref} className={buttonVariants({ variant: "secondary", size: "md" })}>
          Cancelar
        </Link>
        <Button type="submit" loading={isPending}>
          {submitLabel}
        </Button>
      </div>
    </form>
  );
}
