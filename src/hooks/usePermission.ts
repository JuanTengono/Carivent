import { useCallback, useMemo } from "react";
import { useAuth } from "../context/AuthContext";

export function usePermission() {
  const { user } = useAuth();
  const permissions = useMemo(() => user?.permissions ?? [], [user?.permissions]);

  const can = useCallback((permission: string) => permissions.includes(permission), [permissions]);

  const canAny = useCallback((perms: string[]) => perms.some((p) => permissions.includes(p)), [permissions]);

  return { can, canAny, permissions };
}
