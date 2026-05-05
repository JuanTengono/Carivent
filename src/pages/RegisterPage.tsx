import { useEffect, useRef, useState, type FormEvent } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import gsap from "gsap";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { useToast } from "../context/ToastContext";
import { apiFetch, ApiRequestError } from "../lib/api";

function safeReturnUrl(raw: string | null): string {
  if (!raw || !raw.startsWith("/") || raw.startsWith("//")) return "/";
  return raw;
}

export function RegisterPage() {
  const rootRef = useRef<HTMLDivElement>(null);
  const [searchParams] = useSearchParams();
  const returnUrl = safeReturnUrl(searchParams.get("returnUrl"));
  const { push } = useToast();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [accepted, setAccepted] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      return;
    }

    const ctx = gsap.context(() => {
      const tl = gsap.timeline({ defaults: { ease: "power3.out" } });

      tl.from("[data-register-header]", {
        opacity: 0,
        y: 28,
        duration: 0.5,
      })
        .from("[data-register-form] > *", {
          opacity: 0,
          y: 20,
          duration: 0.45,
          stagger: 0.08,
        }, "-=0.15")
        .from("[data-register-footer]", {
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
    if (name.trim().length < 3) {
      setErrors({ name: "Mínimo 3 caracteres" });
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setErrors({ email: "Email no válido" });
      return;
    }
    if (password.length < 8) {
      setErrors({ password: "Mínimo 8 caracteres" });
      return;
    }
    if (!accepted) {
      push("Debes aceptar términos y condiciones", "warning");
      return;
    }
    setLoading(true);
    try {
      await apiFetch("/auth/register", {
        method: "POST",
        body: { name: name.trim(), email: email.trim(), password },
      });
      push("¡Registro exitoso! Verifica tu email", "success");
      navigate(`/login?returnUrl=${encodeURIComponent(returnUrl)}`, { replace: true });
    } catch (err) {
      const msg = err instanceof ApiRequestError ? err.message : "No se pudo registrar";
      push(msg, "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div ref={rootRef} className="space-y-8">
      <div data-register-header>
        <h1 className="text-2xl font-bold text-white">Crear cuenta</h1>
        <p className="mt-2 text-sm text-zinc-400">Úsala para comprar tickets y ver tus compras.</p>
      </div>
      <form data-register-form onSubmit={(e) => void onSubmit(e)} className="space-y-4">
        <div>
          <label className="mb-1.5 block text-xs font-medium text-zinc-400" htmlFor="name">
            Nombre
          </label>
          <Input id="name" value={name} onChange={(e) => setName(e.target.value)} error={errors.name} />
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-medium text-zinc-400" htmlFor="email">
            Email
          </label>
          <Input
            id="email"
            type="email"
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
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            error={errors.password}
          />
        </div>
        <label className="flex items-start gap-2 text-sm text-zinc-400">
          <input
            type="checkbox"
            checked={accepted}
            onChange={(e) => setAccepted(e.target.checked)}
            className="mt-1 rounded border-white/20 bg-surface"
          />
          Acepto términos y condiciones
        </label>
        <Button type="submit" className="w-full !py-3" disabled={loading}>
          {loading ? "Creando…" : "Registrarse"}
        </Button>
      </form>
      <p className="text-center text-sm text-zinc-500">
        ¿Ya tienes cuenta?{" "}
        <Link
          to={`/login?returnUrl=${encodeURIComponent(returnUrl)}`}
          className="font-semibold text-brand hover:underline"
        >
          Inicia sesión
        </Link>
      </p>
      <div data-register-footer className="border-t border-white/10 pt-6" />
    </div>
  );
}
