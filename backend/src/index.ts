import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { env } from "./config/env.js";
import { authMiddleware } from "./middleware/auth.js";
import authRoutes from "./routes/auth.js";
import transactionRoutes from "./routes/transactions.js";

const app = new Hono();



app.use(logger());

// Allow multiple origins via comma-separated CORS_ORIGIN and include FRONTEND_URL as fallback
const corsOriginList = env.CORS_ORIGIN.split(",").map((o) => o.trim()).filter(Boolean);
const allowedOrigins = Array.from(new Set([...(corsOriginList || []), env.FRONTEND_URL].filter(Boolean)));

// Hono CORS middleware (same behavior as local)
app.use(
  cors({
    origin: (origin, _c) => {
      if (!origin) return null;
      return allowedOrigins.includes(origin) ? origin : null;
    },
    credentials: true,
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowHeaders: ["Content-Type", "Authorization"],
  })
);

app.use(authMiddleware);


app.get("/health", (c) => {
  return c.json({
    status: "ok",
    timestamp: new Date().toISOString(),
  });
});



app.route("/api/auth", authRoutes);
app.route("/api/transactions", transactionRoutes);



app.notFound((c) => {
  return c.json(
    {
      success: false,
      error: {
        code: "NOT_FOUND",
        message: "Endpoint not found",
      },
    },
    404
  );
});



app.onError((error, c) => {
  console.error("Unhandled error:", error);
  return c.json(
    {
      success: false,
      error: {
        code: "INTERNAL_SERVER_ERROR",
        message: "An unexpected error occurred",
        details: env.NODE_ENV === "development" ? error.message : undefined,
      },
    },
    500
  );
});

export default app;
