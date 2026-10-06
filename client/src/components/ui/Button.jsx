const styles = {
  primary: 'bg-civic text-white hover:bg-civic-dark disabled:bg-civic/50',
  secondary: 'border border-line bg-white text-ink hover:bg-paper disabled:text-ink/40',
  danger: 'bg-danger text-white hover:bg-danger/90 disabled:bg-danger/50',
  ghost: 'text-civic hover:bg-civic-soft disabled:text-ink/40',
};

/** 44 px minimum touch target; `loading` disables the button and announces busy state. */
export default function Button({ variant = 'primary', loading = false, className = '', children, disabled, type = 'button', ...rest }) {
  return (
    <button
      type={type}
      {...rest}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={`inline-flex min-h-touch min-w-touch items-center justify-center rounded-md px-4 py-2 text-base font-semibold transition-colors disabled:cursor-not-allowed ${styles[variant]} ${className}`}
    >
      {loading ? 'Please wait…' : children}
    </button>
  );
}
