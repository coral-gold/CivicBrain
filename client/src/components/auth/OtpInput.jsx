import { forwardRef } from 'react';
import { TextField } from '../ui/fields.jsx';

/** One field for the 6-digit code: numeric keypad on phones, SMS/e-mail autofill, non-digits stripped. */
const OtpInput = forwardRef(function OtpInput({ onChange, ...rest }, ref) {
  return (
    <TextField
      ref={ref}
      label="6-digit code"
      inputMode="numeric"
      autoComplete="one-time-code"
      maxLength={6}
      pattern="[0-9]*"
      className="text-center text-2xl tracking-[0.5em]"
      onChange={(e) => {
        e.target.value = e.target.value.replace(/\D/g, '').slice(0, 6);
        onChange?.(e);
      }}
      {...rest}
    />
  );
});
export default OtpInput;
