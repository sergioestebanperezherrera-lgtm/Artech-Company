import { EmploymentStatus, Prisma } from "@prisma/client";
import { prisma } from "../../config/prisma";
import { AppError } from "../../errors/app-error";
import {
  findEmployeeById,
  findEmployees,
  type EmployeeDetailRecord,
  type EmployeeListRecord,
} from "./employees.repository";
import type {
  ChangePositionInput,
  CorrectEmploymentStartDateInput,
  CreateEmployeeInput,
  EmployeeListQuery,
  ReactivateEmployeeInput,
  TerminateEmployeeInput,
  UpdateEmployeeInput,
} from "./employees.validation";
import type { AdminMutationResult } from "./positions.service";

const transactionOptions = {
  isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
} as const;

async function runEmployeeTransaction<T>(
  callback: (transaction: Prisma.TransactionClient) => Promise<T>,
) {
  const maxAttempts = 3;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      return await prisma.$transaction(callback, transactionOptions);
    } catch (error) {
      const isWriteConflict =
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2034";

      if (!isWriteConflict || attempt === maxAttempts) {
        throw error;
      }
    }
  }

  throw new AppError("The employee record changed during this operation. Try again.", 409);
}

function toDate(value: string) {
  return new Date(`${value}T00:00:00.000Z`);
}

function toDateOnly(value: Date | null) {
  return value?.toISOString().slice(0, 10) ?? null;
}

function previousDay(value: Date) {
  return new Date(value.getTime() - 24 * 60 * 60 * 1000);
}

async function getEarliestOperationalConflict(
  transaction: Prisma.TransactionClient,
  employmentId: string,
  startDate: Date,
) {
  const [compensation, shiftAssignment, attendance] = await Promise.all([
    transaction.compensationPeriod.findFirst({
      where: {
        employmentId,
        effectiveFrom: { lt: startDate },
      },
      orderBy: { effectiveFrom: "asc" },
      select: { effectiveFrom: true },
    }),
    transaction.shiftAssignment.findFirst({
      where: {
        employmentId,
        effectiveFrom: { lt: startDate },
      },
      orderBy: { effectiveFrom: "asc" },
      select: { effectiveFrom: true },
    }),
    transaction.attendanceRecord.findFirst({
      where: {
        employmentId,
        workDate: { lt: startDate },
      },
      orderBy: { workDate: "asc" },
      select: { workDate: true },
    }),
  ]);

  if (compensation) {
    return "A compensation period exists before the new employment start date.";
  }
  if (shiftAssignment) {
    return "A shift assignment exists before the new employment start date.";
  }
  if (attendance) {
    return "An attendance record exists before the new employment start date.";
  }

  return null;
}

async function closeOpenCompensationPeriod(
  transaction: Prisma.TransactionClient,
  employmentId: string,
  endDate: Date,
) {
  const currentCompensation = await transaction.compensationPeriod.findFirst({
    where: {
      employmentId,
      effectiveTo: null,
    },
    select: {
      id: true,
      effectiveFrom: true,
    },
  });

  if (!currentCompensation) {
    return;
  }

  if (endDate < currentCompensation.effectiveFrom) {
    throw new AppError(
      "Employment cannot end before the current compensation period starts.",
      400,
    );
  }

  await transaction.compensationPeriod.update({
    where: { id: currentCompensation.id },
    data: { effectiveTo: endDate },
  });
}

async function closeOpenShiftAssignment(
  transaction: Prisma.TransactionClient,
  employmentId: string,
  endDate: Date,
) {
  const currentShiftAssignment = await transaction.shiftAssignment.findFirst({
    where: {
      employmentId,
      effectiveTo: null,
    },
    select: {
      id: true,
      effectiveFrom: true,
    },
  });

  if (!currentShiftAssignment) {
    return;
  }

  if (endDate < currentShiftAssignment.effectiveFrom) {
    throw new AppError(
      "Employment cannot end before the current shift assignment starts.",
      400,
    );
  }

  await transaction.shiftAssignment.update({
    where: { id: currentShiftAssignment.id },
    data: { effectiveTo: endDate },
  });
}

function getDisplayName(
  employee: Pick<EmployeeListRecord, "code" | "firstName" | "lastName" | "user">,
) {
  const employeeName = [employee.firstName, employee.lastName]
    .filter(Boolean)
    .join(" ")
    .trim();

  return employeeName || employee.user?.name || employee.code;
}

function mapPosition(position: EmployeeDetailRecord["employments"][number]["position"]) {
  return {
    id: position.id,
    name: position.name,
    description: position.description,
    isActive: position.isActive,
  };
}

function mapEmployment(employment: EmployeeDetailRecord["employments"][number]) {
  return {
    id: employment.id,
    status: employment.status,
    startDate: toDateOnly(employment.startDate),
    endDate: toDateOnly(employment.endDate),
    notes: employment.notes,
    position: mapPosition(employment.position),
    createdAt: employment.createdAt.toISOString(),
    updatedAt: employment.updatedAt.toISOString(),
  };
}

function mapEmployeeListItem(employee: EmployeeListRecord) {
  const currentEmployment = employee.employments[0] ?? null;

  return {
    id: employee.id,
    code: employee.code,
    firstName: employee.firstName,
    lastName: employee.lastName,
    name: getDisplayName(employee),
    email: employee.email,
    phone: employee.phone,
    isActive: employee.isActive,
    status: employee.isActive ? "ACTIVE" : "INACTIVE",
    hasSystemAccess: Boolean(employee.user),
    currentEmployment: currentEmployment
      ? {
          id: currentEmployment.id,
          status: currentEmployment.status,
          startDate: toDateOnly(currentEmployment.startDate),
          position: mapPosition(currentEmployment.position),
        }
      : null,
  };
}

function mapEmployeeDetail(employee: EmployeeDetailRecord) {
  const employments = employee.employments.map(mapEmployment);
  const currentEmployment = employments.find(
    (employment) => employment.status === EmploymentStatus.ACTIVE,
  ) ?? null;

  return {
    id: employee.id,
    code: employee.code,
    firstName: employee.firstName,
    lastName: employee.lastName,
    name: getDisplayName(employee),
    email: employee.email,
    phone: employee.phone,
    isActive: employee.isActive,
    status: employee.isActive ? "ACTIVE" : "INACTIVE",
    createdAt: employee.createdAt.toISOString(),
    updatedAt: employee.updatedAt.toISOString(),
    hasSystemAccess: Boolean(employee.user),
    user: employee.user
      ? {
          id: employee.user.id,
          name: employee.user.name,
          email: employee.user.email,
          isActive: employee.user.isActive,
        }
      : null,
    currentEmployment,
    employments,
  };
}

async function getActivePosition(
  transaction: Prisma.TransactionClient,
  positionId: string,
) {
  const position = await transaction.position.findUnique({
    where: { id: positionId },
    select: { id: true, isActive: true },
  });

  if (!position) {
    throw new AppError("Position not found.", 404);
  }

  if (!position.isActive) {
    throw new AppError("The selected position is inactive.", 400);
  }

  return position;
}

async function lockEmployee(
  transaction: Prisma.TransactionClient,
  employeeId: string,
) {
  const rows = await transaction.$queryRaw<Array<{ id: string }>>`
    SELECT "id"
    FROM "Employee"
    WHERE "id" = ${employeeId}
    FOR UPDATE
  `;

  if (rows.length === 0) {
    throw new AppError("Employee not found.", 404);
  }
}

async function nextEmployeeCode(transaction: Prisma.TransactionClient) {
  const rows = await transaction.$queryRaw<Array<{ value: bigint }>>`
    SELECT nextval('"employee_code_seq"') AS value
  `;
  const sequenceValue = rows[0]?.value;

  if (sequenceValue === undefined) {
    throw new AppError("Employee code could not be generated.", 500);
  }

  return `EMP-${sequenceValue.toString().padStart(3, "0")}`;
}

function rethrowEmployeeMutationError(error: unknown): never {
  if (error instanceof AppError) {
    throw error;
  }

  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2002" || error.code === "P2034") {
      throw new AppError(
        "The employee record changed during this operation. Try again.",
        409,
      );
    }

    if (error.code === "P2003") {
      throw new AppError("The selected related record is not available.", 409);
    }
  }

  throw error;
}

async function requireEmployeeDetail(id: string) {
  const employee = await findEmployeeById(id);

  if (!employee) {
    throw new AppError("Employee not found.", 404);
  }

  return employee;
}

export async function listEmployees(query: EmployeeListQuery) {
  const employees = await findEmployees(query);
  return employees.map(mapEmployeeListItem);
}

export async function getEmployee(id: string) {
  return mapEmployeeDetail(await requireEmployeeDetail(id));
}

export async function createEmployee(
  input: CreateEmployeeInput,
): Promise<AdminMutationResult<ReturnType<typeof mapEmployeeDetail>>> {
  try {
    const employeeId = await runEmployeeTransaction(async (transaction) => {
      await getActivePosition(transaction, input.positionId);
      const code = await nextEmployeeCode(transaction);
      const employee = await transaction.employee.create({
        data: {
          code,
          firstName: input.firstName,
          lastName: input.lastName,
          email: input.email ?? null,
          phone: input.phone ?? null,
          isActive: true,
          employments: {
            create: {
              positionId: input.positionId,
              startDate: toDate(input.startDate),
              status: EmploymentStatus.ACTIVE,
            },
          },
        },
        select: { id: true },
      });

      return employee.id;
    });

    return {
      data: mapEmployeeDetail(await requireEmployeeDetail(employeeId)),
      pendingEvent: {
        action: "employee.created",
        entity: "employee",
        entityId: employeeId,
      },
    };
  } catch (error) {
    rethrowEmployeeMutationError(error);
  }
}

export async function updateEmployee(
  id: string,
  input: UpdateEmployeeInput,
): Promise<AdminMutationResult<ReturnType<typeof mapEmployeeDetail>>> {
  await requireEmployeeDetail(id);

  try {
    await prisma.employee.update({
      where: { id },
      data: {
        ...(input.firstName !== undefined ? { firstName: input.firstName } : {}),
        ...(input.lastName !== undefined ? { lastName: input.lastName } : {}),
        ...(input.email !== undefined ? { email: input.email } : {}),
        ...(input.phone !== undefined ? { phone: input.phone } : {}),
      },
    });

    return {
      data: mapEmployeeDetail(await requireEmployeeDetail(id)),
      pendingEvent: {
        action: "employee.updated",
        entity: "employee",
        entityId: id,
      },
    };
  } catch (error) {
    rethrowEmployeeMutationError(error);
  }
}

export async function changeEmployeePosition(
  id: string,
  input: ChangePositionInput,
): Promise<AdminMutationResult<ReturnType<typeof mapEmployeeDetail>>> {
  try {
    const employmentId = await runEmployeeTransaction(async (transaction) => {
      await lockEmployee(transaction, id);
      const employee = await transaction.employee.findUniqueOrThrow({
        where: { id },
        select: {
          isActive: true,
          employments: {
            where: { status: EmploymentStatus.ACTIVE },
            orderBy: { startDate: "desc" },
            take: 1,
          },
        },
      });

      if (!employee.isActive) {
        throw new AppError("Inactive employees cannot change position.", 409);
      }

      const activeEmployment = employee.employments[0];

      if (!activeEmployment) {
        throw new AppError("Employee has no active employment.", 409);
      }

      if (activeEmployment.positionId === input.positionId) {
        throw new AppError("Employee already has the selected position.", 409);
      }

      await getActivePosition(transaction, input.positionId);
      const nextStartDate = toDate(input.startDate);

      if (nextStartDate <= activeEmployment.startDate) {
        throw new AppError(
          "The new position start date must be after the current start date.",
          400,
        );
      }

      const previousEmploymentEndDate = previousDay(nextStartDate);

      await transaction.employment.update({
        where: { id: activeEmployment.id },
        data: {
          status: EmploymentStatus.ENDED,
          endDate: previousEmploymentEndDate,
        },
      });
      await closeOpenCompensationPeriod(
        transaction,
        activeEmployment.id,
        previousEmploymentEndDate,
      );
      await closeOpenShiftAssignment(
        transaction,
        activeEmployment.id,
        previousEmploymentEndDate,
      );
      const employment = await transaction.employment.create({
        data: {
          employeeId: id,
          positionId: input.positionId,
          startDate: nextStartDate,
          status: EmploymentStatus.ACTIVE,
          notes: input.notes ?? null,
        },
        select: { id: true },
      });

      return employment.id;
    });

    return {
      data: mapEmployeeDetail(await requireEmployeeDetail(id)),
      pendingEvent: {
        action: "employment.position_changed",
        entity: "employment",
        entityId: employmentId,
      },
    };
  } catch (error) {
    rethrowEmployeeMutationError(error);
  }
}

export async function correctCurrentEmploymentStartDate(
  id: string,
  input: CorrectEmploymentStartDateInput,
): Promise<AdminMutationResult<ReturnType<typeof mapEmployeeDetail>>> {
  try {
    const employmentId = await runEmployeeTransaction(async (transaction) => {
      await lockEmployee(transaction, id);
      const employee = await transaction.employee.findUniqueOrThrow({
        where: { id },
        select: {
          employments: {
            orderBy: { startDate: "desc" },
            include: {
              compensationPeriods: {
                select: { id: true },
                take: 1,
              },
              shiftAssignments: {
                select: { id: true },
                take: 1,
              },
            },
          },
        },
      });
      const activeEmployment = employee.employments.find(
        (employment) => employment.status === EmploymentStatus.ACTIVE,
      );

      if (!activeEmployment) {
        throw new AppError("Employee has no active employment.", 409);
      }

      const startDate = toDate(input.startDate);
      const previousEmployment = employee.employments.find(
        (employment) =>
          employment.id !== activeEmployment.id &&
          employment.endDate !== null &&
          employment.endDate >= startDate,
      );

      if (previousEmployment) {
        throw new AppError(
          "The new start date overlaps a previous employment period.",
          409,
        );
      }

      const conflict = await getEarliestOperationalConflict(
        transaction,
        activeEmployment.id,
        startDate,
      );

      if (conflict) {
        throw new AppError(conflict, 409);
      }

      await transaction.employment.update({
        where: { id: activeEmployment.id },
        data: { startDate },
      });

      return activeEmployment.id;
    });

    return {
      data: mapEmployeeDetail(await requireEmployeeDetail(id)),
      pendingEvent: {
        action: "employment.start_date_corrected",
        entity: "employment",
        entityId: employmentId,
      },
    };
  } catch (error) {
    rethrowEmployeeMutationError(error);
  }
}

export async function terminateEmployee(
  id: string,
  input: TerminateEmployeeInput,
): Promise<AdminMutationResult<ReturnType<typeof mapEmployeeDetail>>> {
  try {
    const employmentId = await runEmployeeTransaction(async (transaction) => {
      await lockEmployee(transaction, id);
      const employee = await transaction.employee.findUniqueOrThrow({
        where: { id },
        select: {
          isActive: true,
          employments: {
            where: { status: EmploymentStatus.ACTIVE },
            orderBy: { startDate: "desc" },
            take: 1,
          },
        },
      });

      if (!employee.isActive) {
        throw new AppError("Employee is already inactive.", 409);
      }

      const activeEmployment = employee.employments[0];

      if (!activeEmployment) {
        throw new AppError("Employee has no active employment.", 409);
      }

      const endDate = toDate(input.endDate);

      if (endDate < activeEmployment.startDate) {
        throw new AppError(
          "Employment end date cannot precede its start date.",
          400,
        );
      }

      await transaction.employment.update({
        where: { id: activeEmployment.id },
        data: {
          status: EmploymentStatus.ENDED,
          endDate,
          notes: input.notes ?? activeEmployment.notes,
        },
      });
      await closeOpenCompensationPeriod(transaction, activeEmployment.id, endDate);
      await closeOpenShiftAssignment(transaction, activeEmployment.id, endDate);
      await transaction.employee.update({
        where: { id },
        data: { isActive: false },
      });

      return activeEmployment.id;
    });

    return {
      data: mapEmployeeDetail(await requireEmployeeDetail(id)),
      pendingEvent: {
        action: "employment.terminated",
        entity: "employment",
        entityId: employmentId,
      },
    };
  } catch (error) {
    rethrowEmployeeMutationError(error);
  }
}

export async function reactivateEmployee(
  id: string,
  input: ReactivateEmployeeInput,
): Promise<AdminMutationResult<ReturnType<typeof mapEmployeeDetail>>> {
  try {
    const employmentId = await runEmployeeTransaction(async (transaction) => {
      await lockEmployee(transaction, id);
      const employee = await transaction.employee.findUniqueOrThrow({
        where: { id },
        select: {
          isActive: true,
          employments: {
            orderBy: { startDate: "desc" },
            take: 1,
          },
        },
      });

      if (employee.isActive) {
        throw new AppError("Employee is already active.", 409);
      }

      await getActivePosition(transaction, input.positionId);
      const startDate = toDate(input.startDate);
      const latestEmployment = employee.employments[0];

      if (
        latestEmployment?.endDate &&
        startDate <= latestEmployment.endDate
      ) {
        throw new AppError(
          "Reactivation must start after the previous employment ended.",
          400,
        );
      }

      const employment = await transaction.employment.create({
        data: {
          employeeId: id,
          positionId: input.positionId,
          startDate,
          status: EmploymentStatus.ACTIVE,
          notes: input.notes ?? null,
        },
        select: { id: true },
      });
      await transaction.employee.update({
        where: { id },
        data: { isActive: true },
      });

      return employment.id;
    });

    return {
      data: mapEmployeeDetail(await requireEmployeeDetail(id)),
      pendingEvent: {
        action: "employment.reactivated",
        entity: "employment",
        entityId: employmentId,
      },
    };
  } catch (error) {
    rethrowEmployeeMutationError(error);
  }
}

export async function deleteEmployeeRecord(id: string) {
  try {
    await runEmployeeTransaction(async (transaction) => {
      await lockEmployee(transaction, id);
      const employee = await transaction.employee.findUniqueOrThrow({
        where: { id },
        select: {
          id: true,
          userId: true,
          employments: {
            select: { id: true },
          },
        },
      });

      if (employee.userId) {
        throw new AppError(
          "Employees with system access cannot be deleted. Deactivate them instead.",
          409,
        );
      }

      if (employee.employments.length !== 1) {
        throw new AppError(
          "Employees with employment history cannot be deleted. Deactivate them instead.",
          409,
        );
      }

      const employmentIds = employee.employments.map((employment) => employment.id);
      const [attendanceCount, compensationCount, shiftAssignmentCount, saleCount] =
        await Promise.all([
          transaction.attendanceRecord.count({
            where: { employeeId: id },
          }),
          transaction.compensationPeriod.count({
            where: { employmentId: { in: employmentIds } },
          }),
          transaction.shiftAssignment.count({
            where: { employmentId: { in: employmentIds } },
          }),
          transaction.sale.count({
            where: { employeeId: id },
          }),
        ]);

      if (attendanceCount > 0) {
        throw new AppError(
          "Employees with attendance history cannot be deleted. Deactivate them instead.",
          409,
        );
      }
      if (compensationCount > 0) {
        throw new AppError(
          "Employees with compensation history cannot be deleted. Deactivate them instead.",
          409,
        );
      }
      if (shiftAssignmentCount > 0) {
        throw new AppError(
          "Employees with shift history cannot be deleted. Deactivate them instead.",
          409,
        );
      }
      if (saleCount > 0) {
        throw new AppError(
          "Employees with sales history cannot be deleted. Deactivate them instead.",
          409,
        );
      }

      await transaction.employment.deleteMany({
        where: { employeeId: id },
      });
      await transaction.employee.delete({
        where: { id },
      });
    });

    return {
      pendingEvent: {
        action: "employee.deleted",
        entity: "employee",
        entityId: id,
      },
    };
  } catch (error) {
    rethrowEmployeeMutationError(error);
  }
}
