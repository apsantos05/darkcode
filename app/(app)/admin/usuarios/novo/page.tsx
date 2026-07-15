import { requireRole } from "@/lib/auth/current-user";
import { PageHeader } from "@/components/layout/page-header";
import { createUserAction } from "../actions";
import { EMPTY_USER_DEFAULTS, UserForm } from "../user-form";
export const metadata = { title: "Novo usuário" };
export default async function NewUserPage() { await requireRole("ADMIN"); return <div className="mx-auto max-w-3xl animate-fade-in"><PageHeader title="Novo usuário" description="Crie o acesso e defina o cargo e as permissões." /><UserForm action={createUserAction} defaults={EMPTY_USER_DEFAULTS} /></div>; }
