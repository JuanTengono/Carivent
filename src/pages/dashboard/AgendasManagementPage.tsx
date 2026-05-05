import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import { PermissionGuard } from "../../components/PermissionGuard";
import { Button } from "../../components/ui/Button";
import { Modal } from "../../components/ui/Modal";
import { Input } from "../../components/ui/Input";
import { usePermission } from "../../hooks/usePermission";
import { usePageReveal } from "../../hooks/usePageReveal";
import { ApiRequestError } from "../../lib/api";
import { fetchEventsList } from "../../lib/dashboardApi";
import {
  createManagedAgenda,
  deleteManagedAgenda,
  fetchManagedAgendas,
  updateManagedAgenda,
  type CreateAgendaBody,
  type ManagedAgenda,
  type UpdateAgendaBody,
} from "../../lib/agendasManagementApi";
import { fromDatetimeLocalToIso, toDatetimeLocalValue } from "../../lib/datetimeLocal";
import { formatDateTime, formatTimeRange } from "../../lib/format";

const AGENDA_STATUSES = ["PENDING", "IN_PROGRESS", "CONFIRMED", "CANCELLED", "COMPLETED", "ARCHIVED"] as const;

export function AgendasManagementPage() {
  return (
    <PermissionGuard permission="READ_AGENDAS">
      <AgendasContent />
    </PermissionGuard>
  );
}

function AgendasContent() {
  const { token } = useAuth();
  const { can } = usePermission();
  const { push } = useToast();
  const revealRef = usePageReveal([]);
  const [rows, setRows] = useState<ManagedAgenda[]>([]);
  const [loading, setLoading] = useState(true);
  const [eventOptions, setEventOptions] = useState<{ id: number; name: string }[]>([]);
  const [filterEventId, setFilterEventId] = useState<number | "">("");
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<ManagedAgenda | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ManagedAgenda | null>(null);
  const [saving, setSaving] = useState(false);

  const [activity, setActivity] = useState("");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [eventId, setEventId] = useState("");
  const [agendaStatus, setAgendaStatus] = useState<string>("PENDING");

  const loadEvents = useCallback(async () => {
    if (!token) return;
    try {
      const list = await fetchEventsList(token);
      setEventOptions(list);
    } catch {
      setEventOptions([]);
    }
  }, [token]);

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await fetchManagedAgendas(token, {
        all: true,
        limit: 500,
        eventId: filterEventId === "" ? undefined : filterEventId,
        search: search || undefined,
      });
      setRows(res.data);
    } catch (e) {
      push(e instanceof ApiRequestError ? e.message : "Error al cargar agendas", "error");
    } finally {
      setLoading(false);
    }
  }, [token, filterEventId, search, push]);

  useEffect(() => {
    const t = window.setTimeout(() => setSearch(searchInput.trim()), 350);
    return () => window.clearTimeout(t);
  }, [searchInput]);

  useEffect(() => {
    void loadEvents();
  }, [loadEvents]);

  useEffect(() => {
    void load();
  }, [load]);

  const byDay = useMemo(() => {
    const map = new Map<string, ManagedAgenda[]>();
    for (const a of rows) {
      try {
        const d = new Date(a.startTime);
        const key = d.toISOString().slice(0, 10);
        const arr = map.get(key) ?? [];
        arr.push(a);
        map.set(key, arr);
      } catch {
        /* skip */
      }
    }
    return [...map.entries()].sort(([x], [y]) => x.localeCompare(y));
  }, [rows]);

  const resetForm = () => {
    setEditing(null);
    setActivity("");
    setStart("");
    setEnd("");
    setEventId("");
    setAgendaStatus("PENDING");
  };

  const openCreate = () => {
    resetForm();
    setFormOpen(true);
  };

  const openEdit = (a: ManagedAgenda) => {
    setEditing(a);
    setActivity(a.activity);
    setStart(toDatetimeLocalValue(a.startTime));
    setEnd(toDatetimeLocalValue(a.endTime));
    setEventId(String(a.eventId));
    setAgendaStatus(a.status);
    setFormOpen(true);
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!token) return;
    const eid = Number.parseInt(eventId, 10);
    if (!Number.isFinite(eid)) {
      push("Selecciona un evento", "error");
      return;
    }
    setSaving(true);
    try {
      if (editing) {
        const body: UpdateAgendaBody = {
          activity: activity.trim(),
          startTime: fromDatetimeLocalToIso(start),
          endTime: fromDatetimeLocalToIso(end),
          eventId: eid,
          status: agendaStatus,
        };
        await updateManagedAgenda(token, editing.id, body);
        push("Bloque actualizado", "success");
      } else {
        const body: CreateAgendaBody = {
          activity: activity.trim(),
          startTime: fromDatetimeLocalToIso(start),
          endTime: fromDatetimeLocalToIso(end),
          eventId: eid,
        };
        await createManagedAgenda(token, body);
        push("Bloque creado", "success");
      }
      setFormOpen(false);
      resetForm();
      void load();
    } catch (err) {
      push(err instanceof ApiRequestError ? err.message : "Error al guardar", "error");
    } finally {
      setSaving(false);
    }
  };

  const onDelete = async () => {
    if (!token || !deleteTarget) return;
    setSaving(true);
    try {
      await deleteManagedAgenda(token, deleteTarget.id);
      push("Bloque eliminado", "success");
      setDeleteTarget(null);
      void load();
    } catch (e) {
      push(e instanceof ApiRequestError ? e.message : "Error al eliminar", "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div ref={revealRef} className="space-y-8">
      <div data-reveal className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <h1 className="text-2xl font-bold text-white">Agendas</h1>
          <p className="mt-1 text-sm text-zinc-400">Timeline por día y bloques por evento.</p>
        </div>
        {can("CREATE_AGENDA") ? (
          <Button type="button" onClick={openCreate}>
            Nuevo bloque
          </Button>
        ) : null}
      </div>

      <div
        data-reveal
        className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-surface/60 p-4 md:flex-row md:flex-wrap md:items-end"
      >
        <div className="min-w-[200px] flex-1">
          <label className="mb-1 block text-xs text-zinc-500">Buscar actividad</label>
          <Input value={searchInput} onChange={(e) => setSearchInput(e.target.value)} placeholder="Texto…" />
        </div>
        <div>
          <label className="mb-1 block text-xs text-zinc-500">Evento</label>
          <select
            className="w-full rounded-xl border border-white/10 bg-surface px-3 py-3 text-sm text-white md:w-64"
            value={filterEventId === "" ? "" : String(filterEventId)}
            onChange={(e) => setFilterEventId(e.target.value ? Number(e.target.value) : "")}
          >
            <option value="">Todos los eventos</option>
            {eventOptions.map((ev) => (
              <option key={ev.id} value={ev.id}>
                {ev.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {loading ? (
        <div className="h-48 animate-pulse rounded-2xl bg-zinc-900/80" />
      ) : rows.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-white/15 p-12 text-center text-zinc-400">
          No hay bloques de agenda con estos filtros.
        </div>
      ) : (
        <>
          <section data-reveal className="space-y-4">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-500">Vista calendario (por día)</h2>
            <div className="space-y-6">
              {byDay.map(([day, items]) => (
                <div key={day}>
                  <p className="mb-3 text-xs font-medium text-brand">{formatDayHeading(day)}</p>
                  <div className="relative border-l border-white/10 pl-6">
                    {items.map((a) => (
                      <div key={a.id} className="relative mb-4 last:mb-0">
                        <span className="absolute -left-[25px] top-2 h-3 w-3 rounded-full bg-brand" />
                        <div className="rounded-xl border border-white/10 bg-black/40 p-4">
                          <div className="flex flex-wrap items-start justify-between gap-2">
                            <div>
                              <p className="font-medium text-white">{a.activity}</p>
                              <p className="mt-1 text-xs text-zinc-500">{formatTimeRange(a.startTime, a.endTime)}</p>
                              <p className="mt-1 text-xs text-zinc-400">{a.event?.name ?? `Evento #${a.eventId}`}</p>
                            </div>
                            <span className="rounded-lg bg-white/5 px-2 py-1 text-xs">{a.status}</span>
                          </div>
                          <div className="mt-3 flex flex-wrap gap-2">
                            {can("UPDATE_AGENDA") ? (
                              <Button variant="outline" className="!py-1 !text-xs" type="button" onClick={() => openEdit(a)}>
                                Editar
                              </Button>
                            ) : null}
                            {can("DELETE_AGENDA") ? (
                              <Button
                                variant="ghost"
                                className="!py-1 !text-xs text-red-400"
                                type="button"
                                onClick={() => setDeleteTarget(a)}
                              >
                                Eliminar
                              </Button>
                            ) : null}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section data-reveal className="overflow-x-auto rounded-2xl border border-white/10">
            <h2 className="border-b border-white/5 bg-surface-elevated px-4 py-3 text-sm font-semibold text-zinc-400">
              Tabla
            </h2>
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="text-xs uppercase text-zinc-500">
                <tr>
                  <th className="px-4 py-3">Actividad</th>
                  <th className="px-4 py-3">Horario</th>
                  <th className="px-4 py-3">Evento</th>
                  <th className="px-4 py-3">Estado</th>
                  <th className="px-4 py-3 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-zinc-300">
                {rows.map((a) => (
                  <tr key={a.id}>
                    <td className="px-4 py-3 font-medium text-white">{a.activity}</td>
                    <td className="px-4 py-3 text-xs">{formatDateTime(a.startTime)}</td>
                    <td className="px-4 py-3 text-xs">{a.event?.name ?? `#${a.eventId}`}</td>
                    <td className="px-4 py-3 text-xs">{a.status}</td>
                    <td className="px-4 py-3 text-right">
                      {can("UPDATE_AGENDA") ? (
                        <Button variant="ghost" className="!px-2 !py-1 text-xs" type="button" onClick={() => openEdit(a)}>
                          Editar
                        </Button>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        </>
      )}

      <Modal open={formOpen} title={editing ? "Editar bloque" : "Nuevo bloque"} onClose={() => setFormOpen(false)}>
        <form className="space-y-3" onSubmit={(e) => void submit(e)}>
          <div>
            <label className="mb-1 block text-xs text-zinc-500">Actividad</label>
            <Input value={activity} onChange={(e) => setActivity(e.target.value)} required minLength={3} />
          </div>
          <div>
            <label className="mb-1 block text-xs text-zinc-500">Evento</label>
            <select
              className="w-full rounded-xl border border-white/10 bg-surface px-3 py-3 text-sm text-white"
              value={eventId}
              onChange={(e) => setEventId(e.target.value)}
              required
            >
              <option value="">Seleccionar…</option>
              {eventOptions.map((ev) => (
                <option key={ev.id} value={ev.id}>
                  {ev.name}
                </option>
              ))}
            </select>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs text-zinc-500">Inicio</label>
              <Input type="datetime-local" value={start} onChange={(e) => setStart(e.target.value)} required />
            </div>
            <div>
              <label className="mb-1 block text-xs text-zinc-500">Fin</label>
              <Input type="datetime-local" value={end} onChange={(e) => setEnd(e.target.value)} required />
            </div>
          </div>
          {editing ? (
            <div>
              <label className="mb-1 block text-xs text-zinc-500">Estado</label>
              <select
                className="w-full rounded-xl border border-white/10 bg-surface px-3 py-3 text-sm text-white"
                value={agendaStatus}
                onChange={(e) => setAgendaStatus(e.target.value)}
              >
                {AGENDA_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
          ) : null}
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" type="button" onClick={() => setFormOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Guardando…" : "Guardar"}
            </Button>
          </div>
        </form>
      </Modal>

      <Modal open={Boolean(deleteTarget)} title="Eliminar bloque" onClose={() => setDeleteTarget(null)}>
        <p>¿Eliminar este bloque de la agenda?</p>
        <div className="mt-6 flex justify-end gap-2">
          <Button variant="ghost" type="button" onClick={() => setDeleteTarget(null)}>
            Cancelar
          </Button>
          <Button variant="danger" type="button" disabled={saving} onClick={() => void onDelete()}>
            Confirmar
          </Button>
        </div>
      </Modal>
    </div>
  );
}

function formatDayHeading(isoDay: string): string {
  try {
    const d = new Date(`${isoDay}T12:00:00`);
    return new Intl.DateTimeFormat("es-CO", { weekday: "long", day: "numeric", month: "long" }).format(d);
  } catch {
    return isoDay;
  }
}
