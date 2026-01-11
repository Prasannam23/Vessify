import app from "./index.js";
import { env } from "./config/env.js";
import prisma from "./db/prisma.js";
import { serve } from "@hono/node-server";
import { startKeepalive } from "./utils/keepalive.js";

const port = env.PORT;

serve({
  fetch: app.fetch,
  port,
});

// Start health check keepalive to prevent instance sleep
if (env.NODE_ENV === "production") {
  startKeepalive();
}

console.log(`Server running on http://localhost:${port}`);
console.log(`Health check available at http://localhost:${port}/health`);
console.log(`Authentication endpoints at /api/auth`);
console.log(`Transaction endpoints at /api/transactions`);
console.log(`NODE_ENV=${env.NODE_ENV}`);
console.log(`CORS_ORIGIN=${env.CORS_ORIGIN}`);
console.log(`FRONTEND_URL=${env.FRONTEND_URL}`);

// Graceful shutdown
process.on("SIGINT", async () => {
  console.log("Shutting down gracefully...");
  await prisma.$disconnect();
  process.exit(0);
});

process.on("SIGTERM", async () => {
  console.log("Shutting down gracefully...");
  await prisma.$disconnect();
  process.exit(0);
});

// Handle uncaught errors
process.on("uncaughtException", (error) => {
  console.error("Uncaught exception:", error);
  process.exit(1);
});

process.on("unhandledRejection", (reason) => {
  console.error("Unhandled promise rejection:", reason);
  process.exit(1);
});

export default app;
