import clsx from 'clsx';
import type { ButtonHTMLAttributes, ReactNode } from 'react';

type Variant = 'primary' | 'secondary' | 'danger' | 'ghost';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  isLoading?: boolean;
  children: ReactNode;
}


const VARIANT_CLASSES: Record<Variant, string> = {
  primary:   'bg-gold  text-white border border-gold  hover:bg-brown hover:border-brown',
  secondary: 'bg-white text-brown border border-brown hover:bg-gold  hover:text-white  hover:border-gold',
  danger:    'bg-brown text-white border border-brown hover:bg-ink   hover:border-ink',
  ghost:     'bg-transparent text-brown border border-transparent hover:bg-gold hover:text-white',
};

export function Button({
  variant = 'primary',
  isLoading,
  className,
  children,
  disabled,
  ...rest
}: ButtonProps) {
  return (
    <button
      {...rest}
      disabled={disabled || isLoading}
      className={clsx(
        'inline-flex items-center justify-center px-4 py-2 rounded-md text-sm font-medium transition-colors',
        'disabled:cursor-not-allowed disabled:opacity-50',
        VARIANT_CLASSES[variant],
        className,
      )}
    >
      {isLoading ? (
        <span className="mr-2 inline-block h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
      ) : null}
      {children}
    </button>
  );
}
