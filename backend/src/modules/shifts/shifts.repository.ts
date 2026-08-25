import { EmploymentStatus, Prisma } from "@prisma/client";
import { prisma } from "../../config/prisma";

export const shiftInclude = {
  workDays: {
    select: {
      day: true,
    },
  },
} satisfies Prisma.ShiftInclude;

export type ShiftRecord = Prisma.ShiftGetPayload<{
  include: typeof shiftInclude;
}>;

export const shiftAssignmentInclude = {
  shift: {
    include: shiftInclude,
  },
} satisfies Prisma.ShiftAssignmentInclude;

export type ShiftAssignmentRecord = Prisma.ShiftAssignmentGetPayload<{
  include: typeof shiftAssignmentInclude;
}>;

export type EmployeeShiftsRecord = Prisma.EmployeeGetPayload<{
  include: {
    employments: {
      include: {
        position: true;
        shiftAssignments: {
          include: typeof shiftAssignmentInclude;
        };
      };
    };
  };
}>;

export function findShifts() {
  return prisma.shift.findMany({
    include: shiftInclude,
    orderBy: [
      { isActive: "desc" },
      { type: "asc" },
      { name: "asc" },
    ],
  });
}

export function findEmployeeShiftsById(employeeId: string) {
  return prisma.employee.findUnique({
    where: { id: employeeId },
    include: {
      employments: {
        include: {
          position: {
            select: {
              id: true,
              name: true,
              description: true,
              isActive: true,
            },
          },
          shiftAssignments: {
            include: shiftAssignmentInclude,
            orderBy: [
              { effectiveFrom: "desc" },
              { createdAt: "desc" },
            ],
          },
        },
        orderBy: [
          { status: "asc" },
          { startDate: "desc" },
        ],
      },
    },
  });
}

export function findActiveEmploymentForShiftAssignment(
  transaction: Prisma.TransactionClient,
  employeeId: string,
) {
  return transaction.employee.findUnique({
    where: { id: employeeId },
    include: {
      employments: {
        where: { status: EmploymentStatus.ACTIVE },
        include: {
          shiftAssignments: {
            include: shiftAssignmentInclude,
            orderBy: [
              { effectiveFrom: "desc" },
              { createdAt: "desc" },
            ],
          },
        },
        orderBy: { startDate: "desc" },
        take: 1,
      },
    },
  });
}
