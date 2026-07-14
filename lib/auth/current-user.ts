import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { readSession } from "@/lib/auth/session";
import type { UserRole } from "@/lib/constants";

export type CurrentUser = {
  id: string;
  fullName: string;
  username: string;
  email: string;
  avatarUrl: string | null;
  position: string | null;
  area: string | null;
  role: UserRole;
  status: string;
};

/**
 * Carrega o usuário autenticado a partir da sessão, validando no banco
 * (papel e status são sempre lidos do banco — nunca confiar só no token).
 */
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const session = await readSession();
  if (!session) return null;
  const user = await db.user.findUnique({
    where: { id: session.sub },
    select: {
      id: true,
      fullName: true,
      username: true,
      email: true,
      avatarUrl: true,
      position: true,
      area: true,
      role: true,
      status: true,
      deletedAt: true,
    },
  });
  if (!user || user.deletedAt || user.status !== "ACTIVE") return null;
  return {
    id: user.id,
    fullName: user.fullName,
    username: user.username,
    email: user.email,
    avatarUrl: user.avatarUrl,
    position: user.position,
    area: user.area,
    status: user.status,
    role: user.role as UserRole,
  };
});

/** Exige usuário autenticado e ativo; redireciona ao login caso contrário. */
export async function requireUser(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

/** Exige um dos papéis informados; redireciona ao dashboard caso não autorizado. */
export async function requireRole(...roles: UserRole[]): Promise<CurrentUser> {
  const user = await requireUser();
  if (!roles.includes(user.role)) redirect("/dashboard");
  return user;
}
