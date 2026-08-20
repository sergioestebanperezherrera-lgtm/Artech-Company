import type { ErrorRequestHandler } from "express";
import { AppError } from "../errors/app-error";

export const errorMiddleware: ErrorRequestHandler = (
  error,
  _request,
  response,
  _next,
) => {
  if (error instanceof AppError) {
    response.status(error.statusCode).json({
      message: error.message,
    });
    return;
  }

  console.error(error);

  response.status(500).json({
    message: "Internal server error.",
  });
};
