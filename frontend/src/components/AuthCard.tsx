import { ReactNode } from "react";

export default function AuthCard({ title, subtitle, children, footer }: { title: string; subtitle?: string; children: ReactNode; footer?: ReactNode }) {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center px-4 py-8">
      <p className="mb-2 text-center text-xl font-bold text-civic">CivicBrain</p>
      <div className="rounded-lg border border-line bg-white p-5 shadow-sm sm:p-6">
        <h1 className="text-2xl font-bold">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-ink/70">{subtitle}</p>}
        <div className="mt-5">{children}</div>
      </div>
      {footer && <div className="mt-4 text-center text-sm">{footer}</div>}
    </main>
  );
}
