import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { usePermission } from "../../hooks/usePermission";
import { ApiRequestError } from "../../lib/api";
import { formatCop } from "../../lib/format";
import { fetchDashboardSummary, type DashboardSummary } from "../../lib/dashboardApi";

export function DashboardHomePage() {
  const { token } = useAuth();
  const { can } = usePermission();
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    if (!token || !can("READ_EVENTS")) {
      setSummary(null);
      setLoadError(null);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const data = await fetchDashboardSummary(token);
        if (!cancelled) {
          setSummary(data);
          setLoadError(null);
        }
      } catch (e) {
        if (!cancelled) {
          const msg = e instanceof ApiRequestError ? e.message : "No se pudo cargar el resumen";
          setLoadError(msg);
          setSummary(null);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token, can]);

  const s = summary?.summary;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-white">Inicio</h1>
        <p className="mt-1 text-sm text-zinc-400">
          Resumen de tu actividad. Los módulos visibles en el menú dependen de tus permisos.
        </p>
      </div>

      {can("READ_EVENTS") ? (
        loadError ? (
          <p className="rounded-xl border border-red-500/30 bg-red-950/30 p-4 text-sm text-red-200">{loadError}</p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard label="Ingresos (periodo)" value={s?.revenue != null ? formatCop(Number(s.revenue)) : "—"} />
            <StatCard label="Tickets vendidos" value={s?.soldTickets != null ? String(s.soldTickets) : "—"} />
            <StatCard label="Eventos activos" value={s?.activeEvents != null ? String(s.activeEvents) : "—"} />
            <StatCard label="Moneda" value={s?.currency ?? "COP"} accent />
          </div>
        )
      ) : (
        <p className="rounded-xl border border-white/10 bg-surface p-4 text-sm text-zinc-400">
          No tienes permiso de lectura de eventos para ver métricas agregadas. Usa el menú lateral para ir a Pagos,
          Promociones o Notificaciones.
        </p>
      )}

      <div className="rounded-2xl border border-white/10 bg-surface p-6">
        <h2 className="mb-4 text-lg font-semibold text-white">Accesos rápidos</h2>
        <div className="flex flex-wrap gap-3">
          {can("READ_PAYMENTS") ? (
            <QuickLink to="/app/pagos">Pagos</QuickLink>
          ) : null}
          {can("READ_PROMOTIONS") ? (
            <QuickLink to="/app/promociones">Promociones</QuickLink>
          ) : null}
          {can("READ_NOTIFICATIONS") ? (
            <QuickLink to="/app/notificaciones">Notificaciones</QuickLink>
          ) : null}
          {!can("READ_PAYMENTS") && !can("READ_PROMOTIONS") && !can("READ_NOTIFICATIONS") ? (
            <span className="text-sm text-zinc-500">No hay módulos adicionales asignados a tu rol.</span>
          ) : null}
        </div>
      </div>

      {summary?.monthlyRevenue && summary.monthlyRevenue.length > 0 ? (
        <div className="rounded-2xl border border-white/10 bg-surface p-6">
          <h2 className="mb-4 text-lg font-semibold text-white">Ingresos por mes</h2>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[480px] text-left text-sm">
              <thead>
                <tr className="border-b border-white/10 text-zinc-500">
                  <th className="pb-2 pr-4">Mes</th>
                  <th className="pb-2 pr-4">Ingresos</th>
                  <th className="pb-2">Tickets</th>
                </tr>
              </thead>
              <tbody>
                {summary.monthlyRevenue.map((row) => (
                  <tr key={`${row.year}-${row.month}`} className="border-b border-white/5 text-zinc-300">
                    <td className="py-2 pr-4">
                      {row.label} {row.year}
                    </td>
                    <td className="py-2 pr-4">{formatCop(Number(row.revenue || 0))}</td>
                    <td className="py-2">{row.soldTickets}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function StatCard({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div
      className={`rounded-2xl border p-5 ${
        accent ? "border-brand/40 bg-brand-muted" : "border-white/10 bg-surface-elevated"
      }`}
    >
      <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">{label}</p>
      <p className="mt-2 text-2xl font-bold text-white">{value}</p>
    </div>
  );
}

function QuickLink({ to, children }: { to: string; children: string }) {
  return (
    <Link
      to={to}
      className="rounded-xl border border-brand/40 bg-brand-muted px-4 py-2 text-sm font-semibold text-brand hover:bg-brand/25"
    >
      {children}
    </Link>
  );
}
