import type { HonoRequest } from "hono";

export interface Session {
  user: {
    id: string;
    name?: string | null;
    email: string;
    image?: string | null;
    emailVerified?: boolean;
    createdAt?: Date;
  };
}

export interface AuthContext {
  session: Session | null;
  userId?: string;
  organizationId?: string;
  isAuthenticated: boolean;
}

export interface AppRequest extends HonoRequest {
  auth?: AuthContext;
}

export interface PaginationParams {
  cursor?: string;
  limit: number;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
}

export interface TransactionInput {
  text: string;
}

export interface ParsedTransaction {
  date: Date;
  description: string;
  amount: number;
  type: "debit" | "credit";
  category?: string;
  balance?: number;
  confidence: number;
}
