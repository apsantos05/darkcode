"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export function Pagination({
  page,
  totalPages,
  totalItems,
}: {
  page: number;
  totalPages: number;
  totalItems: number;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  if (totalPages <= 1) return null;

  const goTo = (p: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("pagina", String(p));
    router.push(`${pathname}?${params.toString()}`);
  };

  return (
    <div className="flex items-center justify-between gap-4 pt-2">
      <p className="text-xs text-muted">
        Página {page} de {totalPages} · {totalItems} {totalItems === 1 ? "registro" : "registros"}
      </p>
      <div className="flex gap-2">
        <Button
          variant="secondary"
          size="iconSm"
          disabled={page <= 1}
          onClick={() => goTo(page - 1)}
          aria-label="Página anterior"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <Button
          variant="secondary"
          size="iconSm"
          disabled={page >= totalPages}
          onClick={() => goTo(page + 1)}
          aria-label="Próxima página"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
