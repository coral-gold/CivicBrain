"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { useForm } from "react-hook-form";
import Alert from "@/components/Alert";
import AuthCard from "@/components/AuthCard";
import Button from "@/components/Button";
import Field from "@/components/Field";
import OtpEntry from "@/components/OtpEntry";
import { api, OtpSent, User } from "@/lib/api";
import { applyServerErrors } from "@/lib/forms";
import { safeNext } from "@/lib/navigation";
import { loginSchema } from "@/lib/validation";

type Values = { email: string };

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [sent, setSent] = useState<{ email: string; resend: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { register, handleSubmit, setError: setFieldError, formState: { errors, isSubmitting } } = useForm<Values>({ resolver: zodResolver(loginSchema) });

  async function request(values: Values) {
    setError(null);
    try {
      const r = await api.post<OtpSent>("/auth/citizen/login/request-otp", values);
      setSent({ email: values.email, resend: r.resendAfterSeconds });
    } catch (e) {
      setError(applyServerErrors(e, setFieldError));
    }
  }

  async function verify(otp: string) {
    const r = await api.post<{ user: User }>("/auth/citizen/login/verify", { email: sent!.email, otp });
    // FR-A5: incomplete profiles go to the details form; otherwise honour a *safe* ?next= (AT-13).
    router.replace(r.user.profileComplete ? safeNext(params.get("next")) : "/complete-profile");
    router.refresh();
  }

  async function resend() {
    const r = await api.post<OtpSent>("/auth/citizen/login/request-otp", { email: sent!.email });
    return r.resendAfterSeconds;
  }

  return sent ? (
    <OtpEntry email={sent.email} resendAfterSeconds={sent.resend} onVerify={verify} onResend={resend} onBack={() => setSent(null)} />
  ) : (
    <form onSubmit={handleSubmit(request)} noValidate className="space-y-4">
      {error && <Alert kind="error">{error}</Alert>}
      <Field label="Email ID" type="email" autoComplete="email" inputMode="email" error={errors.email?.message} {...register("email")} />
      <Button type="submit" loading={isSubmitting} className="w-full">Send code</Button>
    </form>
  );
}

export default function LoginPage() {
  return (
    <AuthCard title="Log in" subtitle="We'll email you a one-time code."
      footer={<>New here? <Link href="/signup" className="text-civic underline">Create an account</Link> · <Link href="/admin/login" className="text-civic underline">Staff login</Link></>}>
      <Suspense fallback={null}><LoginForm /></Suspense>
    </AuthCard>
  );
}
