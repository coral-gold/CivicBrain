import { ButtonHTMLAttributes } from "react";

type Variant = "primary" | "secondary" | "danger" | "ghost";
const styles: Record<Variant, string> = {
  primary: "bg-civic text-white hover:bg-civic-dark disabled:bg-civic/50",
  secondary: "border border-line bg-white text-ink hover:bg-paper disabled:text-ink/40",
  danger: "bg-danger text-white hover:bg-danger/90 disabled:bg-danger/50",
  ghost: "text-civic hover:bg-civic/10 disabled:text-ink/40",
};

export default function Button({
  variant = "primary",
  loading = false,
  className = "",
  children,
  disabled,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; loading?: boolean }) {
  return (
    <button
      {...rest}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={`inline-flex min-h-touch min-w-touch items-center justify-center rounded-md px-4 py-2 text-base font-semibold transition-colors disabled:cursor-not-allowed ${styles[variant]} ${className}`}
    >
      {loading ? "Please wait…" : children}
    </button>
  );
}
