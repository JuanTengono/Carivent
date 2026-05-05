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
  broadcastEventApi,
  broadcastPromotionApi,
  fetchEventsList,
  fetchNotifications,
  markNotificationRead,
  type EventOption,
  type NotificationRow,
} from "../../lib/dashboardApi";

type Tab = "all" | "unread";

export function NotificationsPage() {
  return (
    <PermissionGuard permission="READ_NOTIFICATIONS">
      <NotificationsContent />
    </PermissionGuard>
  );
}

function NotificationsContent() {
  const { token } = useAuth();
  const { push } = useToast();
  const { can } = usePermission();
  const [tab, setTab] = useState<Tab>("all");
  const [type, setType] = useState("");
  const [adminUserId, setAdminUserId] = useState("");
  const [appliedUserId, setAppliedUserId] = useState<number | undefined>();
  const [rows, setRows] = useState<NotificationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [events, setEvents] = useState<EventOption[]>([]);
  const [promoOpen, setPromoOpen] = useState(false);
  const [eventOpen, setEventOpen] = useState(false);

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await fetchNotifications(token, {
        all: true,
        onlyUnread: tab === "unread",
        type: type || undefined,
        userId: appliedUserId,
      });
      setRows(res.data);
    } catch (e) {
      push(e instanceof ApiRequestError ? e.message : "Error al cargar notificaciones", "error");
    } finally {
      setLoading(false);
    }
  }, [token, tab, type, appliedUserId, push]);

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

  const showUserFilter = can("READ_ROLES");

  const markRead = async (id: number) => {
    if (!token) return;
    try {
      await markNotificationRead(token, id);
      push("Marcada como leída", "success");
      void load();
    } catch (e) {
      push(e instanceof ApiRequestError ? e.message : "Error", "error");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Notificaciones</h1>
          <p className="mt-1 text-sm text-zinc-400">Centro de mensajes y avisos.</p>
        </div>
        {can("CREATE_NOTIFICATION") ? (
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" onClick={() => setPromoOpen(true)}>
              Enviar promoción
            </Button>
            <Button type="button" onClick={() => setEventOpen(true)}>
              Aviso de evento
            </Button>
          </div>
        ) : null}
      </div>

      <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-white/10 bg-surface p-3">
        <Button variant={tab === "all" ? "primary" : "ghost"} type="button" onClick={() => setTab("all")}>
          Todas
        </Button>
        <Button variant={tab === "unread" ? "primary" : "ghost"} type="button" onClick={() => setTab("unread")}>
          No leídas
        </Button>
        <select
          className="ml-auto rounded-xl border border-white/10 bg-black px-3 py-2 text-sm text-white"
          value={type}
          onChange={(e) => setType(e.target.value)}
        >
          <option value="">Todos los tipos</option>
          <option value="SYSTEM">SYSTEM</option>
          <option value="PURCHASE">PURCHASE</option>
          <option value="PROMOTION">PROMOTION</option>
          <option value="REMINDER">REMINDER</option>
          <option value="EVENT">EVENT</option>
          <option value="SURVEY">SURVEY</option>
        </select>
      </div>

      {showUserFilter ? (
        <div className="flex flex-wrap items-end gap-2 rounded-2xl border border-white/10 bg-surface/80 p-4">
          <div className="min-w-[200px]">
            <label className="mb-1 block text-xs text-zinc-500">Filtrar por usuario (ID)</label>
            <Input
              placeholder="ej. 3"
              value={adminUserId}
              onChange={(e) => setAdminUserId(e.target.value)}
            />
          </div>
          <Button
            type="button"
            variant="secondary"
            onClick={() => {
              const n = Number(adminUserId.trim());
              setAppliedUserId(Number.isInteger(n) && n > 0 ? n : undefined);
            }}
          >
            Aplicar
          </Button>
          {appliedUserId != null ? (
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                setAdminUserId("");
                setAppliedUserId(undefined);
              }}
            >
              Quitar filtro
            </Button>
          ) : null}
        </div>
      ) : null}

      {loading ? (
        <div className="h-40 animate-pulse rounded-2xl bg-zinc-900/80" />
      ) : rows.length === 0 ? (
        <p className="text-center text-zinc-500">No hay notificaciones.</p>
      ) : (
        <ul className="space-y-3">
          {rows.map((n) => (
            <li
              key={n.id}
              className={`rounded-2xl border p-4 ${
                n.isRead ? "border-white/5 bg-surface/50" : "border-brand/30 bg-brand-muted/30"
              }`}
            >
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-semibold uppercase text-brand">{n.type}</span>
                    {!n.isRead ? <span className="h-2 w-2 rounded-full bg-sky-400" title="No leída" /> : null}
                  </div>
                  <h2 className="mt-1 font-semibold text-white">{n.title}</h2>
                  <p className="mt-1 text-sm text-zinc-400">{n.message}</p>
                  <p className="mt-2 text-xs text-zinc-600">
                    {new Date(n.createdAt).toLocaleString("es-CO")}
                    {n.user ? ` · ${n.user.name}` : ""}
                  </p>
                </div>
                {!n.isRead && can("UPDATE_NOTIFICATION") ? (
                  <Button variant="outline" className="shrink-0 !py-1 !text-xs" type="button" onClick={() => void markRead(n.id)}>
                    Marcar leída
                  </Button>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      )}

      <BroadcastPromotionModal
        open={promoOpen}
        onClose={() => setPromoOpen(false)}
        token={token}
        events={events}
        push={push}
        onSent={() => {
          setPromoOpen(false);
          void load();
        }}
      />
      <BroadcastEventModal
        open={eventOpen}
        onClose={() => setEventOpen(false)}
        token={token}
        events={events}
        push={push}
        onSent={() => {
          setEventOpen(false);
          void load();
        }}
      />
    </div>
  );
}

function BroadcastPromotionModal({
  open,
  onClose,
  token,
  events,
  push,
  onSent,
}: {
  open: boolean;
  onClose: () => void;
  token: string | null;
  events: EventOption[];
  push: (m: string, k?: ToastKind) => void;
  onSent: () => void;
}) {
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [eventId, setEventId] = useState("");
  const [sending, setSending] = useState(false);

  const send = async () => {
    if (!token) return;
    setSending(true);
    try {
      await broadcastPromotionApi(token, {
        title: title.trim(),
        message: message.trim(),
        eventId: eventId.trim() ? Number(eventId) : undefined,
      });
      push("Notificación enviada", "success");
      setTitle("");
      setMessage("");
      setEventId("");
      onSent();
    } catch (e) {
      push(e instanceof ApiRequestError ? e.message : "Error", "error");
    } finally {
      setSending(false);
    }
  };

  return (
    <Modal
      open={open}
      title="Enviar promoción masiva"
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" type="button" onClick={onClose} disabled={sending}>
            Cancelar
          </Button>
          <Button type="button" disabled={sending} onClick={() => void send()}>
            {sending ? "Enviando…" : "Enviar"}
          </Button>
        </>
      }
    >
      <div className="space-y-3">
        <div>
          <label className="mb-1 block text-xs text-zinc-500">Título</label>
          <Input value={title} onChange={(e) => setTitle(e.target.value)} />
        </div>
        <div>
          <label className="mb-1 block text-xs text-zinc-500">Mensaje</label>
          <textarea
            className="w-full rounded-xl border border-white/10 bg-surface px-4 py-3 text-sm text-white outline-none focus:border-brand"
            rows={4}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
          />
        </div>
        {events.length > 0 ? (
          <div>
            <label className="mb-1 block text-xs text-zinc-500">Evento (opcional)</label>
            <select
              className="w-full rounded-xl border border-white/10 bg-surface px-4 py-3 text-sm text-white"
              value={eventId}
              onChange={(e) => setEventId(e.target.value)}
            >
              <option value="">Todos los usuarios con dispositivo</option>
              {events.map((ev) => (
                <option key={ev.id} value={ev.id}>
                  {ev.name}
                </option>
              ))}
            </select>
          </div>
        ) : null}
      </div>
    </Modal>
  );
}

function BroadcastEventModal({
  open,
  onClose,
  token,
  events,
  push,
  onSent,
}: {
  open: boolean;
  onClose: () => void;
  token: string | null;
  events: EventOption[];
  push: (m: string, k?: ToastKind) => void;
  onSent: () => void;
}) {
  const [eventId, setEventId] = useState("");
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [noticeType, setNoticeType] = useState<"EVENT" | "REMINDER">("EVENT");
  const [sending, setSending] = useState(false);

  const send = async () => {
    if (!token || !eventId.trim()) {
      push("Selecciona un evento", "warning");
      return;
    }
    setSending(true);
    try {
      await broadcastEventApi(token, {
        eventId: Number(eventId),
        title: title.trim(),
        message: message.trim(),
        type: noticeType,
      });
      push("Aviso enviado", "success");
      onSent();
    } catch (e) {
      push(e instanceof ApiRequestError ? e.message : "Error", "error");
    } finally {
      setSending(false);
    }
  };

  return (
    <Modal
      open={open}
      title="Aviso de evento"
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" type="button" onClick={onClose} disabled={sending}>
            Cancelar
          </Button>
          <Button type="button" disabled={sending} onClick={() => void send()}>
            {sending ? "Enviando…" : "Enviar"}
          </Button>
        </>
      }
    >
      <div className="space-y-3">
        <div>
          <label className="mb-1 block text-xs text-zinc-500">Evento</label>
          <select
            className="w-full rounded-xl border border-white/10 bg-surface px-4 py-3 text-sm text-white"
            value={eventId}
            onChange={(e) => setEventId(e.target.value)}
          >
            <option value="">— Seleccionar —</option>
            {events.map((ev) => (
              <option key={ev.id} value={ev.id}>
                {ev.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs text-zinc-500">Tipo</label>
          <select
            className="w-full rounded-xl border border-white/10 bg-surface px-4 py-3 text-sm text-white"
            value={noticeType}
            onChange={(e) => setNoticeType(e.target.value as "EVENT" | "REMINDER")}
          >
            <option value="EVENT">EVENT</option>
            <option value="REMINDER">REMINDER</option>
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs text-zinc-500">Título</label>
          <Input value={title} onChange={(e) => setTitle(e.target.value)} />
        </div>
        <div>
          <label className="mb-1 block text-xs text-zinc-500">Mensaje</label>
          <textarea
            className="w-full rounded-xl border border-white/10 bg-surface px-4 py-3 text-sm text-white outline-none focus:border-brand"
            rows={4}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
          />
        </div>
      </div>
    </Modal>
  );
}
