import type { RequestHandler } from "express";
import { AppError } from "../../errors/app-error";
import { resolveAuthSession } from "./auth.session";

export const requireAuth: RequestHandler = async (request, _response, next) => {
  try {
    const session = await resolveAuthSession(request);

    if (!session) {
      next(new AppError("Authentication required.", 401));
      return;
    }

    next();
  } catch (error) {
    next(error);
  }
};
