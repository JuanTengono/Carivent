import { apiFetch } from "./api";
import type { ListPagination } from "./dashboardApi";

export type RoleRow = {
  id: number;
  name: string;
  deletedAt?: string | null;
  _count?: { users: number; rolePermissions: number };
};

export type PermissionRow = {
  id: number;
  name: string;
  type: string;
};

export async function fetchRoles(
  token: string,
  params: { page?: number; limit?: number; all?: boolean }
) {
  return apiFetch<{ data: RoleRow[]; pagination: ListPagination }>("/security/get-roles", {
    token,
    query: {
      page: params.page ?? 1,
      limit: params.limit ?? 50,
      all: params.all ?? true,
    },
  });
}

export async function createRoleApi(token: string, body: { name: string }) {
  return apiFetch<RoleRow>("/security/store-role", { method: "POST", body, token });
}

export async function updateRoleApi(token: string, id: number, body: { name: string }) {
  return apiFetch<RoleRow>(`/security/update-role/${id}`, { method: "PUT", body, token });
}

export async function deleteRoleApi(token: string, id: number) {
  return apiFetch<RoleRow>(`/security/delete-role/${id}`, { method: "DELETE", token });
}

export async function fetchPermissions(
  token: string,
  params: { page?: number; limit?: number; all?: boolean }
) {
  return apiFetch<{ data: PermissionRow[]; pagination: ListPagination }>("/security/get-permissions", {
    token,
    query: {
      page: params.page ?? 1,
      limit: params.limit ?? 500,
      all: params.all ?? true,
    },
  });
}

export async function createPermissionApi(token: string, body: { name: string; type: string }) {
  return apiFetch<PermissionRow>("/security/create-permission", { method: "POST", body, token });
}

export async function assignPermissionsToRoleApi(
  token: string,
  body: { roleId: number; permissionIds: number[] }
) {
  return apiFetch<unknown>("/security/assign-permission-to-role", { method: "POST", body, token });
}
