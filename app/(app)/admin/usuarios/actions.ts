"use server";

import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth/current-user";
import { assertPermission } from "@/lib/rbac";
import { logActivity, notify } from "@/lib/activity";
import { createAdminUserSchema, updateAdminUserSchema } from "@/lib/validators/admin-user";

export type UserActionResult = { ok: boolean; message?: string; fieldErrors?: Record<string, string[]> };

function value(formData: FormData, key: string) {
  const item = formData.get(key);
  return typeof item === "string" ? item : "";
}

function errors(error: { flatten: () => { fieldErrors: Record<string, string[] | undefined> } }) {
  return Object.fromEntries(Object.entries(error.flatten().fieldErrors).filter(([, messages]) => messages)) as Record<string, string[]>;
}

function formValues(formData: FormData) {
  return {
    fullName: value(formData, "fullName"), username: value(formData, "username"),
    email: value(formData, "email"), password: value(formData, "password"),
    position: value(formData, "position"), area: value(formData, "area"),
    role: value(formData, "role"), status: value(formData, "status"),
  };
}

async function duplicate(username: string, email: string, exceptId?: string) {
  return db.user.findFirst({ where: { id: exceptId ? { not: exceptId } : undefined, OR: [{ username }, { email }] }, select: { username: true, email: true } });
}

export async function createUserAction(_prev: UserActionResult | null, formData: FormData): Promise<UserActionResult> {
  const actor = await requireUser();
  assertPermission(actor.role, "users.manage");
  const parsed = createAdminUserSchema.safeParse(formValues(formData));
  if (!parsed.success) return { ok: false, fieldErrors: errors(parsed.error) };
  const data = { ...parsed.data, username: parsed.data.username.toLowerCase(), email: parsed.data.email.toLowerCase() };
  const existing = await duplicate(data.username, data.email);
  if (existing) return { ok: false, message: existing.username === data.username ? "Este nome de usuário já está em uso." : "Este e-mail já está em uso." };
  const passwordHash = await bcrypt.hash(data.password, 12);
  const user = await db.user.create({ data: { fullName: data.fullName, username: data.username, email: data.email, passwordHash, position: data.position, area: data.area, role: data.role, status: data.status, approvedById: actor.id } });
  await logActivity({ actorId: actor.id, entityType: "USER", entityId: user.id, action: "CREATED", message: `Usuário "${user.fullName}" criado` });
  if (user.status === "ACTIVE") await notify({ userId: user.id, type: "USER_APPROVED", title: "Sua conta está ativa", body: "Seu acesso ao Dark Code CRM foi liberado.", link: "/dashboard" });
  revalidatePath("/admin/usuarios");
  redirect("/admin/usuarios");
}

export async function updateUserAction(userId: string, _prev: UserActionResult | null, formData: FormData): Promise<UserActionResult> {
  const actor = await requireUser();
  assertPermission(actor.role, "users.manage");
  const current = await db.user.findFirst({ where: { id: userId, deletedAt: null } });
  if (!current) return { ok: false, message: "Usuário não encontrado." };
  const parsed = updateAdminUserSchema.safeParse(formValues(formData));
  if (!parsed.success) return { ok: false, fieldErrors: errors(parsed.error) };
  const data = { ...parsed.data, username: parsed.data.username.toLowerCase(), email: parsed.data.email.toLowerCase() };
  if (actor.id === userId && (data.role !== "ADMIN" || data.status !== "ACTIVE")) return { ok: false, message: "Você não pode retirar seu próprio acesso de administrador." };
  if (current.role === "ADMIN" && current.status === "ACTIVE" && (data.role !== "ADMIN" || data.status !== "ACTIVE")) {
    const admins = await db.user.count({ where: { role: "ADMIN", status: "ACTIVE", deletedAt: null } });
    if (admins <= 1) return { ok: false, message: "É necessário manter pelo menos um administrador ativo." };
  }
  const existing = await duplicate(data.username, data.email, userId);
  if (existing) return { ok: false, message: existing.username === data.username ? "Este nome de usuário já está em uso." : "Este e-mail já está em uso." };
  const passwordHash = data.password ? await bcrypt.hash(data.password, 12) : undefined;
  await db.user.update({ where: { id: userId }, data: { fullName: data.fullName, username: data.username, email: data.email, position: data.position, area: data.area, role: data.role, status: data.status, passwordHash } });
  await logActivity({ actorId: actor.id, entityType: "USER", entityId: userId, action: "UPDATED", message: `Usuário "${data.fullName}" atualizado`, oldValue: { role: current.role, status: current.status, position: current.position }, newValue: { role: data.role, status: data.status, position: data.position } });
  revalidatePath("/admin/usuarios"); revalidatePath(`/admin/usuarios/${userId}/editar`);
  redirect("/admin/usuarios");
}

export async function archiveUserAction(userId: string): Promise<UserActionResult> {
  const actor = await requireUser(); assertPermission(actor.role, "users.manage");
  if (actor.id === userId) return { ok: false, message: "Você não pode remover sua própria conta." };
  const user = await db.user.findFirst({ where: { id: userId, deletedAt: null } });
  if (!user) return { ok: false, message: "Usuário não encontrado." };
  if (user.role === "ADMIN" && user.status === "ACTIVE") {
    const admins = await db.user.count({ where: { role: "ADMIN", status: "ACTIVE", deletedAt: null } });
    if (admins <= 1) return { ok: false, message: "É necessário manter pelo menos um administrador ativo." };
  }
  await db.user.update({ where: { id: userId }, data: { deletedAt: new Date(), status: "BLOCKED" } });
  await logActivity({ actorId: actor.id, entityType: "USER", entityId: userId, action: "ARCHIVED", message: `Usuário "${user.fullName}" removido` });
  revalidatePath("/admin/usuarios"); return { ok: true, message: "Usuário removido." };
}
