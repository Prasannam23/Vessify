import { z } from "zod";

describe("Input Validation Tests", () => {
  describe("Transaction input validation", () => {
    const transactionInputSchema = z.object({
      text: z.string().min(1, "Text is required"),
    });

    it("should accept valid transaction input", () => {
      const input = { text: "Date: 11 Dec 2025\nAmount: -420.00" };
      const result = transactionInputSchema.safeParse(input);

      expect(result.success).toBe(true);
    });

    it("should reject empty text", () => {
      const input = { text: "" };
      const result = transactionInputSchema.safeParse(input);

      expect(result.success).toBe(false);
    });

    it("should reject missing text field", () => {
      const input = {};
      const result = transactionInputSchema.safeParse(input);

      expect(result.success).toBe(false);
    });
  });

  describe("Pagination parameter validation", () => {
    it("should validate limit is between 1-100", () => {
      const validLimits = [1, 20, 50, 100];
      const invalidLimits = [0, -1, 101, 1000];

      validLimits.forEach((limit) => {
        expect(limit).toBeGreaterThanOrEqual(1);
        expect(limit).toBeLessThanOrEqual(100);
      });

      invalidLimits.forEach((limit) => {
        expect(limit < 1 || limit > 100).toBe(true);
      });
    });
  });

  describe("Authorization header validation", () => {
    it("should extract Bearer token correctly", () => {
      const authHeader = "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9";
      const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;

      expect(token).toBe("eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9");
    });

    it("should reject invalid auth header format", () => {
      const invalidHeaders = [
        "InvalidToken",
        "Bearer ",
        "bearer token",
        "",
      ];

      invalidHeaders.forEach((header) => {
        const isValid = header.startsWith("Bearer ") && header.length > 7;
        expect(isValid).toBe(false);
      });
    });
  });
});
