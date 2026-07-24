"use client";

import { useActionState, useMemo, useState } from "react";
import Link from "next/link";
import { CheckCircle2, Copy, ExternalLink, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, Input, Select } from "@/components/ui/input";
import {
  createPaymentChargeAction,
  type ChargeActionResult,
} from "./actions";

export type ChargeClientOption = {
  id: string;
  name: string;
  contactName: string;
  email: string;
  phone: string;
  document: string;
};

export type ChargeProjectOption = { id: string; name: string; clientId: string };

export function ChargeForm({
  clients,
  projects,
}: {
  clients: ChargeClientOption[];
  projects: ChargeProjectOption[];
}) {
  const [state, action, pending] = useActionState<ChargeActionResult | null, FormData>(
    createPaymentChargeAction,
    null,
  );
  const [clientId, setClientId] = useState("");
  const selectedClient = clients.find((client) => client.id === clientId);
  const availableProjects = useMemo(
    () => projects.filter((project) => project.clientId === clientId),
    [clientId, projects],
  );
  const errors = state?.fieldErrors;

  async function copyPix() {
    if (!state?.charge?.pixCopyPaste) return;
    await navigator.clipboard.writeText(state.charge.pixCopyPaste);
    toast.success("Código PIX copiado.");
  }

  if (state?.ok && state.charge) {
    return (
      <Card className="overflow-hidden border-success/30 bg-[linear-gradient(135deg,rgb(20_25_24),rgb(15_17_23))]">
        <CardHeader>
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-success/15 text-success">
              <CheckCircle2 className="h-6 w-6" aria-hidden />
            </span>
            <div>
              <CardTitle>Cobrança criada</CardTitle>
              <p className="mt-1 text-sm text-muted">Aguardando o pagamento ser confirmado pela BlackCat.</p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg border border-border bg-background/50 p-4">
            <p className="text-xs text-muted">Transação</p>
            <p className="mt-1 font-mono text-sm">{state.charge.transactionId}</p>
          </div>
          {state.charge.pixCopyPaste && (
            <div className="space-y-2">
              <p className="text-sm font-medium">PIX copia e cola</p>
              <p className="max-h-28 overflow-auto break-all rounded-lg border border-border bg-background/50 p-3 font-mono text-xs">
                {state.charge.pixCopyPaste}
              </p>
              <Button type="button" variant="secondary" onClick={copyPix}>
                <Copy className="h-4 w-4" aria-hidden /> Copiar PIX
              </Button>
            </div>
          )}
          <div className="flex flex-wrap gap-2">
            {state.charge.invoiceUrl && (
              <a
                href={state.charge.invoiceUrl}
                target="_blank"
                rel="noreferrer"
                className={buttonVariants({ variant: "primary" })}
              >
                Abrir cobrança <ExternalLink className="h-4 w-4" aria-hidden />
              </a>
            )}
            <Link href="/financeiro" className={buttonVariants({ variant: "secondary" })}>
              Voltar ao financeiro
            </Link>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <form action={action} className="space-y-5" noValidate>
      {state?.message && !state.ok && (
        <p className="rounded-lg border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger" role="alert">
          {state.message}
        </p>
      )}

      <Card>
        <CardHeader><CardTitle>Dados da cobrança</CardTitle></CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <Field label="Cliente" htmlFor="clientId" required error={errors?.clientId}>
            <Select
              id="clientId"
              name="clientId"
              value={clientId}
              onChange={(event) => setClientId(event.target.value)}
              required
            >
              <option value="">Selecione o cliente</option>
              {clients.map((client) => <option key={client.id} value={client.id}>{client.name}</option>)}
            </Select>
          </Field>
          <Field label="Projeto" htmlFor="projectId" error={errors?.projectId}>
            <Select id="projectId" name="projectId" disabled={!clientId}>
              <option value="">Sem projeto vinculado</option>
              {availableProjects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}
            </Select>
          </Field>
          <Field label="Descrição" htmlFor="description" required error={errors?.description} className="sm:col-span-2">
            <Input id="description" name="description" maxLength={160} placeholder="Ex.: Mensalidade de gestão — julho" required />
          </Field>
          <Field label="Valor (R$)" htmlFor="amount" required error={errors?.amount}>
            <Input id="amount" name="amount" inputMode="decimal" placeholder="1.500,00" required />
          </Field>
          <Field label="Validade do PIX" htmlFor="expiresInDays" required error={errors?.expiresInDays}>
            <Select id="expiresInDays" name="expiresInDays" defaultValue="2">
              <option value="1">1 dia</option><option value="2">2 dias</option><option value="3">3 dias</option>
              <option value="7">7 dias</option><option value="15">15 dias</option><option value="30">30 dias</option>
            </Select>
          </Field>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Pagador</CardTitle></CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <Field label="Nome completo" htmlFor="customerName" required error={errors?.customerName}>
            <Input key={`name-${clientId}`} id="customerName" name="customerName" defaultValue={selectedClient?.contactName || selectedClient?.name} required />
          </Field>
          <Field label="CPF ou CNPJ" htmlFor="customerDocument" required error={errors?.customerDocument}>
            <Input key={`doc-${clientId}`} id="customerDocument" name="customerDocument" defaultValue={selectedClient?.document} required />
          </Field>
          <Field label="E-mail" htmlFor="customerEmail" required error={errors?.customerEmail}>
            <Input key={`email-${clientId}`} id="customerEmail" name="customerEmail" type="email" defaultValue={selectedClient?.email} required />
          </Field>
          <Field label="Telefone" htmlFor="customerPhone" required error={errors?.customerPhone}>
            <Input key={`phone-${clientId}`} id="customerPhone" name="customerPhone" type="tel" defaultValue={selectedClient?.phone} required />
          </Field>
        </CardContent>
      </Card>

      <div className="flex items-start gap-2 rounded-lg border border-border bg-card px-4 py-3 text-xs text-muted">
        <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-neon" aria-hidden />
        A chave da BlackCat permanece somente no servidor. Esta etapa gera PIX e não coleta dados de cartão.
      </div>

      <div className="flex justify-end gap-2">
        <Link href="/financeiro" className={buttonVariants({ variant: "secondary" })}>Cancelar</Link>
        <Button type="submit" loading={pending}>Gerar cobrança PIX</Button>
      </div>
    </form>
  );
}
