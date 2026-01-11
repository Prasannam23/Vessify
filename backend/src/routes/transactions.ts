import { Hono, type Context } from "hono";
import { z } from "zod";
import { protectedRoute } from "../middleware/auth.js";
import { rateLimit } from "../middleware/rateLimit.js";
import { parseTransactionsWithFallbacks } from "../services/transactionParser.js";
import {
  saveTransactions,
  getUserTransactions,
  getTransactionStats,
  deleteTransaction,
  updateTransaction,
} from "../services/transactionDb.js";
import type { AuthContext, ApiResponse } from "types";
import type { Transaction } from "@prisma/client";

const transactionRoutes = new Hono();

// Validation schemas
const transactionInputSchema = z.object({
  text: z.string().min(1, "Transaction text is required"),
});

const paginationSchema = z.object({
  sortBy: z.enum(["date", "createdAt"]).default("date"),
  order: z.enum(["asc", "desc"]).default("desc"),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  cursor: z.string().optional(),
});

/**
 * POST /api/transactions/extract
 * Parse and save transactions from raw text
 */
transactionRoutes.post(
  "/extract",
  protectedRoute,
  rateLimit({ limit: 30, windowMs: 60_000 }),
  async (c: Context) => {
    try {
      const auth = (c as any).get("auth") as AuthContext;
      const body = await c.req.json();

      // Validate input
      const validation = transactionInputSchema.safeParse(body);
      if (!validation.success) {
        return c.json(
          {
            success: false,
            error: {
              code: "VALIDATION_ERROR",
              message: "Invalid request body",
              details: validation.error.errors,
            },
          } as ApiResponse<null>,
          400
        );
      }

      const { text } = validation.data;

      // Parse transactions
      const parseResult = parseTransactionsWithFallbacks(text);

      if (parseResult.transactions.length === 0) {
        return c.json(
          {
            success: false,
            error: {
              code: "PARSE_ERROR",
              message: "Could not extract any transactions from the provided text",
            },
          } as ApiResponse<null>,
          400
        );
      }

      // Save to database
      const saved: Transaction[] = await saveTransactions(
        auth.userId!,
        auth.organizationId!,
        parseResult.transactions,
        text,
        parseResult.confidence
      );

      // Audit logging is now automatic via Prisma extension

      return c.json(
        {
          success: true,
          data: {
            transactions: saved.map((t: Transaction) => ({
              id: t.id,
              date: t.date,
              description: t.description,
              amount: String(t.amount),
              type: t.type,
              category: t.category,
              balance: t.balance != null ? String(t.balance) : undefined,
              confidence: t.confidence,
              createdAt: t.createdAt,
            })),
            summary: {
              count: saved.length,
              confidence: parseResult.confidence,
              parseMethod: parseResult.parseMethod,
            },
          },
        } as ApiResponse<{
          transactions: any[];
          summary: {
            count: number;
            confidence: number;
            parseMethod: string;
          };
        }>,
        201
      );
    } catch (error) {
      console.error("Error extracting transactions:", error);
      return c.json(
        {
          success: false,
          error: {
            code: "INTERNAL_SERVER_ERROR",
            message: "Failed to extract transactions",
          },
        } as ApiResponse<null>,
        500
      );
    }
  }
);

/**
 * GET /api/transactions
 * Get user's transactions with pagination
 */
transactionRoutes.get(
  "/",
  protectedRoute,
  rateLimit({ limit: 60, windowMs: 60_000 }),
  async (c: Context) => {
    try {
      const auth = (c as any).get("auth") as AuthContext;
      const cursor = c.req.query("cursor");
      const limitStr = c.req.query("limit") || "20";
      const sortByStr = c.req.query("sortBy") || "date";
      const orderStr = c.req.query("order") || "desc";

      // Validate pagination parameters
      const paginationValidation = paginationSchema.safeParse({
        cursor,
        limit: limitStr,
        sortBy: sortByStr,
        order: orderStr,
      });

      if (!paginationValidation.success) {
        return c.json(
          {
            success: false,
            error: {
              code: "VALIDATION_ERROR",
              message: "Invalid pagination parameters",
              details: paginationValidation.error.errors,
            },
          } as ApiResponse<null>,
          400
        );
      }

      const { cursor: validCursor, limit, sortBy, order } = paginationValidation.data;

      const result = await getUserTransactions(
        auth.userId!,
        auth.organizationId!,
        {
          cursor: validCursor,
          limit,
          sortBy,
          order,
        }
      );

      return c.json({
        success: true,
        data: result,
      } as ApiResponse<any>);
    } catch (error) {
      console.error("Error fetching transactions:", error);
      return c.json(
        {
          success: false,
          error: {
            code: "INTERNAL_SERVER_ERROR",
            message: "Failed to fetch transactions",
          },
        } as ApiResponse<null>,
        500
      );
    }
  }
);

/**
 * GET /api/transactions/stats
 * Get transaction statistics
 */
transactionRoutes.get(
  "/stats",
  protectedRoute,
  rateLimit({ limit: 60, windowMs: 60_000 }),
  async (c: Context) => {
    try {
      const auth = (c as any).get("auth") as AuthContext;

      const stats = await getTransactionStats(auth.userId!, auth.organizationId!);

      return c.json({
        success: true,
        data: stats,
      } as ApiResponse<any>);
    } catch (error) {
      console.error("Error fetching stats:", error);
      return c.json(
        {
          success: false,
          error: {
            code: "INTERNAL_SERVER_ERROR",
            message: "Failed to fetch statistics",
          },
        } as ApiResponse<null>,
        500
      );
    }
  }
);

/**
 * DELETE /api/transactions/:id
 * Delete a transaction by ID
 */
transactionRoutes.delete(
  "/:id",
  protectedRoute,
  rateLimit({ limit: 30, windowMs: 60_000 }),
  async (c: Context) => {
    try {
      const auth = (c as any).get("auth") as AuthContext;
      const id = c.req.param("id");

      if (!id) {
        return c.json(
          {
            success: false,
            error: {
              code: "VALIDATION_ERROR",
              message: "Transaction ID is required",
            },
          } as ApiResponse<null>,
          400
        );
      }

      await deleteTransaction(id, auth.userId!, auth.organizationId!);

      return c.json({
        success: true,
        data: { message: "Transaction deleted successfully" },
      } as ApiResponse<any>);
    } catch (error: any) {
      console.error("Error deleting transaction:", error);
      
      if (error.message?.includes("not found") || error.message?.includes("access denied")) {
        return c.json(
          {
            success: false,
            error: {
              code: "NOT_FOUND",
              message: error.message || "Transaction not found",
            },
          } as ApiResponse<null>,
          404
        );
      }

      return c.json(
        {
          success: false,
          error: {
            code: "INTERNAL_SERVER_ERROR",
            message: "Failed to delete transaction",
          },
        } as ApiResponse<null>,
        500
      );
    }
  }
);

/**
 * PUT /api/transactions/:id
 * Update a transaction by ID
 */
transactionRoutes.put(
  "/:id",
  protectedRoute,
  rateLimit({ limit: 30, windowMs: 60_000 }),
  async (c: Context) => {
    try {
      const auth = (c as any).get("auth") as AuthContext;
      const id = c.req.param("id");
      const body = await c.req.json();

      if (!id) {
        return c.json(
          {
            success: false,
            error: {
              code: "VALIDATION_ERROR",
              message: "Transaction ID is required",
            },
          } as ApiResponse<null>,
          400
        );
      }

      // Validate update fields
      const updateSchema = z.object({
        description: z.string().min(1).optional(),
        category: z.string().optional(),
        amount: z.number().positive().optional(),
        type: z.enum(["debit", "credit"]).optional(),
        date: z.string().datetime().optional(),
      });

      const validation = updateSchema.safeParse(body);
      if (!validation.success) {
        return c.json(
          {
            success: false,
            error: {
              code: "VALIDATION_ERROR",
              message: "Invalid update data",
              details: validation.error.errors,
            },
          } as ApiResponse<null>,
          400
        );
      }

      const updates = validation.data;
      const updatedTransaction = await updateTransaction(
        id,
        auth.userId!,
        auth.organizationId!,
        {
          ...updates,
          date: updates.date ? new Date(updates.date) : undefined,
        }
      );

      return c.json({
        success: true,
        data: updatedTransaction,
      } as ApiResponse<any>);
    } catch (error: any) {
      console.error("Error updating transaction:", error);
      
      if (error.message?.includes("not found") || error.message?.includes("access denied")) {
        return c.json(
          {
            success: false,
            error: {
              code: "NOT_FOUND",
              message: error.message || "Transaction not found",
            },
          } as ApiResponse<null>,
          404
        );
      }

      return c.json(
        {
          success: false,
          error: {
            code: "INTERNAL_SERVER_ERROR",
            message: "Failed to update transaction",
          },
        } as ApiResponse<null>,
        500
      );
    }
  }
);

export default transactionRoutes;
