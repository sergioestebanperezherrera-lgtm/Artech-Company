import { Prisma } from "@prisma/client";
import { prisma } from "../../config/prisma";
import { AppError } from "../../errors/app-error";
import { findPositions, type PositionRecord } from "./employees.repository";
import type {
  CreatePositionInput,
  UpdatePositionInput,
} from "./employees.validation";

export type PendingAdminEvent = {
  action: string;
  entity: "employee" | "employment" | "position";
  entityId: string;
};

export type AdminMutationResult<T> = {
  data: T;
  pendingEvent: PendingAdminEvent;
};

function normalizePositionName(name: string) {
  return name
    .trim()
    .replace(/\s+/g, " ")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("es");
}

function mapPosition(position: PositionRecord) {
  return {
    ...position,
    createdAt: position.createdAt.toISOString(),
    updatedAt: position.updatedAt.toISOString(),
  };
}

function rethrowPositionError(error: unknown): never {
  if (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2002"
  ) {
    throw new AppError("A position with this name already exists.", 409);
  }

  throw error;
}

export async function listPositions() {
  const positions = await findPositions();
  return positions.map(mapPosition);
}

export async function createPosition(
  input: CreatePositionInput,
): Promise<AdminMutationResult<ReturnType<typeof mapPosition>>> {
  const name = input.name.trim().replace(/\s+/g, " ");

  try {
    const position = await prisma.position.create({
      data: {
        name,
        normalizedName: normalizePositionName(name),
        description: input.description?.trim() || null,
      },
      select: {
        id: true,
        name: true,
        description: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return {
      data: mapPosition(position),
      pendingEvent: {
        action: "position.created",
        entity: "position",
        entityId: position.id,
      },
    };
  } catch (error) {
    rethrowPositionError(error);
  }
}

export async function updatePosition(
  id: string,
  input: UpdatePositionInput,
): Promise<AdminMutationResult<ReturnType<typeof mapPosition>>> {
  const existing = await prisma.position.findUnique({
    where: { id },
    select: { id: true },
  });

  if (!existing) {
    throw new AppError("Position not found.", 404);
  }

  const name = input.name?.trim().replace(/\s+/g, " ");

  try {
    const position = await prisma.position.update({
      where: { id },
      data: {
        ...(name
          ? {
              name,
              normalizedName: normalizePositionName(name),
            }
          : {}),
        ...(input.description !== undefined
          ? { description: input.description?.trim() || null }
          : {}),
        ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
      },
      select: {
        id: true,
        name: true,
        description: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return {
      data: mapPosition(position),
      pendingEvent: {
        action: position.isActive
          ? "position.updated"
          : "position.deactivated",
        entity: "position",
        entityId: position.id,
      },
    };
  } catch (error) {
    rethrowPositionError(error);
  }
}
