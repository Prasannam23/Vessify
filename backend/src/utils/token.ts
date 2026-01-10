/**
 * Token utility functions for JWT handling
 */

import { jwtVerify, SignJWT } from "jose";
import { env } from "@config/env";

const secret = new TextEncoder().encode(env.JWT_SECRET);

export interface TokenPayload {
  sub: string; // user ID
  email: string;
  iat: number;
  exp: number;
}

/**
 * Create a JWT token
 */
export async function createToken(userId: string, email: string): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const expiresIn = 7 * 24 * 60 * 60; // 7 days

  const token = await new SignJWT({
    sub: userId,
    email,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt(now)
    .setExpirationTime(now + expiresIn)
    .sign(secret);

  return token;
}

/**
 * Verify and decode JWT token
 */
export async function verifyToken(token: string): Promise<TokenPayload | null> {
  try {
    const verified = await jwtVerify(token, secret);
    const p: any = verified.payload as unknown;
    return {
      sub: String(p.sub),
      email: String(p.email ?? ""),
      iat: Number(p.iat ?? 0),
      exp: Number(p.exp ?? 0),
    } as TokenPayload;
  } catch (error) {
    console.error("Token verification failed:", error);
    return null;
  }
}

/**
 * Extract token from Authorization header
 */
export function extractToken(authHeader?: string): string | null {
  if (!authHeader?.startsWith("Bearer ")) {
    return null;
  }
  return authHeader.slice(7);
}

/**
 * Check if token is expired
 */
export function isTokenExpired(token: TokenPayload): boolean {
  return token.exp < Math.floor(Date.now() / 1000);
}
