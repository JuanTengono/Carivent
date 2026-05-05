import { useEffect, useRef, useState, type FormEvent } from "react";
import { Link, useSearchParams } from "react-router-dom";
import gsap from "gsap";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { useToast } from "../context/ToastContext";
import { ApiRequestError } from "../lib/api";
import { requestEmailVerification, verifyEmailTokenQuery } from "../lib/authRecoveryApi";

export function VerifyEmailPage() {
  const rootRef = useRef<HTMLDivElement>(null);
  const [searchParams] = useSearchParams();
  const { push } = useToast();
  const queryToken = searchParams.get("token") ?? "";
  const [status, setStatus] = useState<"idle" | "loading" | "ok" | "err">("idle");
  const [email, setEmail] = useState("");
  const [resendLoading, setResendLoading] = useState(false);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const ctx = gsap.context(() => {
      gsap.from("[data-ve]", { opacity: 0, y: 18, duration: 0.45, stagger: 0.06, ease: "power3.out" });
    }, rootRef);
    return () => ctx.revert();
  }, []);

  useEffect(() => {
    if (!queryToken) {
      setStatus("idle");
      return;
    }
    let cancelled = false;
    setStatus("loading");
    void verifyEmailTokenQuery(queryToken)
      .then(() => {
        if (!cancelled) setStatus("ok");
      })
      .catch(() => {
        if (!cancelled) setStatus("err");
      });
    return () => {
      cancelled = true;
    };
  }, [queryToken]);

  const onResend = async (e: FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      push("Indica tu correo", "error");
      return;
    }
    setResendLoading(true);
    try {
      await requestEmailVerification(email.trim());
      push("Si el correo existe y falta verificar, enviamos un nuevo enlace.", "success");
    } catch (err) {
      push(err instanceof ApiRequestError ? err.message : "Error al solicitar verificación", "error");
    } finally {
      setResendLoading(false);
    }
  };

  return (
    <div ref={rootRef} className="space-y-6">
      <div data-ve>
        <h1 className="text-2xl font-bold text-white">Verificación de correo</h1>
        <p className="mt-2 text-sm text-zinc-400">
          Confirma tu email para desbloquear todas las funciones de tu cuenta.
        </p>
      </div>

      {queryToken ? (
        <div data-ve className="rounded-xl border border-white/10 bg-surface/60 px-4 py-6 text-center">
          {status === "loading" ? (
            <p className="text-zinc-400">Verificando enlace…</p>
          ) : status === "ok" ? (
            <p className="text-emerald-300">Tu correo quedó verificado.</p>
          ) : status === "err" ? (
            <p className="text-red-400">No pudimos validar este enlace.</p>
          ) : null}
        </div>
      ) : null}

      <form data-ve className="space-y-4" onSubmit={(e) => void onResend(e)}>
        <p className="text-sm text-zinc-500">¿No recibiste el correo? Solicita uno nuevo.</p>
        <div>
          <label className="mb-1.5 block text-xs font-medium text-zinc-400" htmlFor="ve-email">
            Email
          </label>
          <Input id="ve-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <Button type="submit" className="w-full !py-3" disabled={resendLoading}>
          {resendLoading ? "Enviando…" : "Reenviar verificación"}
        </Button>
      </form>

      <p data-ve className="text-center text-sm text-zinc-500">
        <Link to="/login" className="font-semibold text-brand hover:underline">
          Ir al inicio de sesión
        </Link>
      </p>
    </div>
  );
}
