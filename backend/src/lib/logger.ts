import type { Request, Response, NextFunction } from "express";
import { randomUUID } from "node:crypto";

type LogLevel = "info" | "error";

interface LogContext {
  requestId?: string;
  method?: string;
  path?: string;
  status?: number;
  durationMs?: number;
  message: string;
  details?: unknown;
}

export type RequestWithId = Request & { requestId?: string };

function write(level: LogLevel, context: LogContext): void {
  const payload = {
    level,
    timestamp: new Date().toISOString(),
    ...context,
  };

  if (level === "error") {
    console.error(JSON.stringify(payload));
    return;
  }

  console.log(JSON.stringify(payload));
}

export const logger = {
  info: (context: LogContext) => write("info", context),
  error: (context: LogContext) => write("error", context),
};

export function requestLogger(req: Request, res: Response, next: NextFunction): void {
  const request = req as RequestWithId;
  const start = Date.now();
  request.requestId = randomUUID();

  res.setHeader("x-request-id", request.requestId);

  res.on("finish", () => {
    logger.info({
      requestId: request.requestId,
      method: request.method,
      path: request.originalUrl,
      status: res.statusCode,
      durationMs: Date.now() - start,
      message: "request_completed",
    });
  });

  next();
}
