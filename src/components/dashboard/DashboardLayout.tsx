import { useState, type ReactNode } from "react";
import { Link, NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { usePermission } from "../../hooks/usePermission";
import { Button } from "../ui/Button";

type NavItem = { to: string; label: string; permission?: string; end?: boolean };

const NAV_ITEMS: NavItem[] = [
  { to: "/app", label: "Inicio", end: true },
  { to: "/app/eventos", label: "Eventos", permission: "READ_EVENTS" },
  { to: "/app/sitios", label: "Sitios", permission: "READ_SITES" },
  { to: "/app/agendas", label: "Agendas", permission: "READ_AGENDAS" },
  { to: "/app/encuestas", label: "Encuestas", permission: "READ_SURVEYS" },
  { to: "/app/seguridad", label: "Seguridad" },
  { to: "/app/pagos", label: "Pagos", permission: "READ_PAYMENTS" },
  { to: "/app/promociones", label: "Promociones", permission: "READ_PROMOTIONS" },
  { to: "/app/notificaciones", label: "Notificaciones", permission: "READ_NOTIFICATIONS" },
];

function navClass(active: boolean) {
  return `flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
    active ? "bg-brand-muted text-brand" : "text-zinc-400 hover:bg-white/5 hover:text-white"
  }`;
}

export function DashboardLayout() {
  const { user, logout } = useAuth();
  const { can } = usePermission();
  const navigate = useNavigate();
  const [drawerOpen, setDrawerOpen] = useState(false);

  const visibleNav = NAV_ITEMS.filter((item) => {
    if (!item.permission) {
      return true;
    }
    return can(item.permission);
  });

  const linkContent = (item: NavItem) => (
    <NavLink
      key={item.to}
      to={item.to}
      end={Boolean(item.end)}
      className={({ isActive }) => navClass(isActive)}
      onClick={() => setDrawerOpen(false)}
    >
      {item.label}
    </NavLink>
  );

  const sidebar: ReactNode = (
    <aside className="flex w-64 shrink-0 flex-col border-r border-white/10 bg-surface/90 p-4">
      <Link to="/" className="mb-6 flex items-center gap-2 px-2 text-sm font-semibold text-zinc-500 hover:text-brand">
        ← Volver al sitio público
      </Link>
      <p className="mb-2 px-2 text-xs font-semibold uppercase tracking-wider text-zinc-500">Panel</p>
      <nav className="flex flex-col gap-1">{visibleNav.map((item) => linkContent(item))}</nav>
      <div className="mt-auto border-t border-white/10 pt-4">
        <p className="truncate px-2 text-xs text-zinc-500">{user?.email}</p>
        <p className="truncate px-2 text-sm font-medium text-white">{user?.name}</p>
        <Button
          variant="danger"
          className="mt-3 w-full !py-2"
          type="button"
          onClick={() => void logout().then(() => navigate("/"))}
        >
          Cerrar sesión
        </Button>
      </div>
    </aside>
  );

  return (
    <div className="flex min-h-screen bg-black">
      <div className="hidden md:flex">{sidebar}</div>

      {drawerOpen ? (
        <div className="fixed inset-0 z-50 md:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-black/70"
            aria-label="Cerrar menú"
            onClick={() => setDrawerOpen(false)}
          />
          <div className="absolute left-0 top-0 h-full w-64 shadow-card">{sidebar}</div>
        </div>
      ) : null}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between gap-4 border-b border-white/10 bg-black/80 px-4 py-3 backdrop-blur md:hidden">
          <button
            type="button"
            className="rounded-lg border border-white/10 px-3 py-2 text-sm text-white"
            onClick={() => setDrawerOpen(true)}
          >
            Menú
          </button>
          <span className="font-semibold text-white">Carivent</span>
          <span className="w-14" />
        </header>
        <div className="flex-1 overflow-auto p-4 md:p-8">
          <div className="mx-auto max-w-7xl">
            <Outlet />
          </div>
        </div>
      </div>
    </div>
  );
}
