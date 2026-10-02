"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { ApiError } from "@/lib/api";
import { otpSchema } from "@/lib/validation";
import Alert from "./Alert";
import Button from "./Button";
import Field from "./Field";

/** Shared OTP step for signup and login: verify with 5-attempt feedback and a 60 s resend cooldown. */
export default function OtpEntry({
  email,
  resendAfterSeconds,
  onVerify,
  onResend,
  onBack,
}: {
  email: string;
  resendAfterSeconds: number;
  onVerify: (otp: string) => Promise<void>;
  onResend: () => Promise<number>;
  onBack: () => void;
}) {
  const [error, setError] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(resendAfterSeconds);
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<{ otp: string }>({ resolver: zodResolver(otpSchema) });

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  async function submit({ otp }: { otp: string }) {
    setError(null);
    try {
      await onVerify(otp);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Something went wrong. Please try again.");
    }
  }

  async function resend() {
    setError(null);
    try {
      setCooldown(await onResend());
    } catch (e) {
      if (e instanceof ApiError && e.retryAfterSeconds) setCooldown(e.retryAfterSeconds);
      setError(e instanceof ApiError ? e.message : "Could not resend the code.");
    }
  }

  return (
    <form onSubmit={handleSubmit(submit)} noValidate className="space-y-4">
      <p className="text-sm">We sent a 6-digit code to <strong>{email}</strong>. It expires in 5 minutes.</p>
      {error && <Alert kind="error">{error}</Alert>}
      <Field label="Verification code" inputMode="numeric" autoComplete="one-time-code" maxLength={6}
        error={errors.otp?.message} {...register("otp")} />
      <Button type="submit" loading={isSubmitting} className="w-full">Verify</Button>
      <div className="flex items-center justify-between text-sm">
        <button type="button" onClick={onBack} className="min-h-touch text-civic underline">Change email</button>
        <button type="button" onClick={resend} disabled={cooldown > 0} className="min-h-touch text-civic underline disabled:text-ink/50 disabled:no-underline">
          {cooldown > 0 ? `Resend code in ${cooldown}s` : "Resend code"}
        </button>
      </div>
    </form>
  );
}
