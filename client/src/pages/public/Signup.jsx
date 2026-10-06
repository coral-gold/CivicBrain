import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate } from 'react-router-dom';
import * as authApi from '../../api/auth.js';
import OtpStep from '../../components/auth/OtpStep.jsx';
import { AuthCard } from '../../components/Layout.jsx';
import Alert from '../../components/ui/Alert.jsx';
import Button from '../../components/ui/Button.jsx';
import { TextField } from '../../components/ui/fields.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { applyServerError } from '../../lib/format.js';
import { signupSchema } from '../../lib/validation.js';

/** FR-A1: Name + Email → code → verified → Complete Profile. */
export default function Signup() {
  const navigate = useNavigate();
  const { setUser } = useAuth();
  const [sent, setSent] = useState(null); // { values, resend }
  const [error, setError] = useState(null);
  const {
    register,
    handleSubmit,
    setError: setFieldError,
    formState: { errors, isSubmitting },
  } = useForm({ resolver: zodResolver(signupSchema) });

  async function request(values) {
    setError(null);
    try {
      const r = await authApi.requestSignupOtp(values);
      setSent({ values, resend: r.resendAfterSeconds });
    } catch (e) {
      setError(applyServerError(e, setFieldError));
    }
  }

  async function verify(otp) {
    const { user } = await authApi.verifySignup({ email: sent.values.email, otp });
    setUser(user);
    navigate('/complete-profile', { replace: true });
  }

  return (
    <AuthCard
      title="Create your account"
      subtitle="Enter your name and email. We'll send a one-time code — no password needed."
      footer={
        <>
          Already registered?{' '}
          <Link to="/login" className="text-civic underline">
            Log in
          </Link>
        </>
      }
    >
      {sent ? (
        <OtpStep
          email={sent.values.email}
          resendAfterSeconds={sent.resend}
          onVerify={verify}
          onResend={async () => (await authApi.requestSignupOtp(sent.values)).resendAfterSeconds}
          onBack={() => setSent(null)}
        />
      ) : (
        <form onSubmit={handleSubmit(request)} noValidate className="space-y-4">
          {error && <Alert kind="error">{error}</Alert>}
          <TextField label="Name" autoComplete="name" error={errors.name?.message} {...register('name')} />
          <TextField label="Email ID" type="email" inputMode="email" autoComplete="email" error={errors.email?.message} {...register('email')} />
          <Button type="submit" loading={isSubmitting} className="w-full">
            Send code
          </Button>
        </form>
      )}
    </AuthCard>
  );
}
