import type { NextFunction, Request, Response } from "express";
import multer from "multer";
import { AppError } from "../lib/errors.js";

export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      error: {
        message: err.message,
        code: err.code,
      },
    });
    return;
  }

  if (err instanceof multer.MulterError) {
    const message =
      err.code === "LIMIT_FILE_SIZE"
        ? "Each photo must be under 8MB"
        : err.code === "LIMIT_FILE_COUNT"
          ? "Maximum 8 photos per upload"
          : err.message;
    res.status(400).json({
      error: {
        message,
        code: "UPLOAD_ERROR",
      },
    });
    return;
  }

  if (err instanceof Error && /JPEG|PNG|WebP|HEIC/i.test(err.message)) {
    res.status(400).json({
      error: {
        message: err.message,
        code: "UPLOAD_ERROR",
      },
    });
    return;
  }

  console.error(err);
  res.status(500).json({
    error: {
      message: "Internal server error",
      code: "INTERNAL_ERROR",
    },
  });
}
