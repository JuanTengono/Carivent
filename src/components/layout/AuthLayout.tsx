import { Link, Outlet } from "react-router-dom";

export function AuthLayout() {
  return (
    <div className="min-h-screen grid md:grid-cols-2">
      <div className="relative hidden flex-col justify-between overflow-hidden bg-gradient-to-br from-brand via-brand-dark to-black p-10 md:flex">
        <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_30%_20%,white,transparent_50%)]" />
        <Link to="/" className="relative z-10 text-xl font-bold text-white">
          Carivent<span className="text-black">.</span>
        </Link>
        <div className="relative z-10 space-y-4">
          <h1 className="text-4xl font-bold leading-tight text-white">
            Crea experiencias memorables
          </h1>
          <p className="text-white/80 text-lg max-w-md">
            Explora eventos sin cuenta. Solo te pediremos iniciar sesión al comprar o si lo eliges tú.
          </p>
        </div>
        <p className="relative z-10 text-xs text-white/50">© Carivent</p>
      </div>
      <div className="flex flex-col justify-center bg-black px-6 py-12 md:px-12">
        <div className="mx-auto w-full max-w-md">
          <Link to="/" className="mb-8 inline-block text-sm text-zinc-500 hover:text-brand md:hidden">
            ← Volver a eventos
          </Link>
          <Outlet />
        </div>
      </div>
    </div>
  );
}
