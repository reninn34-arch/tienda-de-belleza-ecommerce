import type { Response } from "express";

export type ErrorCode =
  | "BAD_REQUEST"
  | "VALIDATION_ERROR"
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "RATE_LIMITED"
  | "INVALID_CREDENTIALS"
  | "STOCK_INSUFFICIENT"
  | "ALREADY_EXISTS"
  | "ALREADY_OPEN"
  | "INVALID_SESSION"
  | "INTERNAL_ERROR";

export interface ErrorPayload {
  code: ErrorCode;
  message: string;
  details?: unknown;
}

export function sendError(res: Response, status: number, payload: ErrorPayload) {
  return res.status(status).json({ error: payload });
}
