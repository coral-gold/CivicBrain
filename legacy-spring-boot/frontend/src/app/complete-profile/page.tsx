"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import Alert from "@/components/Alert";
import AuthCard from "@/components/AuthCard";
import Button from "@/components/Button";
import Field, { SelectField } from "@/components/Field";
import { usePublicConfig } from "@/hooks/usePublicConfig";
import { useUser } from "@/hooks/useUser";
import { api, User } from "@/lib/api";
import { applyServerErrors } from "@/lib/forms";
import { hardNavigate } from "@/lib/navigation";
import { GENDERS, profileSchema, ProfileValues } from "@/lib/validation";

function ProfileForm({ user, wardCount }: { user: User; wardCount: number }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const { register, handleSubmit, setError: setFieldError, formState: { errors, isSubmitting } } = useForm<ProfileValues>({
    resolver: zodResolver(profileSchema(wardCount)),
    defaultValues: { fullName: user.fullName },
  });

  async function submit(values: ProfileValues) {
    setError(null);
    try {
      await api.put("/citizen/profile", values);
      hardNavigate("/dashboard");
    } catch (e) {
      setError(applyServerErrors(e, setFieldError));
    }
  }

  return (
    <form onSubmit={handleSubmit(submit)} noValidate className="space-y-4">
      {error && <Alert kind="error">{error}</Alert>}
      <Field label="Full name" autoComplete="name" error={errors.fullName?.message} {...register("fullName")} />
      <Field label="Contact number" type="tel" inputMode="numeric" autoComplete="tel-national" maxLength={10}
        hint="10-digit Indian mobile number" error={errors.phone?.message} {...register("phone")} />
      <Field label="Email ID" type="email" value={user.email} readOnly hint="Verified" onChange={() => undefined} />
      <SelectField label="Gender" defaultValue="" error={errors.gender?.message} {...register("gender")}>
        <option value="" disabled>Select…</option>
        {GENDERS.map((g) => <option key={g.value} value={g.value}>{g.label}</option>)}
      </SelectField>
      <Field label="Birthdate" type="date" autoComplete="bday" error={errors.dateOfBirth?.message} {...register("dateOfBirth")} />
      <Field label="Ward number" type="number" inputMode="numeric" min={1} max={wardCount}
        hint={`Between 1 and ${wardCount}. Your complaints are routed to this ward when GPS is unavailable.`}
        error={errors.wardNumber?.message} {...register("wardNumber")} />
      <p className="text-xs text-ink/70">
        Why we ask: your contact details let municipal staff reach you about a complaint; birthdate confirms you are old enough to
        register; ward routes your reports. We collect nothing else and never show your phone number publicly.
      </p>
      <Button type="submit" loading={isSubmitting} className="w-full">Save and continue</Button>
    </form>
  );
}

export default function CompleteProfilePage() {
  const { user, loading } = useUser();
  const config = usePublicConfig();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [loading, user, router]);

  return (
    <AuthCard title="Complete your registration" subtitle="A few details so we can route and follow up on your complaints.">
      {user && config ? <ProfileForm user={user} wardCount={config.wardCount} /> : <p role="status">Loading…</p>}
    </AuthCard>
  );
}
