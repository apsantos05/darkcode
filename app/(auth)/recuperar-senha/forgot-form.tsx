"use client";

import { useActionState } from "react";
import Link from "next/link";
import { AlertCircle, MailCheck } from "lucide-react";
import { forgotPasswordAction, type ActionResult } from "@/app/(auth)/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, Input } from "@/components/ui/input";

export function ForgotPasswordForm() {
  const [state, formAction, pending] = useActionState<ActionResult | null, FormData>(
    forgotPasswordAction,
    null,
  );

  if (state?.ok) {
    return (
      <Card className="shadow-glow">
        <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
          <MailCheck className="h-10 w-10 text-success" aria-hidden />
          <p className="font-medium">{state.message}</p>
          <Link href="/login" className="text-sm text-neon hover:underline">
            Voltar para o login
          </Link>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-glow">
      <CardHeader>
        <CardTitle className="text-xl">Recuperar senha</CardTitle>
        <CardDescription>
          Informe seu e-mail e enviaremos um link para redefinir sua senha
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="space-y-4" noValidate>
          {state?.message && !state.ok && (
            <div className="flex items-center gap-2 rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger" role="alert">
              <AlertCircle className="h-4 w-4 shrink-0" aria-hidden />
              {state.message}
            </div>
          )}
          <Field label="E-mail" htmlFor="email" error={state?.fieldErrors?.email} required>
            <Input id="email" name="email" type="email" autoComplete="email" placeholder="voce@darkcode.com" required />
          </Field>
          <Button type="submit" className="w-full" loading={pending}>
            Enviar link de recuperação
          </Button>
        </form>
        <p className="mt-5 text-center text-sm text-muted">
          Lembrou a senha?{" "}
          <Link href="/login" className="text-neon hover:underline">
            Entrar
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
