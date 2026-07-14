import { requireUser } from "@/lib/auth/current-user";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { USER_ROLES } from "@/lib/constants";

export default async function SettingsPage() {
  const user = await requireUser();
  return <><PageHeader title="Configurações" description="Perfil e preferências da conta" /><Card className="max-w-2xl"><CardHeader><CardTitle>{user.fullName}</CardTitle></CardHeader><CardContent className="space-y-2 text-sm"><p><span className="text-muted">E-mail:</span> {user.email}</p><p><span className="text-muted">Usuário:</span> @{user.username}</p><p><span className="text-muted">Papel:</span> {USER_ROLES[user.role]}</p><p><span className="text-muted">Área:</span> {user.area ?? "Não informada"}</p><p><span className="text-muted">Cargo:</span> {user.position ?? "Não informado"}</p></CardContent></Card></>;
}
