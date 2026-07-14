"use client";

import { useActionState } from "react";
import Link from "next/link";
import { AlertCircle, CheckCircle2 } from "lucide-react";
import { resetPasswordAction, type ActionResult } from "@/app/(auth)/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, Input } from "@/components/ui/input";

export function ResetPasswordForm({ token }: { token: string }) {
  const [state, formAction, pending] = useActionState<ActionResult | null, FormData>(
    resetPasswordAction,
    null,
  );

  if (state?.ok) {
    return (
      <Card className="shadow-glow">
        <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
          <CheckCircle2 className="h-10 w-10 text-success" aria-hidden />
          <p className="font-medium">{state.message}</p>
          <Link href="/login" className="text-sm text-neon hover:underline">
            Ir para o login
          </Link>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-glow">
      <CardHeader>
        <CardTitle className="text-xl">Redefinir senha</CardTitle>
        <CardDescription>Escolha uma nova senha para sua conta</CardDescription>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="space-y-4" noValidate>
          <input type="hidden" name="token" value={token} />
          {state?.message && !state.ok && (
            <div className="flex items-center gap-2 rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger" role="alert">
              <AlertCircle className="h-4 w-4 shrink-0" aria-hidden />
              {state.message}
            </div>
          )}
          <Field label="Nova senha" htmlFor="password" error={state?.fieldErrors?.password} required>
            <Input id="password" name="password" type="password" autoComplete="new-password" placeholder="Mínimo 8 caracteres, letras e números" required />
          </Field>
          <Field label="Confirmar nova senha" htmlFor="confirmPassword" error={state?.fieldErrors?.confirmPassword} required>
            <Input id="confirmPassword" name="confirmPassword" type="password" autoComplete="new-password" placeholder="Repita a senha" required />
          </Field>
          <Button type="submit" className="w-full" loading={pending}>
            Redefinir senha
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
