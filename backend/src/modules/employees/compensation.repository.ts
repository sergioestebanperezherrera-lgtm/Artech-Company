import { EmploymentStatus, type Prisma } from "@prisma/client";
import { prisma } from "../../config/prisma";

const compensationPeriodSelect = {
  id: true,
  employmentId: true,
  amount: true,
  currency: true,
  payFrequency: true,
  effectiveFrom: true,
  effectiveTo: true,
  createdAt: true,
  updatedAt: true,
  employment: {
    select: {
      id: true,
      startDate: true,
      endDate: true,
      status: true,
      position: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  },
} satisfies Prisma.CompensationPeriodSelect;

const employeeCompensationInclude = {
  employments: {
    include: {
      position: {
        select: {
          id: true,
          name: true,
        },
      },
      compensationPeriods: {
        select: compensationPeriodSelect,
        orderBy: [
          { effectiveFrom: "desc" as const },
          { createdAt: "desc" as const },
        ],
      },
    },
    orderBy: [
      { startDate: "desc" as const },
      { createdAt: "desc" as const },
    ],
  },
} satisfies Prisma.EmployeeInclude;

export type CompensationPeriodRecord = Prisma.CompensationPeriodGetPayload<{
  select: typeof compensationPeriodSelect;
}>;

export type EmployeeCompensationRecord = Prisma.EmployeeGetPayload<{
  include: typeof employeeCompensationInclude;
}>;

export function findEmployeeCompensationById(employeeId: string) {
  return prisma.employee.findUnique({
    where: { id: employeeId },
    include: employeeCompensationInclude,
  });
}

export function findActiveEmploymentForCompensation(
  transaction: Prisma.TransactionClient,
  employeeId: string,
) {
  return transaction.employee.findUnique({
    where: { id: employeeId },
    select: {
      id: true,
      isActive: true,
      employments: {
        where: { status: EmploymentStatus.ACTIVE },
        include: {
          compensationPeriods: {
            orderBy: [
              { effectiveFrom: "desc" as const },
              { createdAt: "desc" as const },
            ],
          },
        },
        orderBy: { startDate: "desc" as const },
        take: 1,
      },
    },
  });
}
