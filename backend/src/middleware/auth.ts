import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { sendError } from "../lib/errors";

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

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    sendError(res, 401, { code: "UNAUTHORIZED", message: "No autorizado" });
    return;
  }

  const token = authHeader.split(" ")[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET_TYPED) as any;
    (req as AuthenticatedRequest).user = {
      userId: decoded.userId,
      email: decoded.email,
      role: decoded.role,
      branchId: decoded.branchId,
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
