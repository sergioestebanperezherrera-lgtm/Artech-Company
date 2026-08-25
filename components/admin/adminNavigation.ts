import {
  Boxes,
  CalendarCheck,
  Clock3,
  HandCoins,
  Landmark,
  LayoutDashboard,
  PackageSearch,
  ReceiptText,
  ScrollText,
  ShieldCheck,
  UsersRound,
  type LucideIcon,
} from "lucide-react";

export type AdminNavigationItem = {
  label: string;
  href: string;
  slug?: string;
  permission?: string;
  icon: LucideIcon;
};

export type AdminNavigationGroup = {
  label: string;
  items: AdminNavigationItem[];
};

export const adminNavigationGroups: AdminNavigationGroup[] = [
  {
    label: "Principal",
    items: [
      {
        label: "Dashboard",
        href: "/admin",
        icon: LayoutDashboard,
      },
    ],
  },
  {
    label: "Personal",
    items: [
      {
        label: "Empleados",
        href: "/admin/employees",
        slug: "employees",
        permission: "employee.read",
        icon: UsersRound,
      },
      {
        label: "Turnos",
        href: "/admin/shifts",
        slug: "shifts",
        permission: "shift.read",
        icon: Clock3,
      },
      {
        label: "Asistencia",
        href: "/admin/attendance",
        slug: "attendance",
        permission: "attendance.read",
        icon: CalendarCheck,
      },
      {
        label: "Nómina",
        href: "/admin/payroll",
        slug: "payroll",
        permission: "payroll.read",
        icon: HandCoins,
      },
    ],
  },
  {
    label: "Operaciones",
    items: [
      {
        label: "Productos",
        href: "/admin/products",
        slug: "products",
        permission: "catalog.manage",
        icon: PackageSearch,
      },
      {
        label: "Inventario",
        href: "/admin/inventory",
        slug: "inventory",
        permission: "inventory.read",
        icon: Boxes,
      },
      {
        label: "Ventas",
        href: "/admin/sales",
        slug: "sales",
        permission: "sale.read",
        icon: ReceiptText,
      },
      {
        label: "Caja",
        href: "/admin/cash",
        slug: "cash",
        permission: "cash.read",
        icon: Landmark,
      },
    ],
  },
  {
    label: "Sistema",
    items: [
      {
        label: "Seguridad",
        href: "/admin/security",
        slug: "security",
        permission: "role.read",
        icon: ShieldCheck,
      },
      {
        label: "Auditoría",
        href: "/admin/audit",
        slug: "audit",
        permission: "audit.read",
        icon: ScrollText,
      },
    ],
  },
];

export const adminModuleItems = adminNavigationGroups
  .flatMap((group) => group.items)
  .filter((item) => item.slug);

export function canViewAdminItem(
  item: AdminNavigationItem,
  permissions: string[],
) {
  return !item.permission || permissions.includes(item.permission);
}

export function getVisibleAdminGroups(permissions: string[]) {
  return adminNavigationGroups
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => canViewAdminItem(item, permissions)),
    }))
    .filter((group) => group.items.length > 0);
}

export function getAdminItemByPath(pathname: string) {
  return adminNavigationGroups
    .flatMap((group) => group.items)
    .find(
      (item) =>
        item.href === pathname ||
        (item.href !== "/admin" && pathname.startsWith(`${item.href}/`)),
    );
}

export function getAdminItemBySlug(slug: string) {
  return adminModuleItems.find((item) => item.slug === slug);
}
