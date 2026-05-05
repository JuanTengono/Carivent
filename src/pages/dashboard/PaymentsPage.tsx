import { useCallback, useEffect, useState, type ReactNode } from "react";
import { useAuth } from "../../context/AuthContext";
import { useToast, type ToastKind } from "../../context/ToastContext";
import { PermissionGuard } from "../../components/PermissionGuard";
import { Button } from "../../components/ui/Button";
import { Modal } from "../../components/ui/Modal";
import { usePermission } from "../../hooks/usePermission";
import { ApiRequestError } from "../../lib/api";
import {
  confirmPaymentApi,
  failPaymentApi,
  fetchPaymentDetail,
  fetchPayments,
  type PaymentRow,
} from "../../lib/dashboardApi";
import { formatCop } from "../../lib/format";

function money(v: string | number | undefined) {
  if (v === undefined || v === null) return "—";
  return formatCop(Number(v));
}

export function PaymentsPage() {
  return (
    <PermissionGuard permission="READ_PAYMENTS">
      <PaymentsContent />
    </PermissionGuard>
  );
}

function PaymentsContent() {
  const { token } = useAuth();
  const { push } = useToast();
  const [rows, setRows] = useState<PaymentRow[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(true);
  const [detail, setDetail] = useState<PaymentRow | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await fetchPayments(token, {
        page,
        limit: 15,
        status: status || undefined,
      });
      setRows(res.data);
      setTotalPages(res.pagination.totalPages || 1);
    } catch (e) {
      push(e instanceof ApiRequestError ? e.message : "Error al cargar pagos", "error");
    } finally {
      setLoading(false);
    }
  }, [token, page, status, push]);

  useEffect(() => {
    void load();
  }, [load]);

  const openDetail = async (id: number) => {
    if (!token) return;
    setDetailLoading(true);
    try {
      const p = await fetchPaymentDetail(token, id);
      setDetail(p);
    } catch (e) {
      push(e instanceof ApiRequestError ? e.message : "Error al cargar detalle", "error");
    } finally {
      setDetailLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Pagos</h1>
          <p className="mt-1 text-sm text-zinc-400">Historial y confirmación de pagos pendientes.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <select
            className="rounded-xl border border-white/10 bg-surface px-3 py-2 text-sm text-white"
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setPage(1);
            }}
          >
            <option value="">Todos los estados</option>
            <option value="PENDING">PENDING</option>
            <option value="PAID">PAID</option>
            <option value="FAILED">FAILED</option>
            <option value="REFUNDED">REFUNDED</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="h-48 animate-pulse rounded-2xl bg-zinc-900/80" />
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-white/10">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="bg-surface-elevated text-xs uppercase text-zinc-500">
              <tr>
                <th className="px-4 py-3">ID</th>
                <th className="px-4 py-3">Usuario</th>
                <th className="px-4 py-3">Evento</th>
                <th className="px-4 py-3">Total</th>
                <th className="px-4 py-3">Estado</th>
                <th className="px-4 py-3">Fecha</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-zinc-300">
              {rows.map((r) => (
                <tr key={r.id} className="hover:bg-white/[0.03]">
                  <td className="px-4 py-3 font-mono text-xs">{r.id}</td>
                  <td className="px-4 py-3">{r.user?.name ?? "—"}</td>
                  <td className="max-w-[180px] truncate px-4 py-3">{r.event?.name ?? "—"}</td>
                  <td className="px-4 py-3 font-medium text-white">{money(r.totalAmount)}</td>
                  <td className="px-4 py-3">
                    <StatusBadge status={r.status} />
                  </td>
                  <td className="px-4 py-3 text-xs text-zinc-500">{new Date(r.createdAt).toLocaleString("es-CO")}</td>
                  <td className="px-4 py-3">
                    <Button variant="outline" className="!py-1 !text-xs" type="button" onClick={() => void openDetail(r.id)}>
                      Ver
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {totalPages > 1 ? (
        <div className="flex justify-center gap-2">
          <Button variant="secondary" disabled={page <= 1} type="button" onClick={() => setPage((p) => p - 1)}>
            Anterior
          </Button>
          <span className="flex items-center text-sm text-zinc-500">
            {page} / {totalPages}
          </span>
          <Button
            variant="secondary"
            disabled={page >= totalPages}
            type="button"
            onClick={() => setPage((p) => p + 1)}
          >
            Siguiente
          </Button>
        </div>
      ) : null}

      <PaymentDetailModal
        payment={detail}
        loading={detailLoading}
        onClose={() => setDetail(null)}
        token={token}
        onActionDone={() => {
          setDetail(null);
          void load();
        }}
        push={push}
        actionLoading={actionLoading}
        setActionLoading={setActionLoading}
      />
    </div>
  );
}

function PaymentDetailModal({
  payment,
  loading,
  onClose,
  token,
  onActionDone,
  push,
  actionLoading,
  setActionLoading,
}: {
  payment: PaymentRow | null;
  loading: boolean;
  onClose: () => void;
  token: string | null;
  onActionDone: () => void;
  push: (m: string, k?: ToastKind) => void;
  actionLoading: boolean;
  setActionLoading: (v: boolean) => void;
}) {
  const { can } = usePermission();
  const updatePayment = can("UPDATE_PAYMENT");

  const run = async (action: "confirm" | "fail") => {
    if (!token || !payment) return;
    setActionLoading(true);
    try {
      if (action === "confirm") await confirmPaymentApi(token, payment.id);
      else await failPaymentApi(token, payment.id);
      push(action === "confirm" ? "Pago confirmado" : "Pago marcado como fallido", "success");
      onActionDone();
    } catch (e) {
      push(e instanceof ApiRequestError ? e.message : "Error", "error");
    } finally {
      setActionLoading(false);
    }
  };

  if (!payment) return null;

  return (
    <Modal
      open
      title={`Pago #${payment.id}`}
      onClose={onClose}
      footer={
        payment.status === "PENDING" && updatePayment ? (
          <>
            <Button variant="secondary" type="button" disabled={actionLoading} onClick={onClose}>
              Cerrar
            </Button>
            <Button variant="danger" type="button" disabled={actionLoading} onClick={() => void run("fail")}>
              Fallar
            </Button>
            <Button type="button" disabled={actionLoading} onClick={() => void run("confirm")}>
              Confirmar pago
            </Button>
          </>
        ) : (
          <Button variant="secondary" type="button" onClick={onClose}>
            Cerrar
          </Button>
        )
      }
    >
      {loading ? (
        <p className="text-zinc-500">Cargando…</p>
      ) : (
        <div className="space-y-3 text-sm">
          <Row label="Estado" value={<StatusBadge status={payment.status} />} />
          <Row label="Total" value={money(payment.totalAmount)} />
          <Row label="Cantidad" value={String(payment.quantity)} />
          <Row label="Moneda" value={payment.currency} />
          <Row label="Usuario" value={payment.user ? `${payment.user.name} (${payment.user.email})` : "—"} />
          <Row label="Evento" value={payment.event?.name ?? "—"} />
          <Row label="Promoción" value={payment.promotion ? `${payment.promotion.code} — ${payment.promotion.title}` : "—"} />
          <Row label="Provider" value={payment.provider ?? "—"} />
          <Row label="Referencia" value={payment.reference ?? "—"} />
          <Row label="Tickets (count)" value={String(payment._count?.tickets ?? payment.tickets?.length ?? "—")} />
        </div>
      )}
    </Modal>
  );
}

function Row({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5 sm:flex-row sm:justify-between">
      <span className="text-zinc-500">{label}</span>
      <span className="text-white">{value}</span>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    PENDING: "bg-amber-500/20 text-amber-300 border-amber-500/30",
    PAID: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
    FAILED: "bg-red-500/20 text-red-300 border-red-500/30",
    REFUNDED: "bg-zinc-500/20 text-zinc-300 border-zinc-500/30",
  };
  const c = colors[status] || "bg-zinc-500/20 text-zinc-300 border-zinc-500/30";
  return (
    <span className={`inline-block rounded-lg border px-2 py-0.5 text-xs font-semibold ${c}`}>{status}</span>
  );
}
