"use client";

import { useRouter } from "next/navigation";
import { Search } from "lucide-react";

export function GlobalSearch() {
  const router = useRouter();

  return (
    <form
      role="search"
      onSubmit={(e) => {
        e.preventDefault();
        const q = new FormData(e.currentTarget).get("q");
        if (typeof q === "string" && q.trim()) {
          router.push(`/pesquisa?q=${encodeURIComponent(q.trim())}`);
        }
      }}
      className="relative"
    >
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" aria-hidden />
      <input
        type="search"
        name="q"
        placeholder="Pesquisar tarefas, projetos, clientes…"
        aria-label="Pesquisa global"
        className="h-10 w-full rounded-lg border border-border bg-surface pl-9 pr-3 text-sm text-foreground placeholder:text-muted/60 focus:border-primary focus-visible:outline-none"
      />
    </form>
  );
}
