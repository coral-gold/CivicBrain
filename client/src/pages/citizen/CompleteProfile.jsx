import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import * as authApi from '../../api/auth.js';
import { AuthCard } from '../../components/Layout.jsx';
import Alert from '../../components/ui/Alert.jsx';
import Button from '../../components/ui/Button.jsx';
import { SelectField, TextField } from '../../components/ui/fields.jsx';
import Spinner from '../../components/ui/Spinner.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { GENDERS } from '../../lib/constants.js';
import { applyServerError } from '../../lib/format.js';
import { profileSchema } from '../../lib/validation.js';

/** FR-A5–A7: registration details. Also serves as "Edit my details" once the profile is complete. */
export default function CompleteProfile() {
  const { user, setUser } = useAuth();
  const navigate = useNavigate();
  const [wards, setWards] = useState(null);
  const [error, setError] = useState(null);
  const today = new Date().toISOString().slice(0, 10);

  const {
    register,
    handleSubmit,
    setError: setFieldError,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      fullName: user?.fullName ?? '',
      phone: user?.phone ?? '',
      gender: user?.gender ?? '',
      dateOfBirth: user?.dateOfBirth ?? '',
      wardNumber: user?.wardNumber ?? '',
    },
  });

  useEffect(() => {
    authApi
      .fetchPublicConfig()
      .then((c) => setWards(c.wards))
      .catch(() => setError('Could not load the list of wards. Please refresh.'));
  }, []);

  async function submit(values) {
    setError(null);
    try {
      const { user: updated } = await authApi.saveProfile(values);
      setUser(updated);
      navigate('/dashboard', { replace: true });
    } catch (e) {
      setError(applyServerError(e, setFieldError));
    }
  }

  const editing = user?.profileComplete;
  return (
    <AuthCard title={editing ? 'Edit your details' : 'Complete your registration'} subtitle="A few details so we can route and follow up on your complaints.">
      {!wards ? (
        error ? (
          <Alert kind="error">{error}</Alert>
        ) : (
          <Spinner />
        )
      ) : (
        <form onSubmit={handleSubmit(submit)} noValidate className="space-y-4">
          {error && <Alert kind="error">{error}</Alert>}
          <TextField label="Full name" autoComplete="name" error={errors.fullName?.message} {...register('fullName')} />
          <TextField
            label="Contact number"
            type="tel"
            inputMode="tel"
            autoComplete="tel-national"
            hint="10-digit Indian mobile number"
            error={errors.phone?.message}
            {...register('phone')}
          />
          <TextField label="Email ID" type="email" value={user?.email ?? ''} readOnly hint="Verified" onChange={() => {}} />
          <SelectField label="Gender" error={errors.gender?.message} {...register('gender')}>
            <option value="">Select…</option>
            {GENDERS.map((g) => (
              <option key={g.value} value={g.value}>
                {g.label}
              </option>
            ))}
          </SelectField>
          <TextField label="Birthdate" type="date" max={today} autoComplete="bday" error={errors.dateOfBirth?.message} {...register('dateOfBirth')} />
          <SelectField
            label="Ward number"
            error={errors.wardNumber?.message}
            hint="Used to route your complaints when GPS is unavailable."
            {...register('wardNumber')}
          >
            <option value="">Select your ward…</option>
            {wards.map((w) => (
              <option key={w.number} value={w.number}>
                {w.number} — {w.name}
              </option>
            ))}
          </SelectField>
          <p className="text-xs text-ink/70">
            Why we ask: your contact details let municipal staff reach you about a complaint; your birthdate confirms you are old enough to register; your ward
            routes your reports. We collect nothing else and never show your phone number publicly.
          </p>
          <Button type="submit" loading={isSubmitting} className="w-full">
            Save and continue
          </Button>
        </form>
      )}
    </AuthCard>
  );
}
