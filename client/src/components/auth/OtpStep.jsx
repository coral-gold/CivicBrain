import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { ApiError } from '../../api/client.js';
import { useCountdown } from '../../hooks/useCountdown.js';
import { otpSchema } from '../../lib/validation.js';
import Alert from '../ui/Alert.jsx';
import Button from '../ui/Button.jsx';
import OtpInput from './OtpInput.jsx';

/**
 * Shared "enter the code" step for signup and login. Shows a resend countdown (FR-A2: 60 s cooldown)
 * and the server's message for wrong / expired / locked codes.
 * @param {{ email: string, resendAfterSeconds: number, onVerify: (otp: string) => Promise<void>, onResend: () => Promise<number>, onBack: () => void }} props
 */
export default function OtpStep({ email, resendAfterSeconds, onVerify, onResend, onBack }) {
  const [error, setError] = useState(null);
  const [info, setInfo] = useState(null);
  const [left, restart] = useCountdown(resendAfterSeconds);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({ resolver: zodResolver(otpSchema) });
  useEffect(() => restart(resendAfterSeconds), [resendAfterSeconds, restart]);

  async function submit({ otp }) {
    setError(null);
    try {
      await onVerify(otp);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Something went wrong. Please try again.');
    }
  }

  async function resend() {
    setError(null);
    setInfo(null);
    try {
      restart(await onResend());
      setInfo('A new code has been sent.');
    } catch (e) {
      if (e instanceof ApiError && e.retryAfterSeconds) restart(e.retryAfterSeconds);
      setError(e instanceof ApiError ? e.message : 'Could not resend the code.');
    }
  }

  return (
    <form onSubmit={handleSubmit(submit)} noValidate className="space-y-4">
      <p className="text-sm">
        We sent a 6-digit code to <strong>{email}</strong>. It expires in 5 minutes.
      </p>
      {error && <Alert kind="error">{error}</Alert>}
      {info && !error && <Alert kind="success">{info}</Alert>}
      <OtpInput error={errors.otp?.message} {...register('otp')} />
      <Button type="submit" loading={isSubmitting} className="w-full">
        Verify
      </Button>
      <div className="flex items-center justify-between text-sm">
        <button type="button" onClick={onBack} className="min-h-touch text-civic underline">
          Change email
        </button>
        <button type="button" onClick={resend} disabled={left > 0} className="min-h-touch text-civic underline disabled:text-ink/50 disabled:no-underline">
          {left > 0 ? `Resend code in ${left}s` : 'Resend code'}
        </button>
      </div>
    </form>
  );
}
