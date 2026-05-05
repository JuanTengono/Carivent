import { useEffect, useRef, useState, type FormEvent } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import gsap from "gsap";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { ApiRequestError } from "../lib/api";
import { requestEmailVerification } from "../lib/authRecoveryApi";

function safeReturnUrl(raw: string | null): string {
  if (!raw || !raw.startsWith("/") || raw.startsWith("//")) return "/";
  return raw;
}

export function LoginPage() {
  const rootRef = useRef<HTMLDivElement>(null);
  const [searchParams] = useSearchParams();
  const returnUrl = safeReturnUrl(searchParams.get("returnUrl"));
  const { login } = useAuth();
  const { push } = useToast();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  const [loading, setLoading] = useState(false);
  const [verifyError, setVerifyError] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      return;
    }

    const ctx = gsap.context(() => {
      const tl = gsap.timeline({ defaults: { ease: "power3.out" } });

      tl.from("[data-login-header]", {
        opacity: 0,
        y: 28,
        duration: 0.5,
      })
        .from("[data-login-form] > *", {
          opacity: 0,
          y: 20,
          duration: 0.45,
          stagger: 0.08,
        }, "-=0.15")
        .from("[data-login-footer]", {
          opacity: 0,
          y: 20,
          duration: 0.4,
        }, "-=0.2");
    }, rootRef);

    return () => ctx.revert();
  }, []);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setErrors({});
    setVerifyError(false);
    if (!email.trim()) {
      setErrors({ email: "El email es requerido" });
      return;
    }
    if (!password) {
      setErrors({ password: "La contraseña es requerida" });
      return;
    }
    setLoading(true);
    try {
      await login(email.trim(), password);
      push("Bienvenido", "success");
      navigate(returnUrl, { replace: true });
    } catch (err) {
      const msg = err instanceof ApiRequestError ? err.message : "Error al iniciar sesión";
      if (msg.includes("verificar tu email")) {
        setVerifyError(true);
      }
      push(msg, "error");
    } finally {
      setLoading(false);
    }
  };

  const onResendVerification = async () => {
    if (!email.trim()) {
      push("Ingresa tu email primero", "warning");
      return;
    }
    setResendLoading(true);
    try {
      await requestEmailVerification(email.trim());
      push("Si el correo existe, enviamos un nuevo enlace de verificación", "success");
    } catch {
      push("Error al reenviar verificación", "error");
    } finally {
      setResendLoading(false);
    }
  };

  return (
    <div ref={rootRef} className="space-y-8">
      <div data-login-header>
        <h1 className="text-2xl font-bold text-white">Inicia sesión</h1>
        <p className="mt-2 text-sm text-zinc-400">
          Solo cuando lo necesitas: comprar tickets o gestionar tu cuenta.
        </p>
      </div>
      <form data-login-form onSubmit={(e) => void onSubmit(e)} className="space-y-4">
        <div>
          <label className="mb-1.5 block text-xs font-medium text-zinc-400" htmlFor="email">
            Email
          </label>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            error={errors.email}
          />
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-medium text-zinc-400" htmlFor="password">
            Contraseña
          </label>
          <Input
            id="password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            error={errors.password}
          />
        </div>
        <Button type="submit" className="w-full !py-3" disabled={loading}>
          {loading ? "Entrando…" : "Iniciar sesión"}
        </Button>
      </form>

      {verifyError && (
        <div data-login-form className="rounded-xl border border-brand/30 bg-brand/10 px-4 py-3 text-sm text-brand">
          <p>Debes verificar tu correo antes de iniciar sesión.</p>
          <button
            type="button"
            onClick={onResendVerification}
            disabled={resendLoading}
            className="mt-2 font-semibold underline hover:no-underline"
          >
            {resendLoading ? "Enviando…" : "Reenviar correo de verificación"}
          </button>
        </div>
      )}

      <p className="text-center text-sm text-zinc-500">
        ¿No tienes cuenta?{" "}
        <Link
          to={`/registro?returnUrl=${encodeURIComponent(returnUrl)}`}
          className="font-semibold text-brand hover:underline"
        >
          Regístrate
        </Link>
      </p>
      <p className="text-center text-sm text-zinc-500">
        <Link to="/forgot-password" className="font-semibold text-brand hover:underline">
          ¿Olvidaste tu contraseña?
        </Link>
      </p>
      <div data-login-footer className="border-t border-white/10 pt-6">
        <Link to="/">
          <Button variant="ghost" className="w-full text-zinc-400">
            Explorar eventos sin cuenta
          </Button>
        </Link>
      </div>
    </div>
  );
}
