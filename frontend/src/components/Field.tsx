import { forwardRef, InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes, useId } from "react";

interface Common { label: string; error?: string; hint?: ReactNode }

const base =
  "min-h-touch w-full rounded-md border bg-white px-3 py-2 text-base text-ink placeholder:text-ink/40 read-only:bg-paper read-only:text-ink/70";

function Wrap({ id, label, error, hint, children }: Common & { id: string; children: ReactNode }) {
  return (
    <div className="space-y-1">
      <label htmlFor={id} className="block text-sm font-semibold">{label}</label>
      {children}
      {hint && !error && <p id={`${id}-hint`} className="text-sm text-ink/70">{hint}</p>}
      {error && <p id={`${id}-err`} className="text-sm text-danger">{error}</p>}
    </div>
  );
}

const describedBy = (id: string, error?: string, hint?: ReactNode) => (error ? `${id}-err` : hint ? `${id}-hint` : undefined);

/** Labelled input; the error text is linked with aria-describedby (WCAG 2.1 AA, SRS §8.5). */
export const Field = forwardRef<HTMLInputElement, Common & InputHTMLAttributes<HTMLInputElement>>(
  ({ label, error, hint, className = "", ...rest }, ref) => {
    const id = useId();
    return (
      <Wrap id={id} label={label} error={error} hint={hint}>
        <input id={id} ref={ref} aria-invalid={!!error} aria-describedby={describedBy(id, error, hint)}
          className={`${base} ${error ? "border-danger" : "border-line"} ${className}`} {...rest} />
      </Wrap>
    );
  },
);
Field.displayName = "Field";

export const SelectField = forwardRef<HTMLSelectElement, Common & SelectHTMLAttributes<HTMLSelectElement>>(
  ({ label, error, hint, className = "", children, ...rest }, ref) => {
    const id = useId();
    return (
      <Wrap id={id} label={label} error={error} hint={hint}>
        <select id={id} ref={ref} aria-invalid={!!error} aria-describedby={describedBy(id, error, hint)}
          className={`${base} ${error ? "border-danger" : "border-line"} ${className}`} {...rest}>
          {children}
        </select>
      </Wrap>
    );
  },
);
SelectField.displayName = "SelectField";

export const TextAreaField = forwardRef<HTMLTextAreaElement, Common & TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ label, error, hint, className = "", ...rest }, ref) => {
    const id = useId();
    return (
      <Wrap id={id} label={label} error={error} hint={hint}>
        <textarea id={id} ref={ref} aria-invalid={!!error} aria-describedby={describedBy(id, error, hint)}
          className={`${base} ${error ? "border-danger" : "border-line"} ${className}`} {...rest} />
      </Wrap>
    );
  },
);
TextAreaField.displayName = "TextAreaField";

export default Field;
