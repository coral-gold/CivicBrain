"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import Alert from "@/components/Alert";
import AuthCard from "@/components/AuthCard";
import Button from "@/components/Button";
import Field from "@/components/Field";
import OtpEntry from "@/components/OtpEntry";
import { api, OtpSent, User } from "@/lib/api";
import { applyServerErrors } from "@/lib/forms";
import { signupSchema } from "@/lib/validation";

type Values = { name: string; email: string };

export default function SignupPage() {
  const router = useRouter();
  const [sent, setSent] = useState<{ values: Values; resend: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { register, handleSubmit, setError: setFieldError, formState: { errors, isSubmitting } } = useForm<Values>({ resolver: zodResolver(signupSchema) });

  async function request(values: Values) {
    setError(null);
    try {
      const r = await api.post<OtpSent>("/auth/citizen/signup/request-otp", values);
      setSent({ values, resend: r.resendAfterSeconds });
    } catch (e) {
      setError(applyServerErrors(e, setFieldError));
    }
  }

  async function verify(otp: string) {
    await api.post<{ user: User }>("/auth/citizen/signup/verify", { email: sent!.values.email, otp });
    router.replace("/complete-profile");
    router.refresh();
  }

  async function resend() {
    const r = await api.post<OtpSent>("/auth/citizen/signup/request-otp", sent!.values);
    return r.resendAfterSeconds;
  }

  return (
    <AuthCard title="Create your account" subtitle="Enter your name and email. We'll send a one-time code — no password needed."
      footer={<>Already registered? <Link href="/login" className="text-civic underline">Log in</Link></>}>
      {sent ? (
        <OtpEntry email={sent.values.email} resendAfterSeconds={sent.resend} onVerify={verify} onResend={resend} onBack={() => setSent(null)} />
      ) : (
        <form onSubmit={handleSubmit(request)} noValidate className="space-y-4">
          {error && <Alert kind="error">{error}</Alert>}
          <Field label="Name" autoComplete="name" error={errors.name?.message} {...register("name")} />
          <Field label="Email ID" type="email" autoComplete="email" inputMode="email" error={errors.email?.message} {...register("email")} />
          <Button type="submit" loading={isSubmitting} className="w-full">Send code</Button>
        </form>
      )}
    </AuthCard>
  );
}

