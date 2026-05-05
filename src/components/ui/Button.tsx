import type { ButtonHTMLAttributes, ReactNode } from "react";

type Variant = "primary" | "secondary" | "outline" | "ghost" | "danger";

const variants: Record<Variant, string> = {
  primary:
    "bg-brand text-white hover:bg-brand-dark disabled:opacity-50 disabled:cursor-not-allowed",
  secondary: "bg-zinc-700 text-white hover:bg-zinc-600 disabled:opacity-50",
  outline:
    "border-2 border-brand text-brand hover:bg-brand-muted disabled:opacity-50",
  ghost: "text-zinc-300 hover:bg-white/5",
  danger: "bg-red-700 text-white hover:bg-red-800 disabled:opacity-50",
};

export function Button({
  children,
  variant = "primary",
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode;
  variant?: Variant;
}) {
  return (
    <button
      type="button"
      className={`inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors duration-200 ${variants[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
