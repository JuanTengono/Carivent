import { useEffect, useRef, useState, type FormEvent } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import gsap from "gsap";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { useToast } from "../context/ToastContext";
import { ApiRequestError } from "../lib/api";
import { resetPassword } from "../lib/authRecoveryApi";

export function ResetPasswordPage() {
  const rootRef = useRef<HTMLDivElement>(null);
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { push } = useToast();
  const token = searchParams.get("token") ?? "";
  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const ctx = gsap.context(() => {
      gsap.from("[data-rp]", { opacity: 0, y: 20, duration: 0.45, stagger: 0.07, ease: "power3.out" });
    }, rootRef);
    return () => ctx.revert();
  }, []);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!token) {
      push("Enlace inválido o incompleto", "error");
      return;
    }
    if (password.length < 8) {
      push("La contraseña debe tener al menos 8 caracteres", "error");
      return;
    }
    if (password !== password2) {
      push("Las contraseñas no coinciden", "error");
      return;
    }
    setLoading(true);
    try {
      await resetPassword(token, password);
      push("Contraseña actualizada. Ya puedes iniciar sesión.", "success");
      navigate("/login", { replace: true });
    } catch (err) {
      push(err instanceof ApiRequestError ? err.message : "No se pudo restablecer la contraseña", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div ref={rootRef} className="space-y-6">
      <div data-rp>
        <h1 className="text-2xl font-bold text-white">Nueva contraseña</h1>
        <p className="mt-2 text-sm text-zinc-400">Define una contraseña segura para tu cuenta.</p>
      </div>
      {!token ? (
        <p data-rp className="text-sm text-red-400">Falta el token en la URL. Abre el enlace del correo.</p>
      ) : (
        <form data-rp className="space-y-4" onSubmit={(e) => void onSubmit(e)}>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-zinc-400" htmlFor="np">
              Nueva contraseña
            </label>
            <Input id="np" type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-zinc-400" htmlFor="np2">
              Confirmar
            </label>
            <Input id="np2" type="password" autoComplete="new-password" value={password2} onChange={(e) => setPassword2(e.target.value)} />
          </div>
          <Button type="submit" className="w-full !py-3" disabled={loading}>
            {loading ? "Guardando…" : "Guardar contraseña"}
          </Button>
        </form>
      )}
      <p data-rp className="text-center text-sm text-zinc-500">
        <Link to="/login" className="font-semibold text-brand hover:underline">
          Ir al inicio de sesión
        </Link>
      </p>
    </div>
  );
}
