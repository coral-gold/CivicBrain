import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import * as authApi from '../../api/auth.js';
import OtpStep from '../../components/auth/OtpStep.jsx';
import { AuthCard } from '../../components/Layout.jsx';
import Alert from '../../components/ui/Alert.jsx';
import Button from '../../components/ui/Button.jsx';
import { TextField } from '../../components/ui/fields.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { applyServerError } from '../../lib/format.js';
import { safeNext } from '../../lib/navigation.js';
import { loginSchema } from '../../lib/validation.js';

/** FR-A8/A9: Email → code → logged in; incomplete profile → Complete Profile, else safe ?next= or dashboard. */
export default function Login() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { setUser } = useAuth();
  const [sent, setSent] = useState(null); // { email, resend }
  const [error, setError] = useState(null);
  const {
    register,
    handleSubmit,
    setError: setFieldError,
    formState: { errors, isSubmitting },
  } = useForm({ resolver: zodResolver(loginSchema) });

  async function request(values) {
    setError(null);
    try {
      const r = await authApi.requestLoginOtp(values);
      setSent({ email: values.email, resend: r.resendAfterSeconds });
    } catch (e) {
      setError(applyServerError(e, setFieldError));
    }
  }

  async function verify(otp) {
    const { user } = await authApi.verifyLogin({ email: sent.email, otp });
    setUser(user);
    navigate(user.profileComplete ? safeNext(params.get('next')) : '/complete-profile', { replace: true });
  }

  return (
    <AuthCard
      title="Log in"
      subtitle="We'll email you a one-time code."
      footer={
        <>
          New here?{' '}
          <Link to="/signup" className="text-civic underline">
            Create an account
          </Link>{' '}
          ·{' '}
          <Link to="/staff/login" className="text-civic underline">
            Staff login
          </Link>
        </>
      }
    >
      {sent ? (
        <OtpStep
          email={sent.email}
          resendAfterSeconds={sent.resend}
          onVerify={verify}
          onResend={async () => (await authApi.requestLoginOtp({ email: sent.email })).resendAfterSeconds}
          onBack={() => setSent(null)}
        />
      ) : (
        <form onSubmit={handleSubmit(request)} noValidate className="space-y-4">
          {error && <Alert kind="error">{error}</Alert>}
          <TextField label="Email ID" type="email" inputMode="email" autoComplete="email" error={errors.email?.message} {...register('email')} />
          <Button type="submit" loading={isSubmitting} className="w-full">
            Send code
          </Button>
        </form>
      )}
    </AuthCard>
  );
}
