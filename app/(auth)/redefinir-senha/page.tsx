import type { Metadata } from "next";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { ResetPasswordForm } from "./reset-form";

export const metadata: Metadata = { title: "Redefinir senha" };

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;

  if (!token) {
    return (
      <Card className="shadow-glow">
        <CardContent className="py-10 text-center space-y-3">
          <p className="font-medium">Link inválido</p>
          <p className="text-sm text-muted">
            O link de redefinição está incompleto ou expirou.
          </p>
          <Link href="/recuperar-senha" className="text-sm text-neon hover:underline block">
            Solicitar novo link
          </Link>
        </CardContent>
      </Card>
    );
  }

  return <ResetPasswordForm token={token} />;
}
