import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { env } from "@config/env";
import { authMiddleware } from "@middleware/auth";
import authRoutes from "@routes/auth";
import transactionRoutes from "@routes/transactions";

const app = new Hono();

// ============================================================================
// Middleware
// ============================================================================

// Logger
app.use(logger());

// CORS
app.use(
  cors({
    origin: env.CORS_ORIGIN,
    credentials: true,
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowHeaders: ["Content-Type", "Authorization"],
  })
);

// Authentication middleware
app.use(authMiddleware);

// ============================================================================
// Health Check
// ============================================================================

app.get("/health", (c) => {
  return c.json({
    status: "ok",
    timestamp: new Date().toISOString(),
  });
});

// ============================================================================
// Routes
// ============================================================================

app.route("/api/auth", authRoutes);
app.route("/api/transactions", transactionRoutes);

// ============================================================================
// 404 Handler
// ============================================================================

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

// ============================================================================
// Error Handler
// ============================================================================

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
