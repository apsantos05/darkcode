import Image from "next/image";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="auth-glow flex min-h-dvh flex-col items-center justify-center px-4 py-10">
      <div className="w-full max-w-md animate-fade-in">
        <div className="mb-8 flex justify-center">
          <Image
            src="/images/dark-code-logo.svg"
            alt="Dark Code"
            width={220}
            height={48}
            priority
          />
        </div>
        {children}
      </div>
      <p className="mt-8 text-xs text-muted">
        Dark Code CRM · uso interno da equipe
      </p>
    </main>
  );
}
