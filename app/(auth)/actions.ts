"use server";

import { createHash, randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { createSession, destroySession } from "@/lib/auth/session";
import { rateLimit } from "@/lib/rate-limit";
import { logActivity } from "@/lib/activity";
import {
  forgotPasswordSchema,
  loginSchema,
  resetPasswordSchema,
  signupSchema,
} from "@/lib/validators/auth";

export type ActionResult = {
  ok: boolean;
  message?: string;
  fieldErrors?: Record<string, string[]>;
};

function fieldErrorsFrom(error: { flatten: () => { fieldErrors: Record<string, string[] | undefined> } }): Record<string, string[]> {
  const flat = error.flatten().fieldErrors;
  return Object.fromEntries(
    Object.entries(flat).filter(([, v]) => v !== undefined),
  ) as Record<string, string[]>;
}

export async function loginAction(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  const parsed = loginSchema.safeParse({
    identifier: formData.get("identifier"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { ok: false, fieldErrors: fieldErrorsFrom(parsed.error) };
  }
  const { identifier, password } = parsed.data;

  if (!rateLimit(`login:${identifier.toLowerCase()}`, 10, 60_000)) {
    return { ok: false, message: "Muitas tentativas. Aguarde um minuto e tente novamente." };
  }

  const user = await db.user.findFirst({
    where: {
      OR: [{ email: identifier.toLowerCase() }, { username: identifier.toLowerCase() }],
      deletedAt: null,
    },
  });

  // Mensagem genérica: não revelar se a conta existe.
  const invalid = { ok: false as const, message: "Credenciais inválidas. Verifique e tente novamente." };
  if (!user) return invalid;

  const passwordOk = await bcrypt.compare(password, user.passwordHash);
  if (!passwordOk) return invalid;

  if (user.status === "PENDING") {
    return { ok: false, message: "Sua conta aguarda aprovação de um administrador." };
  }
  if (user.status === "BLOCKED") {
    return { ok: false, message: "Sua conta está desativada. Fale com um administrador." };
  }

  await db.user.update({ where: { id: user.id }, data: { lastAccessAt: new Date() } });
  await createSession(user.id, user.role);
  redirect("/dashboard");
}

export async function signupAction(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  const parsed = signupSchema.safeParse({
    fullName: formData.get("fullName"),
    username: formData.get("username"),
    email: formData.get("email"),
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
    acceptTerms: formData.get("acceptTerms") === "on",
  });
  if (!parsed.success) {
    return { ok: false, fieldErrors: fieldErrorsFrom(parsed.error) };
  }
  const data = parsed.data;
  const email = data.email.toLowerCase();
  const username = data.username.toLowerCase();

  if (!rateLimit(`signup:${email}`, 5, 60_000)) {
    return { ok: false, message: "Muitas tentativas. Aguarde um minuto e tente novamente." };
  }

  const existing = await db.user.findFirst({
    where: { OR: [{ email }, { username }] },
    select: { email: true, username: true },
  });
  if (existing) {
    const fieldErrors: Record<string, string[]> = {};
    if (existing.email === email) fieldErrors.email = ["Este e-mail já está em uso"];
    if (existing.username === username) fieldErrors.username = ["Este nome de usuário já está em uso"];
    return { ok: false, fieldErrors };
  }

  const passwordHash = await bcrypt.hash(data.password, 12);

  // O primeiro usuário do sistema torna-se administrador ativo (bootstrap).
  const isFirstUser = (await db.user.count()) === 0;

  const user = await db.user.create({
    data: {
      fullName: data.fullName.trim(),
      username,
      email,
      passwordHash,
      role: isFirstUser ? "ADMIN" : "COLLABORATOR",
      status: isFirstUser ? "ACTIVE" : "PENDING",
    },
  });

  await logActivity({
    actorId: user.id,
    entityType: "USER",
    entityId: user.id,
    action: "CREATED",
    message: isFirstUser
      ? "Conta criada (primeiro usuário — administrador)"
      : "Conta criada, aguardando aprovação",
  });

  if (isFirstUser) {
    await db.user.update({ where: { id: user.id }, data: { lastAccessAt: new Date() } });
    await createSession(user.id, user.role);
    redirect("/dashboard");
  }

  return {
    ok: true,
    message: "Cadastro realizado! Sua conta será liberada após aprovação de um administrador.",
  };
}

export async function logoutAction(): Promise<void> {
  await destroySession();
  redirect("/login");
}

export async function forgotPasswordAction(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  const parsed = forgotPasswordSchema.safeParse({ email: formData.get("email") });
  if (!parsed.success) {
    return { ok: false, fieldErrors: fieldErrorsFrom(parsed.error) };
  }
  const email = parsed.data.email.toLowerCase();

  if (!rateLimit(`forgot:${email}`, 3, 60_000)) {
    return { ok: false, message: "Muitas tentativas. Aguarde um minuto e tente novamente." };
  }

  // Resposta idêntica exista ou não a conta (não revelar existência de e-mail).
  const genericResponse = {
    ok: true as const,
    message: "Se este e-mail estiver cadastrado, você receberá um link de redefinição.",
  };

  const user = await db.user.findUnique({ where: { email } });
  if (!user || user.deletedAt) return genericResponse;

  const token = randomBytes(32).toString("hex");
  const tokenHash = createHash("sha256").update(token).digest("hex");
  await db.passwordResetToken.create({
    data: {
      tokenHash,
      userId: user.id,
      expiresAt: new Date(Date.now() + 60 * 60 * 1000), // 1 hora
    },
  });

  const resetUrl = `${process.env.APP_URL ?? "http://localhost:3000"}/redefinir-senha?token=${token}`;
  // Sem SMTP configurado, registramos o link no log do servidor (apenas desenvolvimento).
  if (!process.env.SMTP_HOST) {
    console.info(`[dev] Link de redefinição de senha para ${email}: ${resetUrl}`);
  }
  // TODO produção: enviar e-mail via SMTP configurado em .env

  return genericResponse;
}

export async function resetPasswordAction(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  const parsed = resetPasswordSchema.safeParse({
    token: formData.get("token"),
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
  });
  if (!parsed.success) {
    return { ok: false, fieldErrors: fieldErrorsFrom(parsed.error) };
  }

  const tokenHash = createHash("sha256").update(parsed.data.token).digest("hex");
  const record = await db.passwordResetToken.findUnique({
    where: { tokenHash },
    include: { user: true },
  });
  if (!record || record.usedAt || record.expiresAt < new Date()) {
    return { ok: false, message: "Link inválido ou expirado. Solicite uma nova redefinição." };
  }

  const passwordHash = await bcrypt.hash(parsed.data.password, 12);
  await db.$transaction([
    db.user.update({ where: { id: record.userId }, data: { passwordHash } }),
    db.passwordResetToken.update({ where: { id: record.id }, data: { usedAt: new Date() } }),
  ]);

  await logActivity({
    actorId: record.userId,
    entityType: "USER",
    entityId: record.userId,
    action: "PASSWORD_RESET",
    message: "Senha redefinida via link de recuperação",
  });

  return { ok: true, message: "Senha redefinida com sucesso! Você já pode entrar." };
}
