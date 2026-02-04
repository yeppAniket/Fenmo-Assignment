import type { ReactNode } from "react";

type Variant = "error" | "warning" | "info";

type Props = {
  variant: Variant;
  children: ReactNode;
  action?: ReactNode;
};

const variantClasses: Record<Variant, string> = {
  error: "banner banner-error",
  warning: "banner banner-warning",
  info: "banner banner-info",
};

export function Banner({ variant, children, action }: Props) {
  return (
    <div className={variantClasses[variant]} role="alert">
      <div className="banner-content">{children}</div>
      {action && <div className="banner-actions">{action}</div>}
    </div>
  );
}
