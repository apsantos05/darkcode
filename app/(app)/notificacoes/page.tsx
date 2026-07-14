import type { Metadata } from "next";
import Link from "next/link";
import {
  AlertTriangle,
  AtSign,
  Bell,
  BellOff,
  CalendarClock,
  ExternalLink,
  ListTodo,
  type LucideIcon,
} from "lucide-react";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth/current-user";
import { NOTIFICATION_TYPES, type NotificationType } from "@/lib/constants";
import { formatDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { Pagination } from "@/components/ui/pagination";
import { MarkAllReadButton, MarkReadButton } from "./notification-actions";

export const metadata: Metadata = { title: "Notificações" };

const PAGE_SIZE = 20;

const TYPE_ICONS: Partial<Record<NotificationType, LucideIcon>> = {
  TASK_ASSIGNED: ListTodo,
  MENTION: AtSign,
  DEADLINE_CHANGED: CalendarClock,
  DEADLINE_REQUEST: CalendarClock,
  DEADLINE_APPROVED: CalendarClock,
  DEADLINE_REJECTED: CalendarClock,
  TASK_OVERDUE: AlertTriangle,
};

function iconForType(type: string): LucideIcon {
  return TYPE_ICONS[type as NotificationType] ?? Bell;
}

export default async function NotificacoesPage({
  searchParams,
}: {
  searchParams: Promise<{ pagina?: string; filtro?: string }>;
}) {
  const user = await requireUser();
  const sp = await searchParams;

  const filtro = sp.filtro === "nao-lidas" ? "nao-lidas" : "todas";
  const page = Math.max(1, Number.parseInt(sp.pagina ?? "1", 10) || 1);

  const where = {
    userId: user.id,
    ...(filtro === "nao-lidas" ? { readAt: null } : {}),
  };

  const [notifications, totalItems, unreadCount] = await Promise.all([
    db.notification.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    db.notification.count({ where }),
    db.notification.count({ where: { userId: user.id, readAt: null } }),
  ]);

  const totalPages = Math.max(1, Math.ceil(totalItems / PAGE_SIZE));

  const tabs = [
    { key: "todas", label: "Todas", href: "/notificacoes" },
    {
      key: "nao-lidas",
      label: `Não lidas${unreadCount > 0 ? ` (${unreadCount})` : ""}`,
      href: "/notificacoes?filtro=nao-lidas",
    },
  ] as const;

  return (
    <div>
      <PageHeader
        title="Notificações"
        description={
          unreadCount > 0
            ? `Você tem ${unreadCount} ${unreadCount === 1 ? "notificação não lida" : "notificações não lidas"}.`
            : "Você está em dia com suas notificações."
        }
        actions={<MarkAllReadButton unreadCount={unreadCount} />}
      />

      <div className="mb-4 flex gap-2">
        {tabs.map((tab) => (
          <Link
            key={tab.key}
            href={tab.href}
            className={cn(
              "rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors",
              filtro === tab.key
                ? "border-primary/50 bg-primary/10 text-neon"
                : "border-border bg-card text-muted hover:bg-card-hover hover:text-foreground",
            )}
          >
            {tab.label}
          </Link>
        ))}
      </div>

      {notifications.length === 0 ? (
        <EmptyState
          icon={filtro === "nao-lidas" ? BellOff : Bell}
          title={
            filtro === "nao-lidas"
              ? "Nenhuma notificação não lida"
              : "Nenhuma notificação por aqui"
          }
          description={
            filtro === "nao-lidas"
              ? "Tudo em dia! Novas notificações aparecerão aqui."
              : "Quando algo acontecer — tarefas atribuídas, menções ou prazos — você verá aqui."
          }
        />
      ) : (
        <>
          <ul className="space-y-2">
            {notifications.map((n) => {
              const Icon = iconForType(n.type);
              const unread = !n.readAt;
              return (
                <li
                  key={n.id}
                  className={cn(
                    "flex items-start gap-3 rounded-xl border p-4 transition-colors",
                    unread
                      ? "border-primary/40 bg-primary/5"
                      : "border-border bg-card",
                  )}
                >
                  <div
                    className={cn(
                      "mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full",
                      unread ? "bg-primary/15 text-neon" : "bg-surface text-muted",
                    )}
                  >
                    <Icon className="h-4.5 w-4.5" aria-hidden />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      {unread && (
                        <span
                          className="h-2 w-2 shrink-0 rounded-full bg-primary"
                          aria-label="Não lida"
                        />
                      )}
                      <p className={cn("text-sm font-medium", !unread && "text-foreground/90")}>
                        {n.title}
                      </p>
                      <span className="text-xs text-muted">
                        {NOTIFICATION_TYPES[n.type as NotificationType] ?? n.type}
                      </span>
                    </div>
                    {n.body && <p className="mt-0.5 text-sm text-muted">{n.body}</p>}
                    <div className="mt-1.5 flex flex-wrap items-center gap-3">
                      <time className="text-xs text-muted" dateTime={n.createdAt.toISOString()}>
                        {formatDateTime(n.createdAt)}
                      </time>
                      {n.link && (
                        <Link
                          href={n.link}
                          className="inline-flex items-center gap-1 text-xs font-medium text-neon hover:underline"
                        >
                          Ver item
                          <ExternalLink className="h-3 w-3" aria-hidden />
                        </Link>
                      )}
                    </div>
                  </div>
                  {unread && (
                    <div className="shrink-0">
                      <MarkReadButton id={n.id} />
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
          <Pagination page={page} totalPages={totalPages} totalItems={totalItems} />
        </>
      )}
    </div>
  );
}
