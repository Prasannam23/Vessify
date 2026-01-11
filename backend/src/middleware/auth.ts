import { Context, Next } from "hono";
import { createMiddleware } from "hono/factory";
import prisma from "../db/prisma.js";
import { verifyToken } from "../utils/token.js";
import { setRequestContext } from "../db/context.js";
import type { AuthContext } from "types";

/**
 * Authentication middleware
 * Verifies JWT token (compatible with Better Auth) and attaches user context to request
 */
export const authMiddleware = createMiddleware(async (c: Context, next: Next) => {
  try {
    const authHeader = c.req.header("Authorization");
    const token = authHeader?.replace("Bearer ", "") || "";

    if (!token) {
      c.set("auth", {
        session: null,
        isAuthenticated: false,
      } as AuthContext);
      return next();
    }

    // Verify token
    const payload = await verifyToken(token);

    if (!payload) {
      c.set("auth", {
        session: null,
        isAuthenticated: false,
      } as AuthContext);
      return next();
    }

    // Fetch user from database with organization
    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
      include: {
        organizations: {
          include: { organization: true },
          take: 1,
        },
      },
    });

    if (!user) {
      c.set("auth", {
        session: null,
        isAuthenticated: false,
      } as AuthContext);
      return next();
    }

    // Get primary organization
    const primaryOrg = user.organizations[0];

    const authContext: AuthContext = {
      session: {
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          image: user.image,
          emailVerified: user.emailVerified,
          createdAt: user.createdAt,
        },
      },
      userId: user.id,
      organizationId: primaryOrg?.organizationId,
      isAuthenticated: true,
    };

    c.set("auth", authContext);

    // Set request context for Prisma extensions (audit logging, etc.)
    if (user.id && primaryOrg?.organizationId) {
      const ip = c.req.header("x-forwarded-for") || c.req.header("x-real-ip") || undefined;
      const userAgent = c.req.header("user-agent") || undefined;
      setRequestContext({
        userId: user.id,
        organizationId: primaryOrg.organizationId,
        ip,
        userAgent,
      });
    }

    return next();
  } catch (error) {
    console.error("Auth middleware error:", error);
    c.set("auth", {
      session: null,
      isAuthenticated: false,
    } as AuthContext);
    return next();
  }
});

/**
 * Protected route middleware
 * Ensures user is authenticated
 */
export const protectedRoute = createMiddleware(async (c: Context, next: Next) => {
  const auth = c.get("auth") as AuthContext;
  if (!auth?.isAuthenticated || !auth?.userId || !auth?.organizationId) {
    return c.json(
      {
        success: false,
        error: {
          code: "UNAUTHORIZED",
          message: "Authentication required",
        },
      },
      401
    );
  }

  return next();
});

/**
 * Error handling middleware
 */
export const errorHandler = (error: Error, c: Context) => {
  console.error("Error:", error);
  
  if (error.message.includes("Unauthorized")) {
    return c.json(
      {
        success: false,
        error: {
          code: "UNAUTHORIZED",
          message: "Unauthorized access",
        },
      },
      401
    );
  }

  return c.json(
    {
      success: false,
      error: {
        code: "INTERNAL_SERVER_ERROR",
        message: "An unexpected error occurred",
        details: process.env.NODE_ENV === "development" ? error.message : undefined,
      },
    },
    500
  );
};
