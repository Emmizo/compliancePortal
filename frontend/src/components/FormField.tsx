import clsx from 'clsx';
import type { InputHTMLAttributes, ReactNode, TextareaHTMLAttributes } from 'react';
import { forwardRef } from 'react';

interface FieldShellProps {
  label: string;
  hint?: string;
  error?: string | undefined;
  children: ReactNode;
}

function FieldShell({ label, hint, error, children }: FieldShellProps) {
  return (
    <label className="block text-sm">
      <span className="text-ink font-semibold">{label}</span>
      <div className="mt-1">{children}</div>
      {error ? (
        <p className="mt-1 text-error text-xs font-semibold" role="alert">
          {error}
        </p>
      ) : hint ? (
        <p className="mt-1 text-ink text-xs">{hint}</p>
      ) : null}
    </label>
  );
}

const BASE_INPUT_CLASSES =
  'block w-full rounded-md border bg-white text-ink px-3 py-2 shadow-sm focus:ring-2 focus:ring-gold focus:border-gold';

interface TextFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  hint?: string;
}

export const TextField = forwardRef<HTMLInputElement, TextFieldProps>(function TextField(
  { label, error, hint, className, ...rest },
  ref,
) {
  return (
    <FieldShell label={label} hint={hint} error={error}>
      <input
        ref={ref}
        className={clsx(
          BASE_INPUT_CLASSES,
          error ? 'border-error border-2 focus:ring-error focus:border-error' : 'border-brown',
          className,
        )}
        {...rest}
      />
    </FieldShell>
  );
});

interface TextAreaFieldProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string;
  error?: string;
  hint?: string;
}

export const TextAreaField = forwardRef<HTMLTextAreaElement, TextAreaFieldProps>(function TextAreaField(
  { label, error, hint, className, ...rest },
  ref,
) {
  return (
    <FieldShell label={label} hint={hint} error={error}>
      <textarea
        ref={ref}
        className={clsx(
          BASE_INPUT_CLASSES,
          error ? 'border-error border-2 focus:ring-error focus:border-error' : 'border-brown',
          className,
        )}
        rows={4}
        {...rest}
      />
    </FieldShell>
  );
});
