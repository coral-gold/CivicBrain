"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { useForm } from "react-hook-form";
import Alert from "@/components/Alert";
import AuthCard from "@/components/AuthCard";
import Button from "@/components/Button";
import Field from "@/components/Field";
import { api, ApiError, User } from "@/lib/api";
import { hardNavigate, safeNext } from "@/lib/navigation";
import { adminLoginSchema } from "@/lib/validation";

type Values = { email: string; password: string };

function AdminLoginForm() {
  const params = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<Values>({ resolver: zodResolver(adminLoginSchema) });

  async function submit(values: Values) {
    setError(null);
    try {
      await api.post<{ user: User }>("/auth/admin/login", values);
      const next = safeNext(params.get("next"), "/admin/dashboard");
      hardNavigate(next.startsWith("/admin") ? next : "/admin/dashboard");
    } catch (e) {
      if (e instanceof ApiError && e.code === "ACCOUNT_LOCKED") {
        const mins = Math.max(1, Math.ceil((e.retryAfterSeconds ?? 900) / 60));
        setError(`Too many failed attempts. This account is locked for about ${mins} more minute${mins > 1 ? "s" : ""}.`);
      } else {
        setError(e instanceof ApiError ? e.message : "Something went wrong. Please try again.");
      }
    }
  }

  return (
    <form onSubmit={handleSubmit(submit)} noValidate className="space-y-4">
      {error && <Alert kind="error">{error}</Alert>}
      <Field label="Email ID" type="email" autoComplete="username" error={errors.email?.message} {...register("email")} />
      <Field label="Password" type="password" autoComplete="current-password" error={errors.password?.message} {...register("password")} />
      <Button type="submit" loading={isSubmitting} className="w-full">Sign in</Button>
    </form>
  );
}

export default function AdminLoginPage() {
  return (
    <AuthCard title="Staff sign in" subtitle="For municipal officers and administrators."
      footer={<Link href="/login" className="text-civic underline">Citizen login</Link>}>
      <Suspense fallback={null}><AdminLoginForm /></Suspense>
    </AuthCard>
  );
}
