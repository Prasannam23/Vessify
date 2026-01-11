import { Hono, type Context } from "hono";
import prisma from "../db/prisma.js";
import { z } from "zod";
import { hashPassword, verifyPassword } from "../config/betterAuth.js";
import { createToken, verifyToken } from "../utils/token.js";
import type { ApiResponse } from "types";

const authRoutes = new Hono();

const registerSchema = z.object({
  name: z.string().min(1).optional(),
  email: z.string().email(),
  password: z.string().min(8),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

/**
 * POST /api/auth/register
 * Create a new user with Better Auth-compatible schema and create default organization
 */
authRoutes.post("/register", async (c: Context) => {
  try {
    const body = await c.req.json();
    const parsed = registerSchema.parse(body);

    // Check if email already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: parsed.email },
    });

    if (existingUser) {
      return c.json<ApiResponse<unknown>>(
        {
          success: false,
          error: { code: "CONFLICT", message: "Email already in use" },
        },
        409
      );
    }

    // Hash password
    const hashedPassword = await hashPassword(parsed.password);

    // Create user with Better Auth-compatible schema
    const user = await prisma.user.create({
      data: {
        email: parsed.email,
        name: parsed.name || parsed.email.split("@")[0],
        password: hashedPassword,
        emailVerified: false,
      },
    });

    // Create default organization for user
    const orgName = `${parsed.name || "My"} Organization`;
    const slug = `org_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const organization = await prisma.organization.create({
      data: {
        id: `org_${Date.now()}`,
        name: orgName,
        slug: slug,
        createdAt: new Date(),
      },
    });

    // Add user as member of the organization
    await prisma.organizationMember.create({
      data: {
        organizationId: organization.id,
        userId: user.id,
        role: "owner",
      },
    });

    // Create JWT token (compatible with Better Auth session model)
    const token = await createToken(user.id, user.email);

    return c.json<ApiResponse<unknown>>(
      {
        success: true,
        data: {
          user: { id: user.id, email: user.email, name: user.name },
          token,
          organization: { id: organization.id, name: organization.name },
        },
      },
      201
    );
  } catch (err: any) {
    console.error("Register error:", err);
    const message = err?.message?.includes("Unique constraint failed") ? "Email already in use" : "Invalid register request";
    const status = message.includes("already") ? 409 : 400;
    
    return c.json<ApiResponse<unknown>>(
      {
        success: false,
        error: { code: status === 409 ? "CONFLICT" : "INVALID_REQUEST", message },
      },
      status
    );
  }
});

/**
 * POST /api/auth/login
 * Authenticate user and return session token
 */
authRoutes.post("/login", async (c: Context) => {
  try {
    const body = await c.req.json();
    const parsed = loginSchema.parse(body);

    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email: parsed.email },
    });

    if (!user) {
      return c.json<ApiResponse<unknown>>(
        {
          success: false,
          error: { code: "UNAUTHORIZED", message: "Invalid credentials" },
        },
        401
      );
    }

    // Verify password
    const passwordValid = await verifyPassword(parsed.password, user.password);
    if (!passwordValid) {
      return c.json<ApiResponse<unknown>>(
        {
          success: false,
          error: { code: "UNAUTHORIZED", message: "Invalid credentials" },
        },
        401
      );
    }

    // Create session token
    const token = await createToken(user.id, user.email);

    return c.json<ApiResponse<unknown>>({
      success: true,
      data: {
        user: { id: user.id, email: user.email, name: user.name },
        token,
      },
    });
  } catch (err) {
    console.error("Login error:", err);
    return c.json<ApiResponse<unknown>>(
      {
        success: false,
        error: { code: "INVALID_REQUEST", message: "Invalid login request" },
      },
      400
    );
  }
});

/**
 * GET /api/auth/session
 * Return current session info if token is valid
 */
authRoutes.get("/session", async (c) => {
  try {
    const authHeader = c.req.header("Authorization");
    const token = authHeader?.replace("Bearer ", "") || "";

    if (!token) {
      return c.json<ApiResponse<unknown>>({ success: true, data: { session: null } });
    }

    // Verify token
    const payload = await verifyToken(token);
    if (!payload) {
      return c.json<ApiResponse<unknown>>({ success: true, data: { session: null } });
    }

    // Fetch user from database
    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
    });

    if (!user) {
      return c.json<ApiResponse<unknown>>({ success: true, data: { session: null } });
    }

    return c.json<ApiResponse<unknown>>({
      success: true,
      data: {
        session: {
          user: { id: user.id, email: user.email, name: user.name },
        },
      },
    });
  } catch (err) {
    console.error("Session error:", err);
    return c.json<ApiResponse<unknown>>({ success: true, data: { session: null } });
  }
});

/**
 * POST /api/auth/sign-out
 * Sign out user (stateless - client removes token)
 */
authRoutes.post("/sign-out", async (c) => {
  return c.json<ApiResponse<unknown>>({ success: true, data: { message: "Signed out" } });
});

export default authRoutes;
