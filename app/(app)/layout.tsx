import { requireUser } from "@/lib/auth/current-user";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();

  return (
    <div className="flex min-h-dvh">
      <Sidebar role={user.role} />
      <div className="flex min-w-0 flex-1 flex-col">
        <Header user={user} />
        <main id="conteudo-principal" className="min-w-0 flex-1 overflow-x-hidden px-3 py-5 sm:px-4 sm:py-6 lg:px-6">{children}</main>
      </div>
    </div>
  );
}
