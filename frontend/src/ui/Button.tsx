import type { ButtonHTMLAttributes } from "react";

type Variant = "primary" | "danger" | "ghost";

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  loading?: boolean;
};

const variantClasses: Record<Variant, string> = {
  primary: "btn btn-primary",
  danger: "btn btn-danger",
  ghost: "btn btn-ghost",
};

export function Button({
  variant = "primary",
  loading,
  disabled,
  children,
  ...rest
}: Props) {
  return (
    <button
      className={variantClasses[variant]}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...rest}
    >
      {children}
    </button>
  );
}
