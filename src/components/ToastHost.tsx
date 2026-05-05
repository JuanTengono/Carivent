import { useToast } from "../context/ToastContext";

const styles: Record<string, string> = {
  success: "bg-emerald-900/95 border-emerald-600/60",
  error: "bg-red-900/95 border-red-600/60",
  info: "bg-sky-900/95 border-sky-600/60",
  warning: "bg-amber-900/95 border-amber-600/60",
};

export function ToastHost() {
  const { toasts } = useToast();
  if (toasts.length === 0) return null;
  return (
    <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2 max-w-sm pointer-events-none">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`pointer-events-auto rounded-xl border px-4 py-3 text-sm text-white shadow-card transition duration-300 ${styles[t.kind]}`}
          role="status"
        >
          {t.message}
        </div>
      ))}
    </div>
  );
}
