/** Plain-text email templates. Never include anything secret except the one-time code itself. */
export const templates = {
  otp: (code, purpose, ttlMinutes) => ({
    subject: 'Your CivicBrain verification code',
    text:
      `Your CivicBrain ${purpose === 'SIGNUP' ? 'sign-up' : 'login'} code is ${code}.\n\n` +
      `It expires in ${ttlMinutes} minutes and can be used once. If you did not request it, ignore this email.`,
  }),
  accountExists: () => ({
    subject: 'You already have a CivicBrain account',
    text:
      'Someone (hopefully you) tried to sign up with this email address, but an account already exists.\n\n' +
      'Please choose "Log in" on CivicBrain instead. If this was not you, no action is needed.',
  }),
  statusChange: (code, status) => ({
    subject: `Update on your CivicBrain complaint ${code}`,
    text: `Your complaint ${code} is now: ${String(status).replaceAll('_', ' ')}.`,
  }),
};
