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
import { requireAuth } from "./middleware/auth";
import { sendError } from "./lib/errors";

const app = express();

const allowedOrigins = process.env.ALLOWED_ORIGINS 
  ? process.env.ALLOWED_ORIGINS.split(',') 
  : ["http://localhost:3000", "http://localhost:3001"];

app.use(cors({ 
  origin: function (origin, callback) {
    // Permitir peticiones sin origin (como apps móviles o curl) o si el origen está en la lista
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('No permitido por CORS'));
    }
  },
  credentials: true
}));
app.use(express.json({ limit: "10mb" }));

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

// Middleware para proteger endpoints de escritura excepto órdenes y login
app.use((req, res, next) => {
  if (req.method === "GET") return next();
  if (req.path.startsWith("/api/admin/login")) return next();
  if (req.method === "POST" && req.path === "/api/orders") return next();
  
  requireAuth(req, res, next);
});

app.use("/api/products", productsRouter);
app.use("/api/orders", ordersRouter);
app.use("/api/settings", settingsRouter);
app.use("/api/pages", pagesRouter);
app.use("/api/tutorials", tutorialsRouter);
app.use("/api/admin", adminRouter);

app.use((err: unknown, _req: express.Request, res: express.Response, next: express.NextFunction) => {
  void next;
  if (err instanceof Error && err.message === "No permitido por CORS") {
    sendError(res, 403, { code: "FORBIDDEN", message: err.message });
    return;
  }
  if (err instanceof Error) {
    sendError(res, 500, { code: "INTERNAL_ERROR", message: "Error interno", details: err.message });
    return;
  }
  sendError(res, 500, { code: "INTERNAL_ERROR", message: "Error interno" });
});

const PORT = parseInt(process.env.PORT ?? "4000", 10);
app.listen(PORT, () => {
  console.log(`Backend corriendo en http://localhost:${PORT}`);
});
