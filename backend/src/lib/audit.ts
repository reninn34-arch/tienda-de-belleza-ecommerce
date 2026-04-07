import type { Request } from "express";
import { promises as fs } from "fs";
import path from "path";

export type AuditActor = {
  userId?: string;
  email?: string;
} | {
  type: "public";
} | {
  type: "unknown";
};

export interface AuditEntry {
  timestamp: string;
  action: string;
  entity: string;
  entityId?: string;
  actor: AuditActor;
  ip?: string;
  userAgent?: string;
  details?: Record<string, unknown>;
}

type AuthenticatedRequest = Request & { user?: { userId?: string; email?: string } | string };

function resolveActor(req: AuthenticatedRequest): AuditActor {
  const user = req.user;
  if (!user) {
    return { type: "unknown" };
  }
  if (typeof user === "string") {
    return { userId: user };
  }
  return { userId: user.userId, email: user.email };
}

export async function logAdminAction(
  req: Request,
  entry: Omit<AuditEntry, "timestamp" | "actor" | "ip" | "userAgent"> & { actor?: AuditActor }
) {
  const actor = entry.actor ?? resolveActor(req as AuthenticatedRequest);
  const payload: AuditEntry = {
    timestamp: new Date().toISOString(),
    action: entry.action,
    entity: entry.entity,
    entityId: entry.entityId,
    actor,
    ip: req.ip,
    userAgent: req.headers["user-agent"],
    details: entry.details,
  };

  const logDir = path.join(process.cwd(), "logs");
  const logFile = path.join(logDir, "admin-audit.log");
  try {
    await fs.mkdir(logDir, { recursive: true });
    await fs.appendFile(logFile, JSON.stringify(payload) + "\n", "utf-8");
  } catch {
    // Best-effort logging only.
  }
}
