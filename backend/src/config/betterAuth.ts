import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import prisma from "@/db/prisma";
import { env } from "@/config/env";

/**
 * Better Auth Configuration
 * Using Prisma adapter for database integration
 * Primary purpose: Database schema support, session management, and auth infrastructure
 */
export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),
  appName: "Vessify Transaction Extractor",
  secret: env.JWT_SECRET,
  trustedOrigins: [env.FRONTEND_URL || "http://localhost:3000"],
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false,
  },
  session: {
    expiresIn: 7 * 24 * 60 * 60, // 7 days
    updateAge: 24 * 60 * 60, // Update every 24 hours
    cookieCache: {
      enabled: true,
      maxAge: 5 * 60, // 5 minutes
    },
  },
});

/**
 * Helper function to hash password using Better Auth's internal mechanism
 * Better Auth uses bcryptjs internally
 */
import bcryptjs from "bcryptjs";

export async function hashPassword(password: string): Promise<string> {
  const salt = await bcryptjs.genSalt(10);
  return bcryptjs.hash(password, salt);
}

/**
 * Helper function to verify password
 */
export async function verifyPassword(
  password: string,
  hashedPassword: string
): Promise<boolean> {
  return bcryptjs.compare(password, hashedPassword);
}
