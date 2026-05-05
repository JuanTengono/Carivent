import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import { Button } from "../../components/ui/Button";
import { Modal } from "../../components/ui/Modal";
import { Input } from "../../components/ui/Input";
import { usePermission } from "../../hooks/usePermission";
import { usePageReveal } from "../../hooks/usePageReveal";
import { ApiRequestError } from "../../lib/api";
import {
  assignPermissionsToRoleApi,
  createPermissionApi,
  createRoleApi,
  deleteRoleApi,
  fetchPermissions,
  fetchRoles,
  updateRoleApi,
  type PermissionRow,
  type RoleRow,
} from "../../lib/securityManagementApi";

export function SecurityManagementPage() {
  const { canAny } = usePermission();

  if (!canAny(["READ_ROLES", "READ_PERMISSIONS"])) {
    return (
      <div className="rounded-2xl border border-amber-500/25 bg-amber-950/20 p-8 text-center">
        <p className="text-lg font-semibold text-amber-200">Acceso restringido</p>
        <p className="mt-2 text-sm text-zinc-400">Se requiere READ_ROLES o READ_PERMISSIONS.</p>
      </div>
    );
  }

  return <SecurityContent />;
}

function SecurityContent() {
  const { token } = useAuth();
  const { can } = usePermission();
  const { push } = useToast();
  const revealRef = usePageReveal([]);

  const [roles, setRoles] = useState<RoleRow[]>([]);
  const [permissions, setPermissions] = useState<PermissionRow[]>([]);
  const [loading, setLoading] = useState(true);

  const [roleModal, setRoleModal] = useState<"create" | "edit" | null>(null);
  const [roleEditing, setRoleEditing] = useState<RoleRow | null>(null);
  const [roleName, setRoleName] = useState("");
  const [permModalOpen, setPermModalOpen] = useState(false);
  const [permName, setPermName] = useState("");
  const [permType, setPermType] = useState<string>("READ");
  const [assignOpen, setAssignOpen] = useState(false);
  const [assignRoleId, setAssignRoleId] = useState("");
  const [selectedPermIds, setSelectedPermIds] = useState<Set<number>>(new Set());
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const emptyPag = { page: 1, limit: 0, total: 0, totalPages: 0 };
      const r = can("READ_ROLES")
        ? await fetchRoles(token, { all: true })
        : { data: [] as RoleRow[], pagination: emptyPag };
      const p = can("READ_PERMISSIONS")
        ? await fetchPermissions(token, { all: true })
        : { data: [] as PermissionRow[], pagination: emptyPag };
      setRoles(r.data);
      setPermissions(p.data);
    } catch (e) {
      push(e instanceof ApiRequestError ? e.message : "Error al cargar seguridad", "error");
    } finally {
      setLoading(false);
    }
  }, [token, can, push]);

  useEffect(() => {
    void load();
  }, [load]);

  const permissionTypes = useMemo(() => ["CREATE", "READ", "UPDATE", "DELETE"], []);

  const submitRole = async (e: FormEvent) => {
    e.preventDefault();
    if (!token) return;
    setSaving(true);
    try {
      if (roleModal === "edit" && roleEditing) {
        await updateRoleApi(token, roleEditing.id, { name: roleName.trim() });
        push("Rol actualizado", "success");
      } else {
        await createRoleApi(token, { name: roleName.trim() });
        push("Rol creado", "success");
      }
      setRoleModal(null);
      setRoleEditing(null);
      setRoleName("");
      void load();
    } catch (err) {
      push(err instanceof ApiRequestError ? err.message : "Error al guardar rol", "error");
    } finally {
      setSaving(false);
    }
  };

  const submitPermission = async (e: FormEvent) => {
    e.preventDefault();
    if (!token || !can("CREATE_PERMISSION")) return;
    setSaving(true);
    try {
      await createPermissionApi(token, { name: permName.trim(), type: permType });
      push("Permiso creado", "success");
      setPermModalOpen(false);
      setPermName("");
      void load();
    } catch (err) {
      push(err instanceof ApiRequestError ? err.message : "Error al crear permiso", "error");
    } finally {
      setSaving(false);
    }
  };

  const submitAssign = async (e: FormEvent) => {
    e.preventDefault();
    if (!token || !can("ASSIGN_PERMISSION_TO_ROLE")) return;
    const rid = Number.parseInt(assignRoleId, 10);
    if (!Number.isFinite(rid)) {
      push("Selecciona un rol", "error");
      return;
    }
    setSaving(true);
    try {
      await assignPermissionsToRoleApi(token, {
        roleId: rid,
        permissionIds: [...selectedPermIds],
      });
      push("Permisos asignados al rol", "success");
      setAssignOpen(false);
      setSelectedPermIds(new Set());
    } catch (err) {
      push(err instanceof ApiRequestError ? err.message : "Error al asignar", "error");
    } finally {
      setSaving(false);
    }
  };

  const onDeleteRole = async (r: RoleRow) => {
    if (!token || !can("DELETE_ROLE")) return;
    if (!window.confirm(`¿Eliminar el rol "${r.name}"?`)) return;
    try {
      await deleteRoleApi(token, r.id);
      push("Rol eliminado", "success");
      void load();
    } catch (e) {
      push(e instanceof ApiRequestError ? e.message : "Error al eliminar", "error");
    }
  };

  const togglePerm = (id: number) => {
    setSelectedPermIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <div ref={revealRef} className="space-y-8">
      <div data-reveal>
        <h1 className="text-2xl font-bold text-white">Roles y permisos</h1>
        <p className="mt-1 text-sm text-zinc-400">Matriz de acceso y asignación a roles.</p>
      </div>

      {can("ASSIGN_PERMISSION_TO_ROLE") ? (
        <div data-reveal>
          <Button type="button" onClick={() => setAssignOpen(true)}>
            Asignar permisos a rol
          </Button>
          <p className="mt-2 text-xs text-amber-200/80">
            Esta acción reemplaza todos los permisos del rol seleccionado. Marca la lista completa deseada antes de
            guardar.
          </p>
        </div>
      ) : null}

      {loading ? (
        <div className="h-40 animate-pulse rounded-2xl bg-zinc-900/80" />
      ) : (
        <>
          {can("READ_ROLES") ? (
            <section data-reveal className="space-y-3">
              <div className="flex items-center justify-between gap-2">
                <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-500">Roles</h2>
                {can("CREATE_ROLE") ? (
                  <Button
                    variant="outline"
                    className="!py-1.5 !text-xs"
                    type="button"
                    onClick={() => {
                      setRoleModal("create");
                      setRoleEditing(null);
                      setRoleName("");
                    }}
                  >
                    Nuevo rol
                  </Button>
                ) : null}
              </div>
              <div className="overflow-x-auto rounded-2xl border border-white/10">
                <table className="w-full min-w-[520px] text-left text-sm">
                  <thead className="bg-surface-elevated text-xs uppercase text-zinc-500">
                    <tr>
                      <th className="px-4 py-3">ID</th>
                      <th className="px-4 py-3">Nombre</th>
                      <th className="px-4 py-3">Usuarios</th>
                      <th className="px-4 py-3">Permisos</th>
                      <th className="px-4 py-3 text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 text-zinc-300">
                    {roles.map((r) => (
                      <tr key={r.id}>
                        <td className="px-4 py-3 font-mono text-xs">{r.id}</td>
                        <td className="px-4 py-3 font-medium text-white">{r.name}</td>
                        <td className="px-4 py-3">{r._count?.users ?? "—"}</td>
                        <td className="px-4 py-3">{r._count?.rolePermissions ?? "—"}</td>
                        <td className="px-4 py-3 text-right">
                          {can("UPDATE_ROLE") ? (
                            <Button
                              variant="ghost"
                              className="!px-2 !py-1 text-xs"
                              type="button"
                              onClick={() => {
                                setRoleModal("edit");
                                setRoleEditing(r);
                                setRoleName(r.name);
                              }}
                            >
                              Editar
                            </Button>
                          ) : null}
                          {can("DELETE_ROLE") ? (
                            <Button variant="ghost" className="!px-2 !py-1 text-xs text-red-400" type="button" onClick={() => void onDeleteRole(r)}>
                              Eliminar
                            </Button>
                          ) : null}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          ) : null}

          {can("READ_PERMISSIONS") ? (
            <section data-reveal className="space-y-3">
              <div className="flex items-center justify-between gap-2">
                <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-500">Permisos</h2>
                {can("CREATE_PERMISSION") ? (
                  <Button variant="outline" className="!py-1.5 !text-xs" type="button" onClick={() => setPermModalOpen(true)}>
                    Nuevo permiso
                  </Button>
                ) : null}
              </div>
              <div className="overflow-x-auto rounded-2xl border border-white/10">
                <table className="w-full min-w-[520px] text-left text-sm">
                  <thead className="bg-surface-elevated text-xs uppercase text-zinc-500">
                    <tr>
                      <th className="px-4 py-3">ID</th>
                      <th className="px-4 py-3">Nombre</th>
                      <th className="px-4 py-3">Tipo</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 text-zinc-300">
                    {permissions.map((p) => (
                      <tr key={p.id}>
                        <td className="px-4 py-3 font-mono text-xs">{p.id}</td>
                        <td className="px-4 py-3 font-mono text-xs text-white">{p.name}</td>
                        <td className="px-4 py-3">{p.type}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          ) : null}
        </>
      )}

      <Modal
        open={roleModal !== null}
        title={roleModal === "edit" ? "Editar rol" : "Nuevo rol"}
        onClose={() => setRoleModal(null)}
      >
        <form className="space-y-3" onSubmit={(e) => void submitRole(e)}>
          <div>
            <label className="mb-1 block text-xs text-zinc-500">Nombre</label>
            <Input value={roleName} onChange={(e) => setRoleName(e.target.value)} required minLength={3} />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" type="button" onClick={() => setRoleModal(null)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={saving}>
              Guardar
            </Button>
          </div>
        </form>
      </Modal>

      <Modal open={permModalOpen} title="Nuevo permiso" onClose={() => setPermModalOpen(false)}>
        <form className="space-y-3" onSubmit={(e) => void submitPermission(e)}>
          <div>
            <label className="mb-1 block text-xs text-zinc-500">Nombre (clave)</label>
            <Input value={permName} onChange={(e) => setPermName(e.target.value)} required minLength={3} />
          </div>
          <div>
            <label className="mb-1 block text-xs text-zinc-500">Tipo</label>
            <select
              className="w-full rounded-xl border border-white/10 bg-surface px-3 py-3 text-sm text-white"
              value={permType}
              onChange={(e) => setPermType(e.target.value)}
            >
              {permissionTypes.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" type="button" onClick={() => setPermModalOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={saving}>
              Crear
            </Button>
          </div>
        </form>
      </Modal>

      <Modal open={assignOpen} title="Asignar permisos al rol" onClose={() => setAssignOpen(false)}>
        <form className="max-h-[70vh] space-y-4 overflow-y-auto" onSubmit={(e) => void submitAssign(e)}>
          <div>
            <label className="mb-1 block text-xs text-zinc-500">Rol</label>
            <select
              className="w-full rounded-xl border border-white/10 bg-surface px-3 py-3 text-sm text-white"
              value={assignRoleId}
              onChange={(e) => setAssignRoleId(e.target.value)}
              required
            >
              <option value="">Seleccionar…</option>
              {roles.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <p className="text-xs text-zinc-500">Permisos ({selectedPermIds.size} seleccionados)</p>
            <div className="max-h-52 space-y-2 overflow-y-auto rounded-xl border border-white/10 p-3">
              {permissions.map((p) => (
                <label key={p.id} className="flex cursor-pointer items-center gap-2 text-xs text-zinc-300">
                  <input
                    type="checkbox"
                    className="rounded border-white/20 bg-surface"
                    checked={selectedPermIds.has(p.id)}
                    onChange={() => togglePerm(p.id)}
                  />
                  <span className="font-mono">{p.name}</span>
                  <span className="text-zinc-600">({p.type})</span>
                </label>
              ))}
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" type="button" onClick={() => setAssignOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={saving}>
              Guardar asignación
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
