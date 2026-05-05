import { useEffect, useRef, useState } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import gsap from "gsap";
import { useAuth } from "../../context/AuthContext";
import { Button } from "../ui/Button";

export function PublicHeader() {
  const rootRef = useRef<HTMLElement>(null);
  const { isAuthenticated, user, logout } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  const returnUrl = encodeURIComponent(`${window.location.pathname}${window.location.search}`);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      return;
    }

    const ctx = gsap.context(() => {
      gsap.from("[data-header-item]", {
        opacity: 0,
        y: -16,
        duration: 0.45,
        stagger: 0.08,
        ease: "power3.out",
      });
    }, rootRef);

    return () => ctx.revert();
  }, []);

  return (
    <header ref={rootRef} className="sticky top-0 z-50 border-b border-white/10 bg-black/80 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
        <Link to="/" data-header-item className="flex items-center gap-2 font-bold tracking-tight">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-brand text-sm text-black">
            C
          </span>
          <span className="text-lg text-white">
            Carivent<span className="text-brand">.</span>
          </span>
        </Link>

        <nav data-header-item className="hidden items-center gap-6 md:flex">
          <NavLink
            to="/"
            className={({ isActive }) =>
              `text-sm font-medium transition ${isActive ? "text-brand" : "text-zinc-400 hover:text-white"}`
            }
            end
          >
            Eventos
          </NavLink>
          {isAuthenticated ? (
            <NavLink
              to="/mis-tickets"
              className={({ isActive }) =>
                `text-sm font-medium transition ${isActive ? "text-brand" : "text-zinc-400 hover:text-white"}`
              }
            >
              Mis tickets
            </NavLink>
          ) : null}
        </nav>

        <div data-header-item className="flex items-center gap-2">
          {isAuthenticated ? (
            <Link
              to="/app"
              className="hidden rounded-xl border border-white/10 px-3 py-2 text-sm text-zinc-300 hover:border-brand/40 hover:text-white sm:inline-block"
            >
              Panel
            </Link>
          ) : null}
          {isAuthenticated ? (
            <div className="relative">
              <button
                type="button"
                onClick={() => setMenuOpen((v) => !v)}
                className="flex items-center gap-2 rounded-xl border border-white/10 bg-surface px-3 py-2 text-sm text-white hover:border-white/20"
              >
                <span className="max-w-[140px] truncate">{user?.name}</span>
                <span className="text-zinc-500">▾</span>
              </button>
              {menuOpen ? (
                <>
                  <button
                    type="button"
                    className="fixed inset-0 z-40 cursor-default bg-transparent"
                    aria-label="Cerrar menú"
                    onClick={() => setMenuOpen(false)}
                  />
                  <div className="absolute right-0 z-50 mt-2 min-w-[180px] rounded-xl border border-white/10 bg-surface-elevated py-1 shadow-card">
                    <Link
                      to="/mis-tickets"
                      className="block px-4 py-2 text-sm text-zinc-200 hover:bg-white/5"
                      onClick={() => setMenuOpen(false)}
                    >
                      Mis tickets
                    </Link>
                    <Link
                      to="/app"
                      className="block px-4 py-2 text-sm text-zinc-200 hover:bg-white/5 sm:hidden"
                      onClick={() => setMenuOpen(false)}
                    >
                      Ir al panel
                    </Link>
                    <button
                      type="button"
                      className="block w-full px-4 py-2 text-left text-sm text-zinc-200 hover:bg-white/5"
                      onClick={() => {
                        setMenuOpen(false);
                        void logout().then(() => navigate("/"));
                      }}
                    >
                      Cerrar sesión
                    </button>
                  </div>
                </>
              ) : null}
            </div>
          ) : (
            <Link to={`/login?returnUrl=${returnUrl}`}>
              <Button data-header-item variant="outline" className="!py-2 !text-xs md:!text-sm">
                Iniciar sesión
              </Button>
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
