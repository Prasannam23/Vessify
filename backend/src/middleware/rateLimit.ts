import type { Context, Next } from "hono";

// Simple in-memory rate limiter keyed by userId
// For production, use Redis or a durable store.

type Window = {
  resetAt: number;
  count: number;
};

const windows: Map<string, Window> = new Map();

export function rateLimit(options: { limit: number; windowMs: number }) {
  const { limit, windowMs } = options;

  return async (c: Context, next: Next) => {
    // Identify key: prefer authenticated userId, else IP
    const ip = c.req.header("x-forwarded-for") || c.req.header("x-real-ip") || "ip:" + (c.get("remoteAddr") || "unknown");
    const auth = (c as any).get?.("auth");
    const key = auth?.userId ? `user:${auth.userId}` : `ip:${ip}`;

    const now = Date.now();
    const w = windows.get(key);

    if (!w || w.resetAt <= now) {
      windows.set(key, { count: 1, resetAt: now + windowMs });
      return await next();
    }

    if (w.count >= limit) {
      const retryAfter = Math.max(0, Math.ceil((w.resetAt - now) / 1000));
      return c.json(
        {
          success: false,
          error: {
            code: "RATE_LIMITED",
            message: `Too many requests. Try again in ${retryAfter}s`,
          },
        },
        429
      );
    }

    w.count += 1;
    windows.set(key, w);
    return await next();
  };
}
