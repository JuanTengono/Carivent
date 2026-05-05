import { useCallback, useEffect, useState } from "react";
import QRCode from "qrcode";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { PermissionGuard } from "../components/PermissionGuard";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { Modal } from "../components/ui/Modal";
import { usePermission } from "../hooks/usePermission";
import { usePageReveal } from "../hooks/usePageReveal";
import { ApiRequestError } from "../lib/api";
import { formatDateTime } from "../lib/format";
import {
  cancelTicketApi,
  fetchTicketCapacitySummary,
  fetchTickets,
  validateTicketByCode,
  type TicketRow,
} from "../lib/ticketsManagementApi";
import type { CapacitySnapshot } from "../lib/eventsApi";

export function MyTicketsPage() {
  return (
    <PermissionGuard permission="READ_TICKETS">
      <MyTicketsContent />
    </PermissionGuard>
  );
}

function MyTicketsContent() {
  const { token } = useAuth();
  const { can } = usePermission();
  const { push } = useToast();
  const revealRef = usePageReveal([]);
  const [rows, setRows] = useState<TicketRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [qrTarget, setQrTarget] = useState<TicketRow | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [validateCode, setValidateCode] = useState("");
  const [validateLoading, setValidateLoading] = useState(false);
  const [capacityModal, setCapacityModal] = useState<{ eventId: number; name: string } | null>(null);
  const [capacityData, setCapacityData] = useState<CapacitySnapshot | null>(null);
  const [capacityLoading, setCapacityLoading] = useState(false);

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await fetchTickets(token, { all: true, limit: 200 });
      setRows(res.data);
    } catch (e) {
      push(e instanceof ApiRequestError ? e.message : "Error al cargar tickets", "error");
    } finally {
      setLoading(false);
    }
  }, [token, push]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!qrTarget?.codeQr) {
      setQrDataUrl(null);
      return;
    }
    let cancelled = false;
    void QRCode.toDataURL(qrTarget.codeQr, { margin: 2, width: 240, color: { dark: "#000000", light: "#ffffff" } }).then(
      (url) => {
        if (!cancelled) setQrDataUrl(url);
      }
    );
    return () => {
      cancelled = true;
    };
  }, [qrTarget]);

  const downloadTicket = (t: TicketRow) => {
    const lines = [
      `Carivent · Ticket`,
      `Evento: ${t.event?.name ?? "—"}`,
      `Código: ${t.codeQr}`,
      `Estado: ${t.status}`,
      `Inicio: ${t.event?.startTime ? formatDateTime(t.event.startTime) : "—"}`,
    ];
    const blob = new Blob([lines.join("\n")], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `ticket-${t.id}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    push("Descarga iniciada", "success");
  };

  const onCancel = async (t: TicketRow) => {
    if (!token) return;
    if (!window.confirm("¿Cancelar este ticket?")) return;
    try {
      await cancelTicketApi(token, t.id);
      push("Ticket cancelado", "success");
      void load();
    } catch (e) {
      push(e instanceof ApiRequestError ? e.message : "No se pudo cancelar", "error");
    }
  };

  const onValidate = async () => {
    if (!token || !validateCode.trim()) return;
    setValidateLoading(true);
    try {
      await validateTicketByCode(token, validateCode.trim());
      push("Boleta validada correctamente", "success");
      setValidateCode("");
      void load();
    } catch (e) {
      push(e instanceof ApiRequestError ? e.message : "No se pudo validar", "error");
    } finally {
      setValidateLoading(false);
    }
  };

  const openCapacity = async (eventId: number, name: string) => {
    if (!token) return;
    setCapacityModal({ eventId, name });
    setCapacityLoading(true);
    setCapacityData(null);
    try {
      const d = await fetchTicketCapacitySummary(token, eventId);
      setCapacityData(d);
    } catch (e) {
      push(e instanceof ApiRequestError ? e.message : "Error al cargar capacidad", "error");
      setCapacityModal(null);
    } finally {
      setCapacityLoading(false);
    }
  };

  return (
    <div ref={revealRef} className="mx-auto max-w-4xl space-y-8 px-4 py-8">
      <div data-reveal>
        <h1 className="text-2xl font-bold text-white">Mis tickets</h1>
        <p className="mt-1 text-sm text-zinc-400">Accede a tus códigos QR y gestiona tus boletas.</p>
      </div>

      {can("VALIDATE_TICKET") ? (
        <section
          data-reveal
          className="rounded-2xl border border-brand/25 bg-brand-muted/30 p-4 md:flex md:items-end md:gap-4"
        >
          <div className="min-w-0 flex-1">
            <h2 className="text-sm font-semibold text-white">Validación de ingreso (staff)</h2>
            <p className="mt-1 text-xs text-zinc-500">Escanea o pega el código QR del asistente.</p>
            <Input
              className="mt-3"
              placeholder="Código QR"
              value={validateCode}
              onChange={(e) => setValidateCode(e.target.value)}
            />
          </div>
          <Button className="mt-3 w-full md:mt-0 md:w-auto" type="button" disabled={validateLoading} onClick={() => void onValidate()}>
            {validateLoading ? "Validando…" : "Validar"}
          </Button>
        </section>
      ) : null}

      {loading ? (
        <div className="h-40 animate-pulse rounded-2xl bg-zinc-900/80" />
      ) : rows.length === 0 ? (
        <div data-reveal className="rounded-2xl border border-dashed border-white/15 p-12 text-center text-zinc-400">
          Aún no tienes tickets.{" "}
          <Link to="/" className="text-brand hover:underline">
            Explorar eventos
          </Link>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {rows.map((t) => (
            <article
              key={t.id}
              data-reveal
              className="flex flex-col rounded-2xl border border-white/10 bg-surface/90 p-5 shadow-card"
            >
              <div className="flex justify-between gap-2">
                <div>
                  <h2 className="font-semibold text-white">{t.event?.name ?? `Evento #${t.eventId}`}</h2>
                  <p className="mt-1 text-xs text-zinc-500">{t.event?.startTime ? formatDateTime(t.event.startTime) : ""}</p>
                </div>
                <span className="h-fit rounded-lg bg-white/10 px-2 py-1 text-xs uppercase text-zinc-300">{t.status}</span>
              </div>
              <p className="mt-3 font-mono text-xs text-zinc-500 break-all">{t.codeQr}</p>
              <div className="mt-4 flex flex-wrap gap-2">
                <Button variant="outline" className="!py-1.5 !text-xs" type="button" onClick={() => setQrTarget(t)}>
                  Ver QR
                </Button>
                <Button variant="ghost" className="!py-1.5 !text-xs" type="button" onClick={() => downloadTicket(t)}>
                  Descargar
                </Button>
                {can("READ_EVENTS") && t.eventId ? (
                  <Button
                    variant="ghost"
                    className="!py-1.5 !text-xs"
                    type="button"
                    onClick={() => void openCapacity(t.eventId, t.event?.name ?? "")}
                  >
                    Capacidad evento
                  </Button>
                ) : null}
                {can("UPDATE_TICKET") && ["ACTIVE", "PURCHASED"].includes(t.status) && !t.validated ? (
                  <Button variant="ghost" className="!py-1.5 !text-xs text-red-400" type="button" onClick={() => void onCancel(t)}>
                    Cancelar
                  </Button>
                ) : null}
              </div>
            </article>
          ))}
        </div>
      )}

      <Modal open={Boolean(qrTarget)} title="Código QR" onClose={() => setQrTarget(null)}>
        {qrDataUrl ? (
          <div className="flex flex-col items-center gap-4">
            <img src={qrDataUrl} alt="QR" className="rounded-xl bg-white p-3" />
            <p className="text-center font-mono text-xs text-zinc-500">{qrTarget?.codeQr}</p>
          </div>
        ) : (
          <p className="text-zinc-500">Generando…</p>
        )}
      </Modal>

      <Modal open={Boolean(capacityModal)} title={capacityModal ? `Aforo · ${capacityModal.name}` : "Aforo"} onClose={() => setCapacityModal(null)}>
        {capacityLoading ? (
          <div className="h-24 animate-pulse rounded-xl bg-zinc-900/80" />
        ) : capacityData ? (
          <div className="grid grid-cols-2 gap-2 text-sm">
            <Stat label="Capacidad" value={capacityData.counters.totalCapacity} accent />
            <Stat label="Disponibles" value={capacityData.counters.available} />
            <Stat label="Vendidos" value={capacityData.counters.sold} />
            <Stat label="Usados" value={capacityData.counters.used} />
          </div>
        ) : null}
      </Modal>
    </div>
  );
}

function Stat({ label, value, accent }: { label: string; value: number | string; accent?: boolean }) {
  return (
    <div className={`rounded-xl border border-white/10 px-3 py-2 ${accent ? "border-brand/40 bg-brand-muted/40" : ""}`}>
      <p className="text-xs text-zinc-500">{label}</p>
      <p className={`text-lg font-semibold ${accent ? "text-brand" : "text-white"}`}>{value}</p>
    </div>
  );
}
