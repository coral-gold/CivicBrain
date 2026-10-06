import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate } from 'react-router-dom';
import * as authApi from '../../api/auth.js';
import { ApiError } from '../../api/client.js';
import { AuthCard } from '../../components/Layout.jsx';
import Alert from '../../components/ui/Alert.jsx';
import Button from '../../components/ui/Button.jsx';
import { TextField } from '../../components/ui/fields.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { staffLoginSchema } from '../../lib/validation.js';

/** FR-A10–A12: email + password with show/hide toggle; lockout message with time remaining. */
export default function StaffLogin() {
  const navigate = useNavigate();
  const { setUser } = useAuth();
  const [show, setShow] = useState(false);
  const [error, setError] = useState(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({ resolver: zodResolver(staffLoginSchema) });

  async function submit(values) {
    setError(null);
    try {
      const { user } = await authApi.staffLogin(values);
      setUser(user);
      navigate('/staff/queue', { replace: true });
    } catch (e) {
      if (e instanceof ApiError && e.code === 'ACCOUNT_LOCKED') {
        const mins = Math.max(1, Math.ceil((e.retryAfterSeconds ?? 900) / 60));
        setError(`Too many failed attempts. This account is locked for about ${mins} more minute${mins > 1 ? 's' : ''}.`);
      } else {
        setError(e instanceof ApiError ? e.message : 'Something went wrong. Please try again.');
      }
    }
  }

  return (
    <AuthCard
      title="Staff sign in"
      subtitle="For municipal officers and administrators."
      footer={
        <Link to="/login" className="text-civic underline">
          Citizen login
        </Link>
      }
    >
      <form onSubmit={handleSubmit(submit)} noValidate className="space-y-4">
        {error && <Alert kind="error">{error}</Alert>}
        <TextField label="Email ID" type="email" autoComplete="username" error={errors.email?.message} {...register('email')} />
        <div className="space-y-1">
          <TextField
            label="Password"
            type={show ? 'text' : 'password'}
            autoComplete="current-password"
            error={errors.password?.message}
            {...register('password')}
          />
          <button type="button" onClick={() => setShow((s) => !s)} aria-pressed={show} className="min-h-touch text-sm text-civic underline">
            {show ? 'Hide password' : 'Show password'}
          </button>
        </div>
        <Button type="submit" loading={isSubmitting} className="w-full">
          Sign in
        </Button>
      </form>
    </AuthCard>
  );
}
