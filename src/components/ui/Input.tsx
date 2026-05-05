import type { InputHTMLAttributes } from "react";

export function Input({
  className = "",
  error,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & { error?: string }) {
  return (
    <div className="w-full">
      <input
        className={`w-full rounded-xl border bg-surface px-4 py-3 text-sm text-white outline-none transition placeholder:text-zinc-500 focus:border-brand focus:ring-1 focus:ring-brand ${
          error ? "border-red-500" : "border-white/10"
        } ${className}`}
        {...props}
      />
      {error ? <p className="mt-1.5 text-xs text-red-400">{error}</p> : null}
    </div>
  );
}
