import type { User } from "./user";

export type AdminUser = Pick<User, "id" | "name" | "email">;

export type AdminEmployee = {
  id: string;
  code: string;
  isActive: boolean;
};

export type AdminRoleKey = string;
export type AdminPermissionKey = string;

export type AdminContext = {
  user: AdminUser;
  employee: AdminEmployee | null;
  roles: AdminRoleKey[];
  permissions: AdminPermissionKey[];
  canAccessAdmin: boolean;
};
