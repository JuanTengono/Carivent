import { useCallback, useEffect, useState, type FormEvent } from "react";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import { PermissionGuard } from "../../components/PermissionGuard";
import { Button } from "../../components/ui/Button";
import { Modal } from "../../components/ui/Modal";
import { Input } from "../../components/ui/Input";
import { usePermission } from "../../hooks/usePermission";
import { usePageReveal } from "../../hooks/usePageReveal";
import { ApiRequestError } from "../../lib/api";
import {
  createManagedSite,
  deleteManagedSite,
  fetchManagedSites,
  updateManagedSite,
  type CreateSiteBody,
  type ManagedSite,
  type UpdateSiteBody,
} from "../../lib/sitesManagementApi";

export function SitesManagementPage() {
  return (
    <PermissionGuard permission="READ_SITES">
      <SitesContent />
    </PermissionGuard>
  );
}

function SitesContent() {
  const { token } = useAuth();
  const { can } = usePermission();
  const { push } = useToast();
  const revealRef = usePageReveal([]);
  const [rows, setRows] = useState<ManagedSite[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<ManagedSite | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ManagedSite | null>(null);
  const [saving, setSaving] = useState(false);

  const [name, setName] = useState("");
  const [ubication, setUbication] = useState("");
  const [direction, setDirection] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [capacity, setCapacity] = useState("100");
  const [description, setDescription] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [latitude, setLatitude] = useState("");
  const [longitude, setLongitude] = useState("");
  const [status, setStatus] = useState<"ACTIVE" | "INACTIVE">("ACTIVE");

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await fetchManagedSites(token, { all: true, limit: 200, search: search || undefined });
      setRows(res.data);
    } catch (e) {
      push(e instanceof ApiRequestError ? e.message : "Error al cargar sitios", "error");
    } finally {
      setLoading(false);
    }
  }, [token, search, push]);

  useEffect(() => {
    const t = window.setTimeout(() => setSearch(searchInput.trim()), 350);
    return () => window.clearTimeout(t);
  }, [searchInput]);

  useEffect(() => {
    void load();
  }, [load]);

  const resetForm = () => {
    setEditing(null);
    setName("");
    setUbication("");
    setDirection("");
    setPhone("");
    setEmail("");
    setCapacity("100");
    setDescription("");
    setImageUrl("");
    setLatitude("");
    setLongitude("");
    setStatus("ACTIVE");
  };

  const openCreate = () => {
    resetForm();
    setFormOpen(true);
  };

  const openEdit = (s: ManagedSite) => {
    setEditing(s);
    setName(s.name);
    setUbication(s.ubication);
    setDirection(s.direction);
    setPhone(s.phone);
    setEmail(s.email);
    setCapacity(String(s.capacity));
    setDescription(s.description ?? "");
    setImageUrl(s.imageUrl ?? "");
    setLatitude(s.latitude != null ? String(s.latitude) : "");
    setLongitude(s.longitude != null ? String(s.longitude) : "");
    setStatus((s.status as "ACTIVE" | "INACTIVE") || "ACTIVE");
    setFormOpen(true);
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!token) return;
    const cap = Number.parseInt(capacity, 10);
    if (!Number.isFinite(cap) || cap < 1) {
      push("Capacidad inválida", "error");
      return;
    }
    setSaving(true);
    try {
      if (editing) {
        const body: UpdateSiteBody = {
          name: name.trim(),
          ubication: ubication.trim(),
          direction: direction.trim(),
          phone: phone.trim(),
          email: email.trim(),
          capacity: cap,
          status,
          description: description.trim() || null,
          imageUrl: imageUrl.trim() || null,
          latitude: latitude.trim() ? Number.parseFloat(latitude) : null,
          longitude: longitude.trim() ? Number.parseFloat(longitude) : null,
        };
        await updateManagedSite(token, editing.id, body);
        push("Sitio actualizado", "success");
      } else {
        const body: CreateSiteBody = {
          name: name.trim(),
          ubication: ubication.trim(),
          direction: direction.trim(),
          phone: phone.trim(),
          email: email.trim(),
          capacity: cap,
          description: description.trim() || null,
          imageUrl: imageUrl.trim() || null,
          latitude: latitude.trim() ? Number.parseFloat(latitude) : null,
          longitude: longitude.trim() ? Number.parseFloat(longitude) : null,
        };
        await createManagedSite(token, body);
        push("Sitio creado", "success");
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
      await deleteManagedSite(token, deleteTarget.id);
      push("Sitio eliminado", "success");
      setDeleteTarget(null);
      void load();
    } catch (e) {
      push(e instanceof ApiRequestError ? e.message : "Error al eliminar", "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div ref={revealRef} className="space-y-6">
      <div data-reveal className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <h1 className="text-2xl font-bold text-white">Gestión de sitios</h1>
          <p className="mt-1 text-sm text-zinc-400">Espacios físicos, capacidad y disponibilidad.</p>
        </div>
        {can("CREATE_SITE") ? (
          <Button type="button" onClick={openCreate}>
            Nuevo sitio
          </Button>
        ) : null}
      </div>

      <div data-reveal className="max-w-md">
        <label className="mb-1 block text-xs text-zinc-500">Buscar</label>
        <Input placeholder="Nombre, ciudad o dirección" value={searchInput} onChange={(e) => setSearchInput(e.target.value)} />
      </div>

      {loading ? (
        <div className="grid animate-pulse gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-48 rounded-2xl bg-zinc-900/80" />
          ))}
        </div>
      ) : rows.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-white/15 p-12 text-center text-zinc-400">
          No hay sitios registrados.
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {rows.map((site) => (
            <article
              key={site.id}
              data-reveal
              className="flex flex-col overflow-hidden rounded-2xl border border-white/10 bg-surface/80 shadow-card"
            >
              <div className="aspect-video w-full overflow-hidden bg-zinc-900">
                {site.imageUrl ? (
                  <img src={site.imageUrl} alt="" className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full items-center justify-center text-zinc-600">Sin imagen</div>
                )}
              </div>
              <div className="flex flex-1 flex-col p-4">
                <h2 className="text-lg font-semibold text-white">{site.name}</h2>
                <p className="mt-1 text-xs text-zinc-500">{site.ubication}</p>
                <p className="mt-2 line-clamp-2 text-sm text-zinc-400">{site.direction}</p>
                <div className="mt-3 flex flex-wrap gap-2 text-xs">
                  <span className="rounded-lg bg-white/5 px-2 py-1 text-zinc-300">Cap. {site.capacity}</span>
                  <span
                    className={`rounded-lg px-2 py-1 ${
                      site.status === "ACTIVE" ? "bg-emerald-500/15 text-emerald-300" : "bg-zinc-700 text-zinc-400"
                    }`}
                  >
                    {site.status ?? "—"}
                  </span>
                  <span className="rounded-lg bg-white/5 px-2 py-1 text-zinc-400">
                    {site.events?.length ?? 0} eventos
                  </span>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  {can("UPDATE_SITE") ? (
                    <Button variant="outline" className="!py-1.5 !text-xs" type="button" onClick={() => openEdit(site)}>
                      Editar
                    </Button>
                  ) : null}
                  {can("DELETE_SITE") ? (
                    <Button
                      variant="ghost"
                      className="!py-1.5 !text-xs text-red-400"
                      type="button"
                      onClick={() => setDeleteTarget(site)}
                    >
                      Eliminar
                    </Button>
                  ) : null}
                </div>
              </div>
            </article>
          ))}
        </div>
      )}

      <Modal open={formOpen} title={editing ? "Editar sitio" : "Nuevo sitio"} onClose={() => setFormOpen(false)}>
        <form className="max-h-[70vh] space-y-3 overflow-y-auto pr-1" onSubmit={(e) => void submit(e)}>
          <div>
            <label className="mb-1 block text-xs text-zinc-500">Nombre</label>
            <Input value={name} onChange={(e) => setName(e.target.value)} required minLength={3} />
          </div>
          <div>
            <label className="mb-1 block text-xs text-zinc-500">Ubicación (ciudad/región)</label>
            <Input value={ubication} onChange={(e) => setUbication(e.target.value)} required />
          </div>
          <div>
            <label className="mb-1 block text-xs text-zinc-500">Dirección</label>
            <Input value={direction} onChange={(e) => setDirection(e.target.value)} required />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs text-zinc-500">Teléfono</label>
              <Input value={phone} onChange={(e) => setPhone(e.target.value)} required minLength={10} maxLength={12} />
            </div>
            <div>
              <label className="mb-1 block text-xs text-zinc-500">Email</label>
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs text-zinc-500">Capacidad</label>
              <Input inputMode="numeric" value={capacity} onChange={(e) => setCapacity(e.target.value)} required />
            </div>
            {editing ? (
              <div>
                <label className="mb-1 block text-xs text-zinc-500">Estado</label>
                <select
                  className="w-full rounded-xl border border-white/10 bg-surface px-3 py-3 text-sm text-white"
                  value={status}
                  onChange={(e) => setStatus(e.target.value as "ACTIVE" | "INACTIVE")}
                >
                  <option value="ACTIVE">ACTIVE</option>
                  <option value="INACTIVE">INACTIVE</option>
                </select>
              </div>
            ) : null}
          </div>
          <div>
            <label className="mb-1 block text-xs text-zinc-500">Descripción (opcional)</label>
            <textarea
              className="w-full rounded-xl border border-white/10 bg-surface px-4 py-3 text-sm text-white outline-none focus:border-brand"
              rows={3}
              maxLength={500}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-zinc-500">URL imagen (opcional)</label>
            <Input type="url" value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs text-zinc-500">Latitud (opcional)</label>
              <Input value={latitude} onChange={(e) => setLatitude(e.target.value)} placeholder="4.6097" />
            </div>
            <div>
              <label className="mb-1 block text-xs text-zinc-500">Longitud (opcional)</label>
              <Input value={longitude} onChange={(e) => setLongitude(e.target.value)} placeholder="-74.0817" />
            </div>
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

      <Modal open={Boolean(deleteTarget)} title="Eliminar sitio" onClose={() => setDeleteTarget(null)}>
        <p>El sitio se marcará como inactivo y no podrá usarse en nuevos eventos.</p>
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
