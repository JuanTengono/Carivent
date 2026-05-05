import { useCallback, useEffect, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import { PermissionGuard } from "../../components/PermissionGuard";
import { Button } from "../../components/ui/Button";
import { Modal } from "../../components/ui/Modal";
import { Input } from "../../components/ui/Input";
import { usePermission } from "../../hooks/usePermission";
import { usePageReveal } from "../../hooks/usePageReveal";
import { ApiRequestError } from "../../lib/api";
import { formatCop, formatDateTime } from "../../lib/format";
import {
  createManagedEvent,
  deleteManagedEvent,
  fetchEventCapacityAdmin,
  fetchManagedEvents,
  runAutomationJobs,
  updateManagedEvent,
  type CreateEventBody,
  type ManagedEvent,
  type UpdateEventBody,
} from "../../lib/eventsManagementApi";
import { fetchManagedSites } from "../../lib/sitesManagementApi";
import { fromDatetimeLocalToIso, toDatetimeLocalValue } from "../../lib/datetimeLocal";
import type { CapacitySnapshot } from "../../lib/eventsApi";
import { fetchAttendeesByEvent } from "../../lib/ticketsManagementApi";

const STATUSES = ["PENDING", "IN_PROGRESS", "CONFIRMED", "CANCELLED", "COMPLETED", "ARCHIVED"] as const;

export function EventsManagementPage() {
  return (
    <PermissionGuard permission="READ_EVENTS">
      <EventsManagementContent />
    </PermissionGuard>
  );
}

function EventsManagementContent() {
  const { token } = useAuth();
  const { can } = usePermission();
  const { push } = useToast();
  const revealRef = usePageReveal([]);
  const [rows, setRows] = useState<ManagedEvent[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [sites, setSites] = useState<{ id: number; name: string }[]>([]);

  const [capacityOpen, setCapacityOpen] = useState(false);
  const [capacityLoading, setCapacityLoading] = useState(false);
  const [capacityData, setCapacityData] = useState<CapacitySnapshot | null>(null);

  const [attendeesOpen, setAttendeesOpen] = useState(false);
  const [attendeesLoading, setAttendeesLoading] = useState(false);
  const [attendeeEventId, setAttendeeEventId] = useState<number | null>(null);
  const [attendeeRows, setAttendeeRows] = useState<
    Awaited<ReturnType<typeof fetchAttendeesByEvent>>["items"]
  >([]);

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<ManagedEvent | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ManagedEvent | null>(null);
  const [saving, setSaving] = useState(false);

  const [formName, setFormName] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formType, setFormType] = useState<"PUBLIC" | "PRIVATE">("PUBLIC");
  const [formStatus, setFormStatus] = useState<string>("PENDING");
  const [formTicketPrice, setFormTicketPrice] = useState("0");
  const [formMaxTickets, setFormMaxTickets] = useState("5");
  const [formStart, setFormStart] = useState("");
  const [formEnd, setFormEnd] = useState("");
  const [formSiteId, setFormSiteId] = useState("");
  const [formImageUrl, setFormImageUrl] = useState("");

  const loadSites = useCallback(async () => {
    if (!token || !can("READ_SITES")) return;
    try {
      const res = await fetchManagedSites(token, { all: true, limit: 500 });
      setSites(res.data.map((s) => ({ id: s.id, name: s.name })));
    } catch {
      /* opcional: sitios no cargados */
    }
  }, [token, can]);

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await fetchManagedEvents(token, {
        page,
        limit: 15,
        search: search.trim() || undefined,
        status: statusFilter || undefined,
        type: typeFilter || undefined,
      });
      setRows(res.data);
      setTotalPages(res.pagination.totalPages || 1);
    } catch (e) {
      push(e instanceof ApiRequestError ? e.message : "Error al cargar eventos", "error");
    } finally {
      setLoading(false);
    }
  }, [token, page, search, statusFilter, typeFilter, push]);

  useEffect(() => {
    void loadSites();
  }, [loadSites]);

  useEffect(() => {
    const t = window.setTimeout(() => {
      setSearch(searchInput.trim());
      setPage(1);
    }, 400);
    return () => window.clearTimeout(t);
  }, [searchInput]);

  useEffect(() => {
    void load();
  }, [load]);

  const resetForm = () => {
    setEditing(null);
    setFormName("");
    setFormDescription("");
    setFormType("PUBLIC");
    setFormStatus("PENDING");
    setFormTicketPrice("0");
    setFormMaxTickets("5");
    setFormStart("");
    setFormEnd("");
    setFormSiteId("");
    setFormImageUrl("");
  };

  const openCreate = () => {
    resetForm();
    setFormOpen(true);
  };

  const openEdit = (ev: ManagedEvent) => {
    setEditing(ev);
    setFormName(ev.name);
    setFormDescription(ev.description ?? "");
    setFormType(ev.type as "PUBLIC" | "PRIVATE");
    setFormStatus(ev.status);
    setFormTicketPrice(String(ev.ticketPrice ?? 0));
    setFormMaxTickets(String(ev.maxTicketsPerUser ?? 1));
    setFormStart(toDatetimeLocalValue(ev.startTime));
    setFormEnd(toDatetimeLocalValue(ev.endTime));
    setFormSiteId(String(ev.siteId));
    setFormImageUrl(ev.imageUrl ?? "");
    setFormOpen(true);
  };

  const openCapacity = async (id: number) => {
    if (!token) return;
    setCapacityOpen(true);
    setCapacityLoading(true);
    setCapacityData(null);
    try {
      const data = await fetchEventCapacityAdmin(token, id);
      setCapacityData(data);
    } catch (e) {
      push(e instanceof ApiRequestError ? e.message : "Error al cargar aforo", "error");
      setCapacityOpen(false);
    } finally {
      setCapacityLoading(false);
    }
  };

  const openAttendees = async (eventId: number) => {
    if (!token) return;
    setAttendeeEventId(eventId);
    setAttendeesOpen(true);
    setAttendeesLoading(true);
    setAttendeeRows([]);
    try {
      const res = await fetchAttendeesByEvent(token, eventId, { all: true });
      setAttendeeRows(res.items);
    } catch (e) {
      push(e instanceof ApiRequestError ? e.message : "Error al cargar asistentes", "error");
    } finally {
      setAttendeesLoading(false);
    }
  };

  const submitForm = async (e: FormEvent) => {
    e.preventDefault();
    if (!token) return;
    const siteId = Number.parseInt(formSiteId, 10);
    if (!Number.isFinite(siteId) || siteId < 1) {
      push("Selecciona o indica un sitio válido", "error");
      return;
    }
    const ticketPrice = Number(formTicketPrice);
    const maxTicketsPerUser = Number.parseInt(formMaxTickets, 10);
    if (!formStart || !formEnd) {
      push("Indica inicio y fin del evento", "error");
      return;
    }
    setSaving(true);
    try {
      if (editing) {
        const body: UpdateEventBody = {
          name: formName.trim(),
          status: formStatus,
          type: formType,
          description: formDescription.trim(),
          ticketPrice,
          maxTicketsPerUser,
          startTime: fromDatetimeLocalToIso(formStart),
          endTime: fromDatetimeLocalToIso(formEnd),
          siteId,
          imageUrl: formImageUrl.trim() || null,
        };
        await updateManagedEvent(token, editing.id, body);
        push("Evento actualizado", "success");
      } else {
        const body: CreateEventBody = {
          name: formName.trim(),
          type: formType,
          status: formStatus,
          description: formDescription.trim(),
          ticketPrice,
          maxTicketsPerUser,
          startTime: fromDatetimeLocalToIso(formStart),
          endTime: fromDatetimeLocalToIso(formEnd),
          siteId,
          imageUrl: formImageUrl.trim() || null,
        };
        await createManagedEvent(token, body);
        push("Evento creado", "success");
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
      await deleteManagedEvent(token, deleteTarget.id);
      push("Evento archivado", "success");
      setDeleteTarget(null);
      void load();
    } catch (e) {
      push(e instanceof ApiRequestError ? e.message : "Error al eliminar", "error");
    } finally {
      setSaving(false);
    }
  };

  const onAutomation = async () => {
    if (!token) return;
    try {
      await runAutomationJobs(token);
      push("Automatizaciones ejecutadas", "success");
      void load();
    } catch (e) {
      push(e instanceof ApiRequestError ? e.message : "Error en automatización", "error");
    }
  };

  return (
    <div ref={revealRef} className="space-y-6">
      <div data-reveal className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Gestión de eventos</h1>
          <p className="mt-1 text-sm text-zinc-400">Crea, filtra y controla aforo y asistentes.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {can("RUN_AUTOMATIONS") ? (
            <Button variant="secondary" type="button" onClick={() => void onAutomation()}>
              Automatizaciones
            </Button>
          ) : null}
          {can("CREATE_EVENT") ? (
            <Button type="button" onClick={openCreate}>
              Nuevo evento
            </Button>
          ) : null}
        </div>
      </div>

      <div
        data-reveal
        className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-surface/60 p-4 md:flex-row md:flex-wrap md:items-end"
      >
        <div className="min-w-[180px] flex-1">
          <label className="mb-1 block text-xs text-zinc-500">Buscar</label>
          <Input
            placeholder="Nombre o descripción"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
          />
        </div>
        <div>
          <label className="mb-1 block text-xs text-zinc-500">Estado</label>
          <select
            className="w-full rounded-xl border border-white/10 bg-surface px-3 py-3 text-sm text-white md:w-44"
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
          >
            <option value="">Todos</option>
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs text-zinc-500">Tipo</label>
          <select
            className="w-full rounded-xl border border-white/10 bg-surface px-3 py-3 text-sm text-white md:w-36"
            value={typeFilter}
            onChange={(e) => {
              setTypeFilter(e.target.value);
              setPage(1);
            }}
          >
            <option value="">Todos</option>
            <option value="PUBLIC">PUBLIC</option>
            <option value="PRIVATE">PRIVATE</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="h-56 animate-pulse rounded-2xl bg-zinc-900/80" data-reveal />
      ) : rows.length === 0 ? (
        <div
          data-reveal
          className="rounded-2xl border border-dashed border-white/15 bg-surface/40 p-12 text-center text-zinc-400"
        >
          No hay eventos con estos filtros.
        </div>
      ) : (
        <div data-reveal className="overflow-x-auto rounded-2xl border border-white/10">
          <table className="w-full min-w-[960px] text-left text-sm">
            <thead className="bg-surface-elevated text-xs uppercase text-zinc-500">
              <tr>
                <th className="px-4 py-3">Evento</th>
                <th className="px-4 py-3">Estado</th>
                <th className="px-4 py-3">Inicio</th>
                <th className="px-4 py-3">Sitio</th>
                <th className="px-4 py-3">Boletos</th>
                <th className="px-4 py-3">Precio</th>
                <th className="px-4 py-3 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-zinc-300">
              {rows.map((ev) => (
                <tr key={ev.id} className="hover:bg-white/[0.03]">
                  <td className="px-4 py-3">
                    <p className="font-medium text-white">{ev.name}</p>
                    <p className="mt-0.5 text-xs text-zinc-500">{ev.type}</p>
                  </td>
                  <td className="px-4 py-3">
                    <span className="rounded-lg bg-white/5 px-2 py-1 text-xs">{ev.status}</span>
                  </td>
                  <td className="px-4 py-3 text-xs">{formatDateTime(ev.startTime)}</td>
                  <td className="px-4 py-3 text-xs">{ev.site?.name ?? `#${ev.siteId}`}</td>
                  <td className="px-4 py-3">{ev._count?.tickets ?? "—"}</td>
                  <td className="px-4 py-3">{formatCop(Number(ev.ticketPrice))}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap justify-end gap-1">
                      <Link
                        to={`/eventos/${ev.id}`}
                        className="rounded-lg px-2 py-1 text-xs text-brand hover:underline"
                      >
                        Ver público
                      </Link>
                      <Button variant="ghost" className="!px-2 !py-1 text-xs" type="button" onClick={() => void openCapacity(ev.id)}>
                        Aforo
                      </Button>
                      {can("READ_ATTENDEES") ? (
                        <Button
                          variant="ghost"
                          className="!px-2 !py-1 text-xs"
                          type="button"
                          onClick={() => void openAttendees(ev.id)}
                        >
                          Asistentes
                        </Button>
                      ) : null}
                      {can("UPDATE_EVENT") ? (
                        <Button variant="ghost" className="!px-2 !py-1 text-xs" type="button" onClick={() => openEdit(ev)}>
                          Editar
                        </Button>
                      ) : null}
                      {can("DELETE_EVENT") ? (
                        <Button variant="ghost" className="!px-2 !py-1 text-xs text-red-400" type="button" onClick={() => setDeleteTarget(ev)}>
                          Eliminar
                        </Button>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {!loading && rows.length > 0 ? (
        <div data-reveal className="flex justify-center gap-2">
          <Button variant="outline" type="button" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>
            Anterior
          </Button>
          <span className="flex items-center px-2 text-sm text-zinc-400">
            Página {page} / {totalPages}
          </span>
          <Button
            variant="outline"
            type="button"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
          >
            Siguiente
          </Button>
        </div>
      ) : null}

      <Modal open={formOpen} title={editing ? "Editar evento" : "Nuevo evento"} onClose={() => setFormOpen(false)}>
        <form className="space-y-3" onSubmit={(e) => void submitForm(e)}>
          <div>
            <label className="mb-1 block text-xs text-zinc-500">Nombre</label>
            <Input value={formName} onChange={(e) => setFormName(e.target.value)} required />
          </div>
          <div>
            <label className="mb-1 block text-xs text-zinc-500">Descripción</label>
            <textarea
              required
              minLength={3}
              maxLength={255}
              className="w-full rounded-xl border border-white/10 bg-surface px-4 py-3 text-sm text-white outline-none focus:border-brand"
              rows={3}
              value={formDescription}
              onChange={(e) => setFormDescription(e.target.value)}
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs text-zinc-500">Tipo</label>
              <select
                className="w-full rounded-xl border border-white/10 bg-surface px-3 py-3 text-sm text-white"
                value={formType}
                onChange={(e) => setFormType(e.target.value as "PUBLIC" | "PRIVATE")}
              >
                <option value="PUBLIC">PUBLIC</option>
                <option value="PRIVATE">PRIVATE</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs text-zinc-500">Estado</label>
              <select
                className="w-full rounded-xl border border-white/10 bg-surface px-3 py-3 text-sm text-white"
                value={formStatus}
                onChange={(e) => setFormStatus(e.target.value)}
              >
                {STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs text-zinc-500">Precio (COP)</label>
              <Input inputMode="numeric" value={formTicketPrice} onChange={(e) => setFormTicketPrice(e.target.value)} />
            </div>
            <div>
              <label className="mb-1 block text-xs text-zinc-500">Máx. tickets / usuario</label>
              <Input inputMode="numeric" value={formMaxTickets} onChange={(e) => setFormMaxTickets(e.target.value)} />
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs text-zinc-500">Inicio</label>
              <Input type="datetime-local" value={formStart} onChange={(e) => setFormStart(e.target.value)} required />
            </div>
            <div>
              <label className="mb-1 block text-xs text-zinc-500">Fin</label>
              <Input type="datetime-local" value={formEnd} onChange={(e) => setFormEnd(e.target.value)} required />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-xs text-zinc-500">Sitio</label>
            {sites.length > 0 ? (
              <select
                className="w-full rounded-xl border border-white/10 bg-surface px-3 py-3 text-sm text-white"
                value={formSiteId}
                onChange={(e) => setFormSiteId(e.target.value)}
                required
              >
                <option value="">Seleccionar…</option>
                {sites.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            ) : (
              <Input placeholder="ID del sitio" value={formSiteId} onChange={(e) => setFormSiteId(e.target.value)} required />
            )}
          </div>
          <div>
            <label className="mb-1 block text-xs text-zinc-500">URL imagen (opcional)</label>
            <Input type="url" value={formImageUrl} onChange={(e) => setFormImageUrl(e.target.value)} placeholder="https://…" />
          </div>
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

      <Modal open={Boolean(deleteTarget)} title="Archivar evento" onClose={() => setDeleteTarget(null)}>
        <p>El evento pasará a archivado y no se mostrará en listados públicos.</p>
        <div className="mt-6 flex justify-end gap-2">
          <Button variant="ghost" type="button" onClick={() => setDeleteTarget(null)}>
            Cancelar
          </Button>
          <Button variant="danger" type="button" disabled={saving} onClick={() => void onDelete()}>
            Confirmar
          </Button>
        </div>
      </Modal>

      <Modal open={capacityOpen} title="Aforo del evento" onClose={() => setCapacityOpen(false)}>
        {capacityLoading ? (
          <div className="h-24 animate-pulse rounded-xl bg-zinc-900/80" />
        ) : capacityData ? (
          <CapacityDetails data={capacityData} />
        ) : (
          <p className="text-zinc-500">Sin datos.</p>
        )}
      </Modal>

      <Modal
        open={attendeesOpen}
        title={attendeeEventId ? `Asistentes validados · evento #${attendeeEventId}` : "Asistentes"}
        onClose={() => setAttendeesOpen(false)}
      >
        {attendeesLoading ? (
          <div className="h-24 animate-pulse rounded-xl bg-zinc-900/80" />
        ) : attendeeRows.length === 0 ? (
          <p className="text-zinc-500">No hay asistentes con ingreso validado.</p>
        ) : (
          <ul className="max-h-72 space-y-2 overflow-y-auto">
            {attendeeRows.map((a) => (
              <li key={a.id} className="rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-xs">
                <span className="font-medium text-white">{a.user?.name ?? "—"}</span>
                <span className="text-zinc-500"> · {a.user?.email}</span>
              </li>
            ))}
          </ul>
        )}
      </Modal>
    </div>
  );
}

function CapacityDetails({ data }: { data: CapacitySnapshot }) {
  const c = data.counters;
  const pct = typeof c.soldPercentage === "number" ? c.soldPercentage.toFixed(1) : String(c.soldPercentage ?? "—");
  return (
    <div className="space-y-3 text-sm">
      <p className="font-semibold text-white">{data.event.name}</p>
      <div className="grid grid-cols-2 gap-2 text-xs">
        <div className="rounded-lg bg-white/5 px-2 py-2">
          Capacidad total <span className="block text-lg text-brand">{c.totalCapacity}</span>
        </div>
        <div className="rounded-lg bg-white/5 px-2 py-2">
          Disponibles <span className="block text-lg text-emerald-400">{c.available}</span>
        </div>
        <div className="rounded-lg bg-white/5 px-2 py-2">
          Vendidos <span className="block text-white">{c.sold}</span>
        </div>
        <div className="rounded-lg bg-white/5 px-2 py-2">
          Usados <span className="block text-white">{c.used}</span>
        </div>
        <div className="rounded-lg bg-white/5 px-2 py-2">
          Ocupación <span className="block text-white">{pct}%</span>
        </div>
      </div>
    </div>
  );
}
