"use client";

import * as React from "react";
import { ArrowDownRight, ArrowUpRight, Banknote, Minus } from "lucide-react";
import { formatBRL, formatPercent } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import type { RevenuePeriodData, RevenuePeriodKey } from "./queries";

const PERIOD_ORDER: RevenuePeriodKey[] = ["today", "7d", "15d", "30d", "90d"];

export function RevenueOverviewCard({
  periods,
  defaultPeriod = "30d",
}: {
  periods: RevenuePeriodData[];
  defaultPeriod?: RevenuePeriodKey;
}) {
  const [selectedPeriod, setSelectedPeriod] = React.useState<RevenuePeriodKey>(defaultPeriod);
  const periodByKey = React.useMemo(
    () => new Map(periods.map((period) => [period.key, period])),
    [periods],
  );
  const activePeriod = periodByKey.get(selectedPeriod) ?? periods[0];

  if (!activePeriod) return null;

  return (
    <Card className="relative overflow-hidden border-primary/30 bg-[linear-gradient(135deg,rgb(21_24_33)_0%,rgb(15_17_23)_58%,rgb(76_29_149_/_0.22)_100%)] shadow-glow-sm">
      <div
        className="pointer-events-none absolute -right-20 -top-24 h-56 w-56 rounded-full bg-primary/20 blur-3xl"
        aria-hidden
      />
      <CardContent className="relative p-5 sm:p-6">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
          <div className="min-w-0">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-primary/30 bg-primary/15 text-neon shadow-glow-sm">
                <Banknote className="h-5 w-5" aria-hidden />
              </span>
              <div className="min-w-0">
                <h2 className="font-semibold tracking-tight">Faturamento</h2>
                <p className="text-xs text-muted">Receita líquida confirmada</p>
              </div>
            </div>

            <div className="mt-5" aria-live="polite" aria-atomic="true">
              <p className="font-mono text-3xl font-bold tracking-tight tabular-nums sm:text-4xl">
                {formatBRL(activePeriod.currentCents)}
              </p>
              <RevenueComparison period={activePeriod} />
            </div>
          </div>

          <div
            className="flex w-full flex-wrap gap-1 rounded-xl border border-border/80 bg-background/55 p-1 backdrop-blur-sm xl:w-auto xl:flex-nowrap"
            role="group"
            aria-label="Período do faturamento"
          >
            {PERIOD_ORDER.map((key) => {
              const period = periodByKey.get(key);
              if (!period) return null;
              const selected = key === selectedPeriod;

              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setSelectedPeriod(key)}
                  aria-pressed={selected}
                  className={cn(
                    "min-h-10 flex-1 cursor-pointer whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-medium transition-[background-color,color,box-shadow] hover:text-foreground focus-visible:outline-2 focus-visible:outline-neon sm:min-h-9 sm:flex-none",
                    selected
                      ? "bg-primary text-foreground shadow-glow-sm"
                      : "text-muted hover:bg-card-hover",
                  )}
                >
                  {period.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="mt-5 border-t border-border/70 pt-3">
          <p className="text-xs text-muted">
            Período selecionado:{" "}
            <span className="font-medium text-foreground">{activePeriod.label}</span>
          </p>
          {/* Espaço estrutural para uma futura sparkline por período. */}
          <div data-slot="revenue-sparkline" />
        </div>
      </CardContent>
    </Card>
  );
}

function RevenueComparison({ period }: { period: RevenuePeriodData }) {
  if (period.change === null) {
    return (
      <p className="mt-2 inline-flex items-center gap-1.5 text-xs text-muted">
        <Minus className="h-3.5 w-3.5" aria-hidden />
        Sem base no período anterior
      </p>
    );
  }

  const positive = period.change >= 0;
  const Icon = positive ? ArrowUpRight : ArrowDownRight;

  return (
    <p className="mt-2 flex flex-wrap items-center gap-1.5 text-xs text-muted">
      <span
        className={cn(
          "inline-flex items-center gap-1 font-medium tabular-nums",
          positive ? "text-success" : "text-danger",
        )}
      >
        <Icon className="h-3.5 w-3.5" aria-hidden />
        {formatPercent(period.change)}
      </span>
      <span>vs. período anterior</span>
    </p>
  );
}
