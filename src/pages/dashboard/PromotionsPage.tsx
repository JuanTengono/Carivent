import { useCallback, useEffect, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { useToast, type ToastKind } from "../../context/ToastContext";
import { PermissionGuard } from "../../components/PermissionGuard";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { Modal } from "../../components/ui/Modal";
import { usePermission } from "../../hooks/usePermission";
import { ApiRequestError } from "../../lib/api";
import {
  createPromotionApi,
  deletePromotionApi,
  fetchEventsList,
  fetchPromotions,
  updatePromotionApi,
  type EventOption,
  type PromotionRow,
} from "../../lib/dashboardApi";
import { formatCop } from "../../lib/format";

export function PromotionsPage() {
  return (
    <PermissionGuard permission="READ_PROMOTIONS">
      <PromotionsContent />
    </PermissionGuard>
  );
}

function PromotionsContent() {
  const { token } = useAuth();
  const { push } = useToast();
  const { can } = usePermission();
  const [rows, setRows] = useState<PromotionRow[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [events, setEvents] = useState<EventOption[]>([]);
  const [modal, setModal] = useState<"create" | "edit" | null>(null);
  const [editing, setEditing] = useState<PromotionRow | null>(null);

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await fetchPromotions(token, { page, limit: 15, search: search.trim() || undefined });
      setRows(res.data);
      setTotalPages(res.pagination.totalPages || 1);
    } catch (e) {
      push(e instanceof ApiRequestError ? e.message : "Error al cargar promociones", "error");
    } finally {
      setLoading(false);
    }
  }, [token, page, search, push]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!token || !can("READ_EVENTS")) return;
    let cancelled = false;
    void fetchEventsList(token).then((ev) => {
      if (!cancelled) setEvents(ev);
    });
    return () => {
      cancelled = true;
    };
  }, [token, can]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Promociones</h1>
          <p className="mt-1 text-sm text-zinc-400">Códigos de descuento y campañas.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <div className="w-full max-w-xs">
            <Input placeholder="Buscar…" value={searchInput} onChange={(e) => setSearchInput(e.target.value)} />
          </div>
          <Button
            type="button"
            variant="secondary"
            onClick={() => {
              setSearch(searchInput.trim());
              setPage(1);
            }}
          >
            Buscar
          </Button>
          {can("CREATE_PROMOTION") ? (
            <Button
              type="button"
              onClick={() => {
                setEditing(null);
                setModal("create");
              }}
            >
              + Nueva promoción
            </Button>
          ) : null}
        </div>
      </div>

      {loading ? (
        <div className="h-48 animate-pulse rounded-2xl bg-zinc-900/80" />
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-white/10">
          <table className="w-full min-w-[800px] text-left text-sm">
            <thead className="bg-surface-elevated text-xs uppercase text-zinc-500">
              <tr>
                <th className="px-4 py-3">Código</th>
                <th className="px-4 py-3">Título</th>
                <th className="px-4 py-3">Tipo</th>
                <th className="px-4 py-3">Valor</th>
                <th className="px-4 py-3">Evento</th>
                <th className="px-4 py-3">Activa</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-zinc-300">
              {rows.map((r) => (
                <tr key={r.id} className="hover:bg-white/[0.03]">
                  <td className="px-4 py-3 font-mono text-xs font-semibold text-brand">{r.code}</td>
                  <td className="max-w-[200px] truncate px-4 py-3">{r.title}</td>
                  <td className="px-4 py-3">{r.discountType}</td>
                  <td className="px-4 py-3">
                    {r.discountType === "PERCENT" ? `${r.discountValue}%` : formatCop(Number(r.discountValue))}
                  </td>
                  <td className="px-4 py-3 text-xs">{r.event?.name ?? "—"}</td>
                  <td className="px-4 py-3">{r.isActive ? "Sí" : "No"}</td>
                  <td className="space-x-2 px-4 py-3">
                    {can("UPDATE_PROMOTION") ? (
                      <Button
                        variant="outline"
                        className="!py-1 !text-xs"
                        type="button"
                        onClick={() => {
                          setEditing(r);
                          setModal("edit");
                        }}
                      >
                        Editar
                      </Button>
                    ) : null}
                    {can("DELETE_PROMOTION") ? (
                      <Button
                        variant="danger"
                        className="!py-1 !text-xs"
                        type="button"
                        onClick={() => {
                          if (!token || !window.confirm("¿Eliminar esta promoción?")) return;
                          void deletePromotionApi(token, r.id)
                            .then(() => {
                              push("Promoción eliminada", "success");
                              void load();
                            })
                            .catch((e) =>
                              push(e instanceof ApiRequestError ? e.message : "Error", "error")
                            );
                        }}
                      >
                        Eliminar
                      </Button>
                    ) : null}
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

      <PromotionFormModal
        open={modal !== null}
        mode={modal === "edit" ? "edit" : "create"}
        initial={editing}
        events={events}
        token={token}
        onClose={() => {
          setModal(null);
          setEditing(null);
        }}
        onSaved={() => {
          setModal(null);
          setEditing(null);
          void load();
        }}
        push={push}
      />
    </div>
  );
}

function PromotionFormModal({
  open,
  mode,
  initial,
  events,
  token,
  onClose,
  onSaved,
  push,
}: {
  open: boolean;
  mode: "create" | "edit";
  initial: PromotionRow | null;
  events: EventOption[];
  token: string | null;
  onClose: () => void;
  onSaved: () => void;
  push: (m: string, k?: ToastKind) => void;
}) {
  const [code, setCode] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [discountType, setDiscountType] = useState<"PERCENT" | "FIXED">("PERCENT");
  const [discountValue, setDiscountValue] = useState("");
  const [minQuantity, setMinQuantity] = useState("1");
  const [maxUses, setMaxUses] = useState("");
  const [validFrom, setValidFrom] = useState("");
  const [validTo, setValidTo] = useState("");
  const [eventId, setEventId] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (mode === "edit" && initial) {
      setCode(initial.code);
      setTitle(initial.title);
      setDescription(initial.description ?? "");
      setDiscountType(initial.discountType);
      setDiscountValue(String(initial.discountValue));
      setMinQuantity(String(initial.minQuantity ?? 1));
      setMaxUses(initial.maxUses != null ? String(initial.maxUses) : "");
      setValidFrom(initial.validFrom ? toLocalInput(initial.validFrom) : "");
      setValidTo(initial.validTo ? toLocalInput(initial.validTo) : "");
      setEventId(initial.eventId != null ? String(initial.eventId) : "");
      setIsActive(initial.isActive);
    } else {
      setCode("");
      setTitle("");
      setDescription("");
      setDiscountType("PERCENT");
      setDiscountValue("");
      setMinQuantity("1");
      setMaxUses("");
      setValidFrom("");
      setValidTo("");
      setEventId("");
      setIsActive(true);
    }
  }, [open, mode, initial]);

  const submit = async () => {
    if (!token) return;
    const dv = Number(discountValue);
    if (!Number.isFinite(dv) || dv <= 0) {
      push("Valor de descuento inválido", "error");
      return;
    }
    setSaving(true);
    try {
      if (mode === "create") {
        await createPromotionApi(token, {
          code: code.trim().toUpperCase(),
          title: title.trim(),
          description: description.trim() || undefined,
          discountType,
          discountValue: dv,
          minQuantity: Number(minQuantity) || 1,
          maxUses: maxUses.trim() ? Number(maxUses) : undefined,
          validFrom: validFrom ? new Date(validFrom).toISOString() : undefined,
          validTo: validTo ? new Date(validTo).toISOString() : undefined,
          eventId: eventId.trim() ? Number(eventId) : undefined,
          isActive,
        });
        push("Promoción creada", "success");
      } else if (initial) {
        await updatePromotionApi(token, initial.id, {
          title: title.trim(),
          description: description.trim() || null,
          discountType,
          discountValue: dv,
          minQuantity: Number(minQuantity) || 1,
          maxUses: maxUses.trim() ? Number(maxUses) : null,
          validFrom: validFrom ? new Date(validFrom).toISOString() : null,
          validTo: validTo ? new Date(validTo).toISOString() : null,
          isActive,
        });
        push("Promoción actualizada", "success");
      }
      onSaved();
    } catch (e) {
      push(e instanceof ApiRequestError ? e.message : "Error al guardar", "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      title={mode === "create" ? "Nueva promoción" : `Editar: ${initial?.code ?? ""}`}
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" type="button" onClick={onClose} disabled={saving}>
            Cancelar
          </Button>
          <Button type="button" onClick={() => void submit()} disabled={saving}>
            {saving ? "Guardando…" : "Guardar"}
          </Button>
        </>
      }
    >
      <div className="space-y-3">
        {mode === "create" ? (
          <div>
            <label className="mb-1 block text-xs text-zinc-500">Código</label>
            <Input value={code} onChange={(e) => setCode(e.target.value)} placeholder="DESC10" />
          </div>
        ) : null}
        <div>
          <label className="mb-1 block text-xs text-zinc-500">Título</label>
          <Input value={title} onChange={(e) => setTitle(e.target.value)} />
        </div>
        <div>
          <label className="mb-1 block text-xs text-zinc-500">Descripción</label>
          <textarea
            className="w-full rounded-xl border border-white/10 bg-surface px-4 py-3 text-sm text-white outline-none focus:border-brand"
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs text-zinc-500">Tipo</label>
            <select
              className="w-full rounded-xl border border-white/10 bg-surface px-4 py-3 text-sm text-white"
              value={discountType}
              onChange={(e) => setDiscountType(e.target.value as "PERCENT" | "FIXED")}
            >
              <option value="PERCENT">Porcentaje</option>
              <option value="FIXED">Monto fijo</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs text-zinc-500">Valor</label>
            <Input value={discountValue} onChange={(e) => setDiscountValue(e.target.value)} type="number" step="0.01" />
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs text-zinc-500">Cantidad mínima</label>
            <Input value={minQuantity} onChange={(e) => setMinQuantity(e.target.value)} type="number" min={1} />
          </div>
          <div>
            <label className="mb-1 block text-xs text-zinc-500">Máx. usos (opcional)</label>
            <Input value={maxUses} onChange={(e) => setMaxUses(e.target.value)} type="number" min={1} />
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs text-zinc-500">Válido desde</label>
            <Input type="datetime-local" value={validFrom} onChange={(e) => setValidFrom(e.target.value)} />
          </div>
          <div>
            <label className="mb-1 block text-xs text-zinc-500">Válido hasta</label>
            <Input type="datetime-local" value={validTo} onChange={(e) => setValidTo(e.target.value)} />
          </div>
        </div>
        {mode === "create" && events.length > 0 ? (
          <div>
            <label className="mb-1 block text-xs text-zinc-500">Evento (opcional)</label>
            <select
              className="w-full rounded-xl border border-white/10 bg-surface px-4 py-3 text-sm text-white"
              value={eventId}
              onChange={(e) => setEventId(e.target.value)}
            >
              <option value="">— Ninguno —</option>
              {events.map((ev) => (
                <option key={ev.id} value={ev.id}>
                  {ev.name}
                </option>
              ))}
            </select>
          </div>
        ) : null}
        <label className="flex items-center gap-2 text-sm text-zinc-300">
          <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />
          Activa
        </label>
      </div>
    </Modal>
  );
}

function toLocalInput(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
