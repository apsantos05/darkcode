"use client";

import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { LogOut, Menu, X, ChevronsLeft, ChevronsRight } from "lucide-react";
import { cn } from "@/lib/utils";
import type { UserRole } from "@/lib/constants";
import { navItemsForRole } from "@/components/layout/nav-items";
import { logoutAction } from "@/app/(auth)/actions";
import { Button } from "@/components/ui/button";

function NavLinks({
  role,
  collapsed,
  onNavigate,
}: {
  role: UserRole;
  collapsed: boolean;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const items = navItemsForRole(role);

  return (
    <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4" aria-label="Navegação principal">
      {items.map((item) => {
        const active =
          item.href === "/tarefas"
            ? pathname === "/tarefas" || (pathname.startsWith("/tarefas/") && !pathname.startsWith("/tarefas/minhas"))
            : pathname === item.href || pathname.startsWith(`${item.href}/`);
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            title={collapsed ? item.label : undefined}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
              active
                ? "bg-primary/15 text-neon shadow-glow-sm"
                : "text-muted hover:bg-card hover:text-foreground",
              collapsed && "justify-center px-2",
            )}
            aria-current={active ? "page" : undefined}
          >
            <item.icon className="h-[18px] w-[18px] shrink-0" aria-hidden />
            {!collapsed && <span className="truncate">{item.label}</span>}
          </Link>
        );
      })}
    </nav>
  );
}

export function Sidebar({ role }: { role: UserRole }) {
  const [collapsed, setCollapsed] = React.useState(false);
  const [mobileOpen, setMobileOpen] = React.useState(false);

  return (
    <>
      {/* Botão hambúrguer (mobile) */}
      <button
        className="fixed left-4 top-3.5 z-40 flex h-10 w-10 items-center justify-center rounded-lg border border-border bg-card text-foreground lg:hidden"
        onClick={() => setMobileOpen(true)}
        aria-label="Abrir menu"
      >
        <Menu className="h-5 w-5" />
      </button>

      {/* Drawer mobile */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Menu">
          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
            aria-hidden
          />
          <aside className="absolute inset-y-0 left-0 flex w-[min(18rem,88vw)] flex-col overscroll-contain border-r border-border bg-surface animate-fade-in">
            <div className="flex items-center justify-between px-4 py-4 border-b border-border">
              <Image src="/images/dark-code-logo.svg" alt="Dark Code" width={150} height={33} />
              <Button variant="ghost" size="iconSm" onClick={() => setMobileOpen(false)} aria-label="Fechar menu">
                <X className="h-4 w-4" />
              </Button>
            </div>
            <NavLinks role={role} collapsed={false} onNavigate={() => setMobileOpen(false)} />
            <SidebarFooter collapsed={false} />
          </aside>
        </div>
      )}

      {/* Sidebar desktop */}
      <aside
        className={cn(
          "sticky top-0 hidden h-dvh flex-col border-r border-border bg-surface lg:flex transition-[width] duration-200",
          collapsed ? "w-[68px]" : "w-64",
        )}
      >
        <div className={cn("flex items-center border-b border-border px-4 py-4", collapsed ? "justify-center px-2" : "justify-between")}>
          {collapsed ? (
            <Image src="/images/dark-code-logo.svg" alt="Dark Code" width={36} height={36} className="h-9 w-9 object-cover object-left" />
          ) : (
            <Image src="/images/dark-code-logo.svg" alt="Dark Code" width={160} height={35} priority />
          )}
        </div>
        <NavLinks role={role} collapsed={collapsed} />
        <div className="border-t border-border px-3 py-2">
          <button
            onClick={() => setCollapsed((v) => !v)}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-muted hover:bg-card hover:text-foreground transition-colors"
            aria-label={collapsed ? "Expandir menu" : "Recolher menu"}
          >
            {collapsed ? <ChevronsRight className="h-[18px] w-[18px] mx-auto" /> : (
              <>
                <ChevronsLeft className="h-[18px] w-[18px]" />
                <span>Recolher</span>
              </>
            )}
          </button>
        </div>
        <SidebarFooter collapsed={collapsed} />
      </aside>
    </>
  );
}

function SidebarFooter({ collapsed }: { collapsed: boolean }) {
  return (
    <div className="border-t border-border px-3 py-3">
      <form action={logoutAction}>
        <button
          type="submit"
          className={cn(
            "flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-muted hover:bg-danger/10 hover:text-danger transition-colors",
            collapsed && "justify-center px-2",
          )}
          title={collapsed ? "Sair" : undefined}
        >
          <LogOut className="h-[18px] w-[18px] shrink-0" aria-hidden />
          {!collapsed && <span>Sair</span>}
        </button>
      </form>
    </div>
  );
}
