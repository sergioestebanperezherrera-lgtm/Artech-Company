import { EmploymentStatus, type Prisma } from "@prisma/client";
import { prisma } from "../../config/prisma";
import type { EmployeeListQuery } from "./employees.validation";

const positionSelect = {
  id: true,
  name: true,
  description: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.PositionSelect;

const employmentInclude = {
  position: {
    select: positionSelect,
  },
} satisfies Prisma.EmploymentInclude;

const employeeListInclude = {
  user: {
    select: {
      id: true,
      name: true,
      email: true,
      isActive: true,
    },
  },
  employments: {
    where: {
      status: EmploymentStatus.ACTIVE,
    },
    include: employmentInclude,
    orderBy: {
      startDate: "desc" as const,
    },
    take: 1,
  },
} satisfies Prisma.EmployeeInclude;

const employeeDetailInclude = {
  user: employeeListInclude.user,
  employments: {
    include: employmentInclude,
    orderBy: [
      { startDate: "desc" as const },
      { createdAt: "desc" as const },
    ],
  },
} satisfies Prisma.EmployeeInclude;

export type PositionRecord = Prisma.PositionGetPayload<{
  select: typeof positionSelect;
}>;

export type EmployeeListRecord = Prisma.EmployeeGetPayload<{
  include: typeof employeeListInclude;
}>;

export type EmployeeDetailRecord = Prisma.EmployeeGetPayload<{
  include: typeof employeeDetailInclude;
}>;

export function findPositions() {
  return prisma.position.findMany({
    select: positionSelect,
    orderBy: [{ isActive: "desc" }, { name: "asc" }],
  });
}

export function findEmployees(query: EmployeeListQuery) {
  const search = query.search?.trim();
  const searchTerms = search?.split(/\s+/).filter(Boolean) ?? [];
  const where: Prisma.EmployeeWhereInput = {
    ...(query.status === "active" ? { isActive: true } : {}),
    ...(query.status === "inactive" ? { isActive: false } : {}),
    ...(query.positionId
      ? {
          employments: {
            some: {
              positionId: query.positionId,
              status: EmploymentStatus.ACTIVE,
            },
          },
        }
      : {}),
    ...(searchTerms.length > 0
      ? {
          AND: searchTerms.map((term) => ({
            OR: [
              { code: { contains: term, mode: "insensitive" } },
              { firstName: { contains: term, mode: "insensitive" } },
              { lastName: { contains: term, mode: "insensitive" } },
              { email: { contains: term, mode: "insensitive" } },
              { user: { name: { contains: term, mode: "insensitive" } } },
            ],
          })),
        }
      : {}),
  };

  return prisma.employee.findMany({
    where,
    include: employeeListInclude,
    orderBy: [{ isActive: "desc" }, { code: "asc" }],
  });
}

export function findEmployeeById(id: string) {
  return prisma.employee.findUnique({
    where: { id },
    include: employeeDetailInclude,
  });
}
