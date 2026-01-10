import prisma from "@db/prisma";
import type { ParsedTransaction, PaginationParams } from "types";
import { Decimal } from "@prisma/client/runtime/library";
import { validateUserOrgAccess } from "@services/userService";

/**
 * Transaction Database Service
 * Handles all database operations with enforced data isolation
 */

/**
 * Save parsed transactions to database
 * CRITICAL: Always enforce userId and organizationId for isolation
 * Validates user organization access before saving
 */
export async function saveTransactions(
  userId: string,
  organizationId: string,
  transactions: ParsedTransaction[],
  rawText: string,
  confidence: number
): Promise<import("@prisma/client").Transaction[]> {
  if (!userId || !organizationId) {
    throw new Error("User ID and Organization ID are required for data isolation");
  }

  // Validate user has access to this organization
  await validateUserOrgAccess(userId, organizationId);

  const created = await Promise.all(
    transactions.map((txn) =>
      prisma.transaction.create({
        data: {
          userId,
          organizationId,
          date: txn.date,
          description: txn.description,
          amount: new Decimal(txn.amount.toString()),
          type: txn.type,
          category: txn.category,
          balance: txn.balance ? new Decimal(txn.balance.toString()) : null,
          confidence: txn.confidence,
          rawText,
          metadata: {
            parseMethod: "standard",
            originalIndex: transactions.indexOf(txn),
            batchConfidence: confidence,
          },
        },
      })
    )
  );

  return created;
}

/**
 * Get user transactions with cursor-based pagination
 * CRITICAL: Filter by userId AND organizationId
 * Validates user organization access before querying
 */
export async function getUserTransactions(
  userId: string,
  organizationId: string,
  params: PaginationParams & { sortBy?: "date" | "createdAt"; order?: "asc" | "desc" }
) {
  if (!userId || !organizationId) {
    throw new Error("User ID and Organization ID are required");
  }

  // Validate user has access to this organization
  await validateUserOrgAccess(userId, organizationId);

  const limit = Math.min(params.limit, 100); // Cap at 100
  const sortBy = params.sortBy || "date";
  const order = params.order || "desc";

  // Build cursor condition
  const cursorCondition = params.cursor
    ? {
        [sortBy]: {
          [order === "asc" ? "gt" : "lt"]: params.cursor,
        },
      }
    : {};

  const transactions = await prisma.transaction.findMany({
    where: {
      userId,
      organizationId, // Data isolation
      ...cursorCondition,
    },
    orderBy: {
      [sortBy]: order,
    },
    take: limit + 1, // +1 to determine if there are more
    select: {
      id: true,
      date: true,
      description: true,
      amount: true,
      type: true,
      category: true,
      balance: true,
      confidence: true,
      createdAt: true,
    },
  });

  const hasMore = transactions.length > limit;
  const items = transactions.slice(0, limit);
  const nextCursor = hasMore ? items[items.length - 1]?.[sortBy as keyof typeof items[0]] : null;

  return {
    items: items.map((txn) => ({
      ...txn,
      amount: txn.amount.toString(),
      balance: txn.balance?.toString(),
    })),
    pageInfo: {
      hasMore,
      nextCursor,
    },
  };
}

/**
 * Get transaction by ID with ownership verification
 */
export async function getTransactionById(id: string, userId: string, organizationId: string) {
  if (!userId || !organizationId) {
    throw new Error("User ID and Organization ID are required");
  }

  const transaction = await prisma.transaction.findFirst({
    where: {
      id,
      userId,
      organizationId, // Ownership check
    },
  });

  if (!transaction) {
    return null;
  }

  return {
    ...transaction,
    amount: transaction.amount.toString(),
    balance: transaction.balance?.toString(),
  };
}

/**
 * Delete transaction with ownership verification
 */
export async function deleteTransaction(id: string, userId: string, organizationId: string) {
  if (!userId || !organizationId) {
    throw new Error("User ID and Organization ID are required");
  }

  // Verify ownership before deletion
  const transaction = await prisma.transaction.findFirst({
    where: {
      id,
      userId,
      organizationId,
    },
  });

  if (!transaction) {
    throw new Error("Transaction not found or access denied");
  }

  await prisma.transaction.delete({
    where: { id },
  });

  return { success: true };
}

/**
 * Update transaction with ownership verification
 */
export async function updateTransaction(
  id: string,
  userId: string,
  organizationId: string,
  updates: {
    description?: string;
    category?: string;
    amount?: number;
    type?: "debit" | "credit";
    date?: Date;
  }
) {
  if (!userId || !organizationId) {
    throw new Error("User ID and Organization ID are required");
  }

  // Verify ownership before update
  const transaction = await prisma.transaction.findFirst({
    where: {
      id,
      userId,
      organizationId,
    },
  });

  if (!transaction) {
    throw new Error("Transaction not found or access denied");
  }

  const updated = await prisma.transaction.update({
    where: { id },
    data: {
      ...(updates.description && { description: updates.description }),
      ...(updates.category !== undefined && { category: updates.category }),
      ...(updates.amount && { amount: new Decimal(updates.amount.toString()) }),
      ...(updates.type && { type: updates.type }),
      ...(updates.date && { date: updates.date }),
    },
  });

  return {
    ...updated,
    amount: updated.amount.toString(),
    balance: updated.balance?.toString(),
  };
}

/**
 * Get transaction statistics for user
 * Validates organization access before retrieving stats
 */
export async function getTransactionStats(userId: string, organizationId: string) {
  if (!userId || !organizationId) {
    throw new Error("User ID and Organization ID are required");
  }

  // Validate user has access to this organization
  await validateUserOrgAccess(userId, organizationId);

  const stats = await prisma.transaction.aggregate({
    where: {
      userId,
      organizationId,
    },
    _sum: {
      amount: true,
    },
    _count: true,
  });

  const byType = await prisma.transaction.groupBy({
    by: ["type"],
    where: {
      userId,
      organizationId,
    },
    _sum: {
      amount: true,
    },
    _count: true,
  });

  const byCategory = await prisma.transaction.groupBy({
    by: ["category"],
    where: {
      userId,
      organizationId,
      category: {
        not: null,
      },
    },
    _sum: {
      amount: true,
    },
    _count: true,
  });

  return {
    totalTransactions: stats._count,
    totalAmount: stats._sum.amount?.toString() || "0",
    byType: byType.map((t) => ({
      type: t.type,
      count: t._count,
      amount: t._sum.amount?.toString() || "0",
    })),
    byCategory: byCategory.map((c) => ({
      category: c.category,
      count: c._count,
      amount: c._sum.amount?.toString() || "0",
    })),
  };
}

/**
 * Audit log for tracking access
 */
export async function logAuditEvent(
  userId: string,
  organizationId: string,
  action: string,
  resource: string,
  resourceId?: string,
  changes?: unknown
) {
  await prisma.auditLog.create({
    data: {
      userId,
      organizationId,
      action,
      resource,
      resourceId,
      changes: changes ? changes : undefined,
      ip: "", // Would come from request context
      userAgent: "", // Would come from request context
    },
  });
}
