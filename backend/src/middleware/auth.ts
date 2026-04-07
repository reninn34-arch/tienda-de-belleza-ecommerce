import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { sendError } from "../lib/errors";

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error("JWT_SECRET is required");
}

type AuthenticatedRequest = Request & { user?: jwt.JwtPayload | string };

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    sendError(res, 401, { code: "UNAUTHORIZED", message: "No autorizado" });
    return;
  }

  const token = authHeader.split(" ")[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as jwt.JwtPayload | string;
    (req as AuthenticatedRequest).user = decoded;
    next();
  } catch {
    sendError(res, 401, { code: "UNAUTHORIZED", message: "Token inválido" });
  }
}
