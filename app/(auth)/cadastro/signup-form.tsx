"use client";

import { useActionState } from "react";
import Link from "next/link";
import { AlertCircle, CheckCircle2 } from "lucide-react";
import { signupAction, type ActionResult } from "@/app/(auth)/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox, Field, Input, Label } from "@/components/ui/input";

export function SignupForm() {
  const [state, formAction, pending] = useActionState<ActionResult | null, FormData>(
    signupAction,
    null,
  );

  if (state?.ok) {
    return (
      <Card className="shadow-glow">
        <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
          <CheckCircle2 className="h-10 w-10 text-success" aria-hidden />
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
        <CardTitle className="text-xl">Criar conta</CardTitle>
        <CardDescription>
          Novas contas passam pela aprovação de um administrador
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
          <Field label="Nome completo" htmlFor="fullName" error={state?.fieldErrors?.fullName} required>
            <Input id="fullName" name="fullName" autoComplete="name" placeholder="Seu nome" required />
          </Field>
          <Field label="Nome de usuário" htmlFor="username" error={state?.fieldErrors?.username} required>
            <Input id="username" name="username" autoComplete="username" placeholder="seu.usuario" required />
          </Field>
          <Field label="E-mail" htmlFor="email" error={state?.fieldErrors?.email} required>
            <Input id="email" name="email" type="email" autoComplete="email" placeholder="voce@darkcode.com" required />
          </Field>
          <Field label="Senha" htmlFor="password" error={state?.fieldErrors?.password} required>
            <Input id="password" name="password" type="password" autoComplete="new-password" placeholder="Mínimo 8 caracteres, letras e números" required />
          </Field>
          <Field label="Confirmar senha" htmlFor="confirmPassword" error={state?.fieldErrors?.confirmPassword} required>
            <Input id="confirmPassword" name="confirmPassword" type="password" autoComplete="new-password" placeholder="Repita a senha" required />
          </Field>
          <div className="space-y-1.5">
            <div className="flex items-start gap-2">
              <Checkbox id="acceptTerms" name="acceptTerms" className="mt-0.5" />
              <Label htmlFor="acceptTerms" className="text-xs text-muted font-normal cursor-pointer">
                Li e aceito os termos internos de uso e confidencialidade da equipe Dark Code
              </Label>
            </div>
            {state?.fieldErrors?.acceptTerms && (
              <p className="text-xs text-danger" role="alert">
                {state.fieldErrors.acceptTerms[0]}
              </p>
            )}
          </div>
          <Button type="submit" className="w-full" loading={pending}>
            Criar conta
          </Button>
        </form>
        <p className="mt-5 text-center text-sm text-muted">
          Já tem conta?{" "}
          <Link href="/login" className="text-neon hover:underline">
            Entrar
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
