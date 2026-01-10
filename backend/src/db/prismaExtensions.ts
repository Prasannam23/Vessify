import { Prisma } from "@prisma/client";
import { Decimal } from "@prisma/client/runtime/library";

/**
 * Prisma Extension: Auto Decimal to String Conversion
 * Converts all Decimal fields (amount, balance) to strings in query results
 * This eliminates manual .toString() calls throughout the codebase
 */
export function decimalToStringExtension() {
  return Prisma.defineExtension((client) =>
    client.$extends({
      result: {
        transaction: {
          amount: {
            compute(fields) {
              return fields.amount instanceof Decimal
                ? fields.amount.toString()
                : String(fields.amount);
            },
          },
          balance: {
            compute(fields) {
              if (!fields.balance) return null;
              return fields.balance instanceof Decimal
                ? fields.balance.toString()
                : String(fields.balance);
            },
          },
        },
      },
    })
  );
}

/**
 * Prisma Extension: Auto Audit Logging
 * Logs CREATE/UPDATE/DELETE operations on Transaction model to AuditLog
 * Uses AsyncLocalStorage request context when available; falls back to record fields
 */
import { getRequestContext } from "@db/context";

export function autoAuditLoggingExtension() {
  return Prisma.defineExtension((client) =>
    client.$extends({
      query: {
        transaction: {
          async create({ args, query }) {
            const result = await query(args);

            try {
              const ctx = getRequestContext();
              const userId = (result as any).userId || ctx?.userId;
              const organizationId = (result as any).organizationId || ctx?.organizationId;

              if (userId && organizationId) {
                await client.auditLog.create({
                  data: {
                    userId,
                    organizationId,
                    action: "CREATE",
                    resource: "transaction",
                    resourceId: (result as any).id,
                    changes: args?.data ? { after: args.data } : undefined,
                  },
                });
              }
            } catch (e) {
              // Do not block main operation on audit failure
            }

            return result;
          },
          async update({ args, query }) {
            // Fetch before
            let before: any = null;
            try {
              if ((args as any).where?.id) {
                before = await client.transaction.findUnique({
                  where: { id: (args as any).where.id },
                });
              }
            } catch {}

            const result = await query(args);

            try {
              const ctx = getRequestContext();
              const userId = (result as any).userId || before?.userId || ctx?.userId;
              const organizationId = (result as any).organizationId || before?.organizationId || ctx?.organizationId;

              if (userId && organizationId) {
                await client.auditLog.create({
                  data: {
                    userId,
                    organizationId,
                    action: "UPDATE",
                    resource: "transaction",
                    resourceId: (result as any).id,
                    changes: {
                      before,
                      after: args?.data || null,
                    },
                  },
                });
              }
            } catch {}

            return result;
          },
          async delete({ args, query }) {
            // Fetch before
            let before: any = null;
            try {
              if ((args as any).where?.id) {
                before = await client.transaction.findUnique({
                  where: { id: (args as any).where.id },
                });
              }
            } catch {}

            const result = await query(args);

            try {
              const ctx = getRequestContext();
              const userId = before?.userId || ctx?.userId;
              const organizationId = before?.organizationId || ctx?.organizationId;

              if (userId && organizationId) {
                await client.auditLog.create({
                  data: {
                    userId,
                    organizationId,
                    action: "DELETE",
                    resource: "transaction",
                    resourceId: before?.id || null,
                    changes: before ? { before } : undefined,
                  },
                });
              }
            } catch {}

            return result;
          },
        },
        organizationMember: {
          async create({ args, query }) {
            const result = await query(args);
            try {
              const ctx = getRequestContext();
              const userId = (result as any).userId || ctx?.userId;
              const organizationId = (result as any).organizationId || ctx?.organizationId;
              if (userId && organizationId) {
                await client.auditLog.create({
                  data: {
                    userId,
                    organizationId,
                    action: "CREATE",
                    resource: "organization_member",
                    resourceId: (result as any).id,
                    changes: args?.data ? { after: args.data } : undefined,
                    ip: ctx?.ip,
                    userAgent: ctx?.userAgent,
                  },
                });
              }
            } catch {}
            return result;
          },
          async update({ args, query }) {
            let before: any = null;
            try {
              if ((args as any).where?.id) {
                before = await client.organizationMember.findUnique({ where: { id: (args as any).where.id } });
              }
            } catch {}
            const result = await query(args);
            try {
              const ctx = getRequestContext();
              const userId = (result as any).userId || before?.userId || ctx?.userId;
              const organizationId = (result as any).organizationId || before?.organizationId || ctx?.organizationId;
              if (userId && organizationId) {
                await client.auditLog.create({
                  data: {
                    userId,
                    organizationId,
                    action: "UPDATE",
                    resource: "organization_member",
                    resourceId: (result as any).id,
                    changes: { before, after: args?.data || null },
                    ip: ctx?.ip,
                    userAgent: ctx?.userAgent,
                  },
                });
              }
            } catch {}
            return result;
          },
          async delete({ args, query }) {
            let before: any = null;
            try {
              if ((args as any).where?.id) {
                before = await client.organizationMember.findUnique({ where: { id: (args as any).where.id } });
              }
            } catch {}
            const result = await query(args);
            try {
              const ctx = getRequestContext();
              const userId = before?.userId || ctx?.userId;
              const organizationId = before?.organizationId || ctx?.organizationId;
              if (userId && organizationId) {
                await client.auditLog.create({
                  data: {
                    userId,
                    organizationId,
                    action: "DELETE",
                    resource: "organization_member",
                    resourceId: before?.id || null,
                    changes: before ? { before } : undefined,
                    ip: ctx?.ip,
                    userAgent: ctx?.userAgent,
                  },
                });
              }
            } catch {}
            return result;
          },
        },
        organization: {
          async create({ args, query }) {
            const result = await query(args);
            try {
              const ctx = getRequestContext();
              const userId = ctx?.userId;
              const organizationId = (result as any).id;
              if (userId && organizationId) {
                await client.auditLog.create({
                  data: {
                    userId,
                    organizationId,
                    action: "CREATE",
                    resource: "organization",
                    resourceId: organizationId,
                    changes: args?.data ? { after: args.data } : undefined,
                    ip: ctx?.ip,
                    userAgent: ctx?.userAgent,
                  },
                });
              }
            } catch {}
            return result;
          },
          async update({ args, query }) {
            let before: any = null;
            try {
              if ((args as any).where?.id) {
                before = await client.organization.findUnique({ where: { id: (args as any).where.id } });
              }
            } catch {}
            const result = await query(args);
            try {
              const ctx = getRequestContext();
              const userId = ctx?.userId;
              const organizationId = (result as any).id || before?.id;
              if (userId && organizationId) {
                await client.auditLog.create({
                  data: {
                    userId,
                    organizationId,
                    action: "UPDATE",
                    resource: "organization",
                    resourceId: organizationId,
                    changes: { before, after: args?.data || null },
                    ip: ctx?.ip,
                    userAgent: ctx?.userAgent,
                  },
                });
              }
            } catch {}
            return result;
          },
          async delete({ args, query }) {
            let before: any = null;
            try {
              if ((args as any).where?.id) {
                before = await client.organization.findUnique({ where: { id: (args as any).where.id } });
              }
            } catch {}
            const result = await query(args);
            try {
              const ctx = getRequestContext();
              const userId = ctx?.userId;
              const organizationId = before?.id || null;
              if (userId && organizationId) {
                await client.auditLog.create({
                  data: {
                    userId,
                    organizationId,
                    action: "DELETE",
                    resource: "organization",
                    resourceId: organizationId,
                    changes: before ? { before } : undefined,
                    ip: ctx?.ip,
                    userAgent: ctx?.userAgent,
                  },
                });
              }
            } catch {}
            return result;
          },
        },
      },
    })
  );
}
