"use client";

import Link from "next/link";
import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox, Input, Select } from "@/components/ui/input";
import { CLIENT_STATUS } from "@/lib/constants";

type Owner = { id: string; fullName: string };

export function ClientsFilters({
  owners,
  q,
  status,
  responsavel,
  arquivados,
}: {
  owners: Owner[];
  q: string;
  status: string;
  responsavel: string;
  arquivados: boolean;
}) {
  const hasFilters = Boolean(q || status || responsavel || arquivados);
  const submit = (form: HTMLFormElement | null) => form?.requestSubmit();

  return (
    <form
      method="get"
      action="/clientes"
      className="mb-4 flex flex-wrap items-center gap-2"
      role="search"
      aria-label="Filtrar clientes"
    >
      <label htmlFor="filtro-q" className="sr-only">
        Buscar por nome, contato ou e-mail
      </label>
      <Input
        id="filtro-q"
        name="q"
        defaultValue={q}
        placeholder="Buscar por nome, contato ou e-mail…"
        className="w-full sm:w-72"
      />

      <label htmlFor="filtro-status" className="sr-only">
        Filtrar por status
      </label>
      <Select
        id="filtro-status"
        name="status"
        defaultValue={status}
        className="w-full sm:w-44"
        onChange={(e) => submit(e.currentTarget.form)}
      >
        <option value="">Todos os status</option>
        {Object.entries(CLIENT_STATUS).map(([key, label]) => (
          <option key={key} value={key}>
            {label}
          </option>
        ))}
      </Select>

      <label htmlFor="filtro-responsavel" className="sr-only">
        Filtrar por responsável interno
      </label>
      <Select
        id="filtro-responsavel"
        name="responsavel"
        defaultValue={responsavel}
        className="w-full sm:w-52"
        onChange={(e) => submit(e.currentTarget.form)}
      >
        <option value="">Todos os responsáveis</option>
        {owners.map((owner) => (
          <option key={owner.id} value={owner.id}>
            {owner.fullName}
          </option>
        ))}
      </Select>

      <label className="flex h-10 cursor-pointer items-center gap-2 rounded-lg border border-border bg-surface px-3">
        <Checkbox
          name="arquivados"
          value="1"
          defaultChecked={arquivados}
          onChange={(e) => submit(e.currentTarget.form)}
        />
        <span className="text-sm text-muted">Arquivados</span>
      </label>

      <Button type="submit" variant="secondary">
        <Search className="h-4 w-4" aria-hidden />
        Filtrar
      </Button>

      {hasFilters && (
        <Link href="/clientes" className="text-sm text-muted transition-colors hover:text-foreground">
          Limpar filtros
        </Link>
      )}
    </form>
  );
}
