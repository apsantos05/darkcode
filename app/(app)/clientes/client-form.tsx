"use client";

import { useActionState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { AlertCircle } from "lucide-react";
import {
  createClientAction,
  updateClientAction,
  type ActionResult,
} from "@/app/(app)/clientes/actions";
import { CLIENT_STATUS } from "@/lib/constants";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, Input, Select, Textarea } from "@/components/ui/input";

type Owner = { id: string; fullName: string };

/** Valores iniciais do formulário (todos como string, prontos para os inputs). */
export type ClientFormInitial = {
  id: string;
  legalName: string;
  tradeName: string;
  document: string;
  contactName: string;
  email: string;
  phone: string;
  whatsapp: string;
  website: string;
  segment: string;
  product: string;
  contract: string;
  startDate: string;
  ownerId: string;
  status: string;
  notes: string;
  links: string;
};

export function ClientForm({
  owners,
  initial,
}: {
  owners: Owner[];
  initial?: ClientFormInitial;
}) {
  const isEdit = Boolean(initial);
  const action = isEdit ? updateClientAction : createClientAction;
  const [state, formAction, pending] = useActionState<ActionResult | null, FormData>(
    action,
    null,
  );
  const router = useRouter();
  const redirected = useRef(false);

  useEffect(() => {
    if (state?.ok && state.clientId && !redirected.current) {
      redirected.current = true;
      toast.success(state.message ?? "Cliente salvo com sucesso!");
      router.push(`/clientes/${state.clientId}`);
    }
  }, [state, router]);

  const errors = state?.fieldErrors;

  return (
    <form action={formAction} className="space-y-5" noValidate>
      {isEdit && <input type="hidden" name="id" value={initial!.id} />}

      {state && !state.ok && state.message && (
        <div
          className="flex items-center gap-2 rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger"
          role="alert"
        >
          <AlertCircle className="h-4 w-4 shrink-0" aria-hidden />
          {state.message}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Dados principais</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <Field label="Nome / Razão social" htmlFor="legalName" error={errors?.legalName} required className="md:col-span-2">
            <Input
              id="legalName"
              name="legalName"
              defaultValue={initial?.legalName}
              placeholder="Ex.: Dark Code Tecnologia LTDA"
              maxLength={160}
              required
            />
          </Field>
          <Field label="Nome fantasia" htmlFor="tradeName" error={errors?.tradeName}>
            <Input
              id="tradeName"
              name="tradeName"
              defaultValue={initial?.tradeName}
              placeholder="Ex.: Dark Code"
              maxLength={160}
            />
          </Field>
          <Field label="CPF / CNPJ" htmlFor="document" error={errors?.document}>
            <Input
              id="document"
              name="document"
              defaultValue={initial?.document}
              placeholder="00.000.000/0000-00"
              maxLength={24}
            />
          </Field>
          <Field label="Segmento" htmlFor="segment" error={errors?.segment}>
            <Input
              id="segment"
              name="segment"
              defaultValue={initial?.segment}
              placeholder="Ex.: E-commerce"
              maxLength={80}
            />
          </Field>
          <Field label="Produto / Serviço contratado" htmlFor="product" error={errors?.product}>
            <Input
              id="product"
              name="product"
              defaultValue={initial?.product}
              placeholder="Ex.: Gestão de tráfego + automações"
              maxLength={160}
            />
          </Field>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Contato</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <Field label="Nome do contato" htmlFor="contactName" error={errors?.contactName}>
            <Input
              id="contactName"
              name="contactName"
              defaultValue={initial?.contactName}
              placeholder="Pessoa de referência no cliente"
              maxLength={120}
            />
          </Field>
          <Field label="E-mail" htmlFor="email" error={errors?.email}>
            <Input
              id="email"
              name="email"
              type="email"
              defaultValue={initial?.email}
              placeholder="contato@cliente.com"
              maxLength={160}
            />
          </Field>
          <Field label="Telefone" htmlFor="phone" error={errors?.phone}>
            <Input
              id="phone"
              name="phone"
              type="tel"
              defaultValue={initial?.phone}
              placeholder="(11) 3000-0000"
              maxLength={30}
            />
          </Field>
          <Field label="WhatsApp" htmlFor="whatsapp" error={errors?.whatsapp}>
            <Input
              id="whatsapp"
              name="whatsapp"
              type="tel"
              defaultValue={initial?.whatsapp}
              placeholder="(11) 90000-0000"
              maxLength={30}
            />
          </Field>
          <Field label="Site" htmlFor="website" error={errors?.website} className="md:col-span-2">
            <Input
              id="website"
              name="website"
              defaultValue={initial?.website}
              placeholder="https://cliente.com"
              maxLength={300}
            />
          </Field>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Comercial</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <Field label="Valor do contrato (R$)" htmlFor="contract" error={errors?.contract}>
            <Input
              id="contract"
              name="contract"
              inputMode="decimal"
              defaultValue={initial?.contract}
              placeholder="1.234,56"
            />
          </Field>
          <Field label="Data de entrada" htmlFor="startDate" error={errors?.startDate}>
            <Input
              id="startDate"
              name="startDate"
              type="date"
              defaultValue={initial?.startDate}
            />
          </Field>
          <Field label="Responsável interno" htmlFor="ownerId" error={errors?.ownerId}>
            <Select id="ownerId" name="ownerId" defaultValue={initial?.ownerId ?? ""}>
              <option value="">Sem responsável</option>
              {owners.map((owner) => (
                <option key={owner.id} value={owner.id}>
                  {owner.fullName}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Status" htmlFor="status" error={errors?.status} required>
            <Select id="status" name="status" defaultValue={initial?.status ?? "LEAD"} required>
              {Object.entries(CLIENT_STATUS).map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </Select>
          </Field>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Outros</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4">
          <Field label="Observações" htmlFor="notes" error={errors?.notes}>
            <Textarea
              id="notes"
              name="notes"
              defaultValue={initial?.notes}
              placeholder="Anotações internas sobre o cliente…"
              rows={4}
              maxLength={4000}
            />
          </Field>
          <Field label="Links (uma URL por linha)" htmlFor="links" error={errors?.links}>
            <Textarea
              id="links"
              name="links"
              defaultValue={initial?.links}
              placeholder={"https://drive.google.com/…\nhttps://instagram.com/cliente"}
              rows={3}
              maxLength={4000}
            />
          </Field>
        </CardContent>
      </Card>

      <div className="flex flex-wrap items-center justify-end gap-2">
        <Link
          href={isEdit ? `/clientes/${initial!.id}` : "/clientes"}
          className={buttonVariants({ variant: "secondary" })}
        >
          Cancelar
        </Link>
        <Button type="submit" loading={pending}>
          {isEdit ? "Salvar alterações" : "Criar cliente"}
        </Button>
      </div>
    </form>
  );
}
