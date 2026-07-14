"use client";

import * as React from "react";
import Link from "next/link";
import { ChevronDown, LogOut, Settings, User } from "lucide-react";
import type { CurrentUser } from "@/lib/auth/current-user";
import { USER_ROLES, type UserRole } from "@/lib/constants";
import { Avatar } from "@/components/ui/avatar";
import { logoutAction } from "@/app/(auth)/actions";
import { cn } from "@/lib/utils";

export function UserMenu({ user }: { user: CurrentUser }) {
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-card transition-colors"
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <Avatar name={user.fullName} src={user.avatarUrl} size="sm" />
        <span className="hidden sm:block text-sm font-medium max-w-32 truncate">
          {user.fullName.split(" ")[0]}
        </span>
        <ChevronDown className={cn("h-4 w-4 text-muted transition-transform", open && "rotate-180")} aria-hidden />
      </button>
      {open && (
        <div
          role="menu"
          className="absolute right-0 top-full mt-2 w-56 rounded-xl border border-border bg-card p-1.5 shadow-glow animate-fade-in"
        >
          <div className="px-3 py-2 border-b border-border mb-1">
            <p className="text-sm font-medium truncate">{user.fullName}</p>
            <p className="text-xs text-muted truncate">{user.email}</p>
            <p className="mt-1 text-xs text-neon">{USER_ROLES[user.role as UserRole]}</p>
          </div>
          <Link
            href="/perfil"
            role="menuitem"
            onClick={() => setOpen(false)}
            className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-muted hover:bg-card-hover hover:text-foreground"
          >
            <User className="h-4 w-4" aria-hidden /> Meu perfil
          </Link>
          <Link
            href="/configuracoes"
            role="menuitem"
            onClick={() => setOpen(false)}
            className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-muted hover:bg-card-hover hover:text-foreground"
          >
            <Settings className="h-4 w-4" aria-hidden /> Configurações
          </Link>
          <form action={logoutAction}>
            <button
              type="submit"
              role="menuitem"
              className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-muted hover:bg-danger/10 hover:text-danger"
            >
              <LogOut className="h-4 w-4" aria-hidden /> Sair
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
