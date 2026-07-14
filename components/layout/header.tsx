import Link from "next/link";
import { Bell } from "lucide-react";
import { db } from "@/lib/db";
import type { CurrentUser } from "@/lib/auth/current-user";
import { GlobalSearch } from "@/components/layout/global-search";
import { UserMenu } from "@/components/layout/user-menu";

export async function Header({ user }: { user: CurrentUser }) {
  const unreadCount = await db.notification.count({
    where: { userId: user.id, readAt: null },
  });

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-border bg-background/80 backdrop-blur px-4 pl-16 lg:px-6 lg:pl-6">
      <div className="flex-1 max-w-md">
        <GlobalSearch />
      </div>
      <div className="flex items-center gap-2">
        <Link
          href="/notificacoes"
          className="relative flex h-10 w-10 items-center justify-center rounded-lg text-muted hover:bg-card hover:text-foreground transition-colors"
          aria-label={`Notificações${unreadCount > 0 ? ` (${unreadCount} não lidas)` : ""}`}
        >
          <Bell className="h-5 w-5" aria-hidden />
          {unreadCount > 0 && (
            <span className="absolute right-1.5 top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-foreground">
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
        </Link>
        <UserMenu user={user} />
      </div>
    </header>
  );
}
