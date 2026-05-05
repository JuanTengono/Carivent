import { useEffect, useRef, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import gsap from "gsap";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { useToast } from "../context/ToastContext";
import { ApiRequestError } from "../lib/api";
import { requestPasswordReset } from "../lib/authRecoveryApi";

export function ForgotPasswordPage() {
  const rootRef = useRef<HTMLDivElement>(null);
  const { push } = useToast();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const ctx = gsap.context(() => {
      gsap.from("[data-fp]", { opacity: 0, y: 20, duration: 0.45, stagger: 0.07, ease: "power3.out" });
    }, rootRef);
    return () => ctx.revert();
  }, []);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      push("Indica tu correo", "error");
      return;
    }
    setLoading(true);
    try {
      await requestPasswordReset(email.trim());
      setSent(true);
      push("Si el correo existe, recibirás instrucciones.", "success");
    } catch (err) {
      push(err instanceof ApiRequestError ? err.message : "Error al solicitar recuperación", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div ref={rootRef} className="space-y-6">
      <div data-fp>
        <h1 className="text-2xl font-bold text-white">Recuperar contraseña</h1>
        <p className="mt-2 text-sm text-zinc-400">Te enviaremos un enlace si el correo está registrado.</p>
      </div>
      {sent ? (
        <p data-fp className="rounded-xl border border-emerald-500/30 bg-emerald-950/30 px-4 py-3 text-sm text-emerald-200">
          Revisa tu bandeja de entrada y carpeta de spam.
        </p>
      ) : (
        <form data-fp className="space-y-4" onSubmit={(e) => void onSubmit(e)}>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-zinc-400" htmlFor="fp-email">
              Email
            </label>
            <Input id="fp-email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <Button type="submit" className="w-full !py-3" disabled={loading}>
            {loading ? "Enviando…" : "Enviar enlace"}
          </Button>
        </form>
      )}
      <p data-fp className="text-center text-sm text-zinc-500">
        <Link to="/login" className="font-semibold text-brand hover:underline">
          Volver al inicio de sesión
        </Link>
      </p>
    </div>
  );
}
