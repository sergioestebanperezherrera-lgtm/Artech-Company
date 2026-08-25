export const permissionSeeds = [
  { key: "employee.read", description: "Consultar empleados." },
  { key: "employee.create", description: "Crear empleados." },
  { key: "employee.update", description: "Actualizar empleados." },
  { key: "employee.deactivate", description: "Desactivar empleados." },
  { key: "salary.read", description: "Consultar informacion salarial." },
  { key: "salary.update", description: "Actualizar informacion salarial." },
  { key: "shift.read", description: "Consultar turnos y asignaciones." },
  { key: "shift.manage", description: "Gestionar turnos y asignaciones." },
  { key: "attendance.read", description: "Consultar asistencia." },
  { key: "attendance.record", description: "Registrar asistencia." },
  { key: "attendance.override", description: "Corregir registros de asistencia." },
  { key: "payroll.read", description: "Consultar nomina." },
  { key: "payroll.manage", description: "Gestionar procesos de nomina." },
  { key: "payroll.close", description: "Cerrar periodos de nomina." },
  { key: "catalog.manage", description: "Gestionar el catalogo comercial." },
  { key: "inventory.read", description: "Consultar inventario." },
  { key: "inventory.adjust", description: "Registrar ajustes de inventario." },
  { key: "sale.read", description: "Consultar ventas." },
  { key: "sale.pos_create", description: "Crear ventas desde POS." },
  { key: "sale.refund", description: "Gestionar devoluciones de ventas." },
  { key: "cash.read", description: "Consultar movimientos de caja." },
  { key: "cash.open", description: "Abrir caja." },
  { key: "cash.close", description: "Cerrar caja." },
  { key: "cash.move", description: "Registrar movimientos de caja." },
  { key: "role.read", description: "Consultar roles y permisos." },
  { key: "role.manage", description: "Gestionar roles y permisos." },
  { key: "audit.read", description: "Consultar auditoria interna." },
] as const;

export type RbacPermissionKey = (typeof permissionSeeds)[number]["key"];

export const roleSeeds = [
  {
    name: "SUPER_ADMIN",
    description: "Acceso total a la administracion interna de ARTECH.",
  },
  {
    name: "STORE_MANAGER",
    description: "Gestion operativa de tienda, personal, inventario, ventas y caja.",
  },
  {
    name: "CASHIER",
    description: "Operacion de ventas POS, caja y registro de asistencia propia.",
  },
  {
    name: "INVENTORY_CLERK",
    description: "Gestion de catalogo y control operativo de inventario.",
  },
  {
    name: "HR_ACCOUNTANT",
    description: "Gestion de personal, asistencia y procesos de nomina.",
  },
] as const;

export type RbacRoleName = (typeof roleSeeds)[number]["name"];

export const allPermissionKeys: readonly RbacPermissionKey[] = permissionSeeds.map(
  (permission) => permission.key,
);

export const rolePermissionMatrix: Record<
  RbacRoleName,
  readonly RbacPermissionKey[]
> = {
  SUPER_ADMIN: allPermissionKeys,
  STORE_MANAGER: [
    "employee.read",
    "employee.create",
    "employee.update",
    "employee.deactivate",
    "salary.read",
    "salary.update",
    "shift.read",
    "shift.manage",
    "attendance.read",
    "attendance.record",
    "attendance.override",
    "payroll.read",
    "payroll.manage",
    "catalog.manage",
    "inventory.read",
    "inventory.adjust",
    "sale.read",
    "sale.pos_create",
    "sale.refund",
    "cash.read",
    "cash.open",
    "cash.close",
    "cash.move",
  ],
  CASHIER: [
    "inventory.read",
    "sale.pos_create",
    "cash.read",
    "cash.open",
    "cash.close",
    "cash.move",
    "attendance.record",
  ],
  INVENTORY_CLERK: [
    "catalog.manage",
    "inventory.read",
    "inventory.adjust",
  ],
  HR_ACCOUNTANT: [
    "employee.read",
    "employee.create",
    "employee.update",
    "salary.read",
    "shift.read",
    "attendance.read",
    "attendance.override",
    "payroll.read",
    "payroll.manage",
    "payroll.close",
  ],
};
