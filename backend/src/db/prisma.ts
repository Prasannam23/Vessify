import { PrismaClient } from "@prisma/client";
import { decimalToStringExtension, autoAuditLoggingExtension } from "./prismaExtensions";

let prisma: any;

if (process.env.NODE_ENV === "production") {
  const base = new PrismaClient();
  prisma = base
    .$extends(decimalToStringExtension())
    .$extends(autoAuditLoggingExtension());
} else {
  // @ts-expect-error - global is not typed
  if (!global.prisma) {
    const base = new PrismaClient({
      log: ["error", "warn"],
    });
    // @ts-expect-error - global is not typed
    global.prisma = base
      .$extends(decimalToStringExtension())
      .$extends(autoAuditLoggingExtension());
  }
  // @ts-expect-error - global is not typed
  prisma = global.prisma;
}

export default prisma as PrismaClient;
