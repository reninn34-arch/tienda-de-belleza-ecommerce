import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { sendError } from "../lib/errors";
import { db } from "../../../lib/db";

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error("JWT_SECRET is required");
}
// Forzar a TypeScript a tratarlo como string, ya que arriba se valida
const JWT_SECRET_TYPED = JWT_SECRET as string;

export type AuthenticatedRequest = Request & { 
  user?: { 
    userId: string; 
    email: string; 
    role: "ADMIN" | "VENDEDOR"; 
    branchId: string | null;
  }
};

export async function requireAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    sendError(res, 401, { code: "UNAUTHORIZED", message: "No autorizado" });
    return;
  }

  const token = authHeader.split(" ")[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET_TYPED) as any;

    // Verificar que el usuario aún existe en la base de datos
    // Esto garantiza que las sesiones se revocan inmediatamente al eliminar un usuario
    const adminInDb = await db.admin.findUnique({
      where: { id: decoded.userId },
      select: { id: true, role: true, branchId: true, email: true },
    });

    if (!adminInDb) {
      sendError(res, 401, { code: "UNAUTHORIZED", message: "Sesión revocada" });
      return;
    }

    (req as AuthenticatedRequest).user = {
      userId: adminInDb.id,
      email: adminInDb.email,
      role: adminInDb.role as "ADMIN" | "VENDEDOR",
      branchId: adminInDb.branchId,
    };
    next();
  } catch {
    sendError(res, 401, { code: "UNAUTHORIZED", message: "Token inválido" });
  }
}

/**
 * Middleware para requerir roles específicos
 */
export function requireRole(roles: ("ADMIN" | "VENDEDOR")[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    const authReq = req as AuthenticatedRequest;
    if (!authReq.user || !roles.includes(authReq.user.role)) {
      sendError(res, 403, { 
        code: "FORBIDDEN", 
        message: "No tienes permisos para realizar esta acción" 
      });
      return;
    }
    next();
  };
}
