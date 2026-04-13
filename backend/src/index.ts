import "dotenv/config";
import express from "express";
import cors from "cors";
import rateLimit from "express-rate-limit";
import productsRouter from "./routes/products";
import ordersRouter from "./routes/orders";
import settingsRouter from "./routes/settings";
import pagesRouter from "./routes/pages";
import tutorialsRouter from "./routes/tutorials";
import adminRouter from "./routes/admin";
import branchesRouter from "./routes/branches";
import inventoryRouter from "./routes/inventory";
import cashRouter from "./routes/cash";
import eventsRouter from "./routes/events";
import { requireAuth, requireRole } from "./middleware/auth";
import { sendError } from "./lib/errors";
import { validateEnv } from "./lib/env";
import { requestLogger, logger, type RequestWithId } from "./lib/logger";

const env = validateEnv(process.env);
const app = express();

const allowedOrigins = env.ALLOWED_ORIGINS
  ? env.ALLOWED_ORIGINS.split(",")
  : ["http://localhost:3000", "http://localhost:3001"];

app.use(cors({
  origin: function (origin, callback) {
    // Permitir peticiones sin origin (como apps móviles o curl) o si el origen está en la lista
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error("No permitido por CORS"));
    }
  },
  credentials: true,
}));
app.use(express.json({ limit: "10mb" }));
app.use(requestLogger);

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req, res) => {
    sendError(res, 429, {
      code: "RATE_LIMITED",
      message: "Demasiados intentos, intenta de nuevo más tarde",
    });
  },
});

const orderLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req, res) => {
    sendError(res, 429, {
      code: "RATE_LIMITED",
      message: "Demasiadas solicitudes, intenta de nuevo más tarde",
    });
  },
});

app.use("/api/admin/login", loginLimiter);
app.use("/api/orders", (req, res, next) => {
  if (req.method === "POST") {
    return orderLimiter(req, res, next);
  }
  next();
});

// Middleware para proteger endpoints
app.use((req, res, next) => {
  const authHeader = req.headers.authorization;

  // Si hay un token presente, siempre lo procesamos para identificar al usuario
  if (authHeader && authHeader.startsWith("Bearer ")) {
    return requireAuth(req, res, next);
  }

  // Rutas públicas que no requieren autenticación si no hay token
  if (req.method === "GET") return next();
  if (req.path.startsWith("/api/admin/login")) return next();
  if (req.method === "POST" && req.path === "/api/orders") return next();

  // Para el resto de rutas protegidas sin token
  requireAuth(req, res, next);
});

app.use("/api/products", productsRouter);
app.use("/api/orders", ordersRouter);
app.use("/api/settings", settingsRouter);
app.use("/api/pages", pagesRouter);
app.use("/api/tutorials", tutorialsRouter);
app.use("/api/admin", adminRouter);
app.use("/api/branches", branchesRouter);
app.use("/api/inventory", inventoryRouter);
app.use("/api/admin/cash", cashRouter);
app.use("/api/admin/events", eventsRouter);

app.use((err: unknown, _req: express.Request, res: express.Response, next: express.NextFunction) => {
  const req = _req as RequestWithId;
  void next;
  if (err instanceof Error && err.message === "No permitido por CORS") {
    sendError(res, 403, { code: "FORBIDDEN", message: err.message });
    return;
  }
  if (err instanceof Error) {
    logger.error({
      requestId: req.requestId,
      method: req.method,
      path: req.originalUrl,
      message: "unhandled_error",
      details: err.message,
    });
    sendError(res, 500, { code: "INTERNAL_ERROR", message: "Error interno", details: err.message });
    return;
  }
  sendError(res, 500, { code: "INTERNAL_ERROR", message: "Error interno" });
});

const PORT = parseInt(env.PORT ?? "4000", 10);
app.listen(PORT, () => {
  console.log(`Backend corriendo en http://localhost:${PORT}`);
  logger.info({ message: `backend_started:${PORT}` });
});