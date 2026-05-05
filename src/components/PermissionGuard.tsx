import type { ReactNode } from "react";
import { usePermission } from "../hooks/usePermission";

type Props = {
  permission: string;
  children: ReactNode;
};

export function PermissionGuard({ permission, children }: Props) {
  const { can } = usePermission();
  if (!can(permission)) {
    return (
      <div className="rounded-2xl border border-amber-500/25 bg-amber-950/20 p-8 text-center">
        <p className="text-lg font-semibold text-amber-200">Acceso restringido</p>
        <p className="mt-2 text-sm text-zinc-400">
          No tienes el permiso <span className="font-mono text-zinc-300">{permission}</span> necesario para esta
          sección.
        </p>
      </div>
    );
  }
  return <>{children}</>;
}
