"use client";

import { useActionState } from "react";
import Link from "next/link";
import { AlertCircle } from "lucide-react";
import { loginAction, type ActionResult } from "@/app/(auth)/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, Input } from "@/components/ui/input";

export function LoginForm() {
  const [state, formAction, pending] = useActionState<ActionResult | null, FormData>(
    loginAction,
    null,
  );

  return (
    <Card className="shadow-glow">
      <CardHeader>
        <CardTitle className="text-xl">Entrar</CardTitle>
        <CardDescription>Acesse a central de comando da Dark Code</CardDescription>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="space-y-4" noValidate>
          {state?.message && !state.ok && (
            <div className="flex items-center gap-2 rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger" role="alert">
              <AlertCircle className="h-4 w-4 shrink-0" aria-hidden />
              {state.message}
            </div>
          )}
          <Field label="E-mail ou nome de usuário" htmlFor="identifier" error={state?.fieldErrors?.identifier} required>
            <Input
              id="identifier"
              name="identifier"
              autoComplete="username"
              placeholder="voce@darkcode.com"
              required
            />
          </Field>
          <Field label="Senha" htmlFor="password" error={state?.fieldErrors?.password} required>
            <Input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              placeholder="••••••••"
              required
            />
          </Field>
          <div className="flex justify-end">
            <Link href="/recuperar-senha" className="text-xs text-neon hover:underline">
              Esqueci minha senha
            </Link>
          </div>
          <Button type="submit" className="w-full" loading={pending}>
            Entrar
          </Button>
        </form>
        <p className="mt-5 text-center text-sm text-muted">
          Ainda não tem conta?{" "}
          <Link href="/cadastro" className="text-neon hover:underline">
            Cadastre-se
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
