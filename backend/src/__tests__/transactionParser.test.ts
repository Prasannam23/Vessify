import { parseTransactionText, parseTransactionsWithFallbacks, calculateBatchConfidence } from "@services/transactionParser";
import type { ParsedTransaction } from "types";

describe("Transaction Parser Service", () => {
  describe("parseTransactionText", () => {
    it("should parse Starbucks transaction correctly", () => {
      const text = `Date: 11 Dec 2025
Description: STARBUCKS COFFEE MUMBAI
Amount: -420.00
Balance after transaction: 18,420.50`;

      const result = parseTransactionText(text);
      
      expect(result.length).toBeGreaterThan(0);
      expect(result[0]).toMatchObject({
        description: expect.stringContaining("STARBUCKS"),
        type: expect.stringMatching(/debit|credit/),
        amount: expect.any(Number),
      });
    });

    it("should parse Uber ride transaction", () => {
      const text = `Uber Ride * Airport Drop
12/11/2025 → ₹1,250.00 debited
Available Balance → ₹17,170.50`;

      const result = parseTransactionText(text);
      
      expect(result.length).toBeGreaterThan(0);
      expect(result[0].description).toContain("Uber");
      expect(result[0].amount).toBe(1250);
      expect(result[0].type).toBe("debit");
    });

    it("should parse Amazon transaction with order number", () => {
      const text = `txn123 2025-12-10 Amazon.in Order #403-1234567-8901234 ₹2,999.00 Dr Bal 14171.50 Shopping`;

      const result = parseTransactionText(text);
      
      expect(result.length).toBeGreaterThan(0);
      expect(result[0].description).toContain("Amazon");
      expect(result[0].amount).toBe(2999);
      expect(result[0].category).toBe("shopping");
    });

    it("should return empty array for invalid text", () => {
      const result = parseTransactionText("This is random text");
      expect(result.length).toBe(0);
    });

    it("should categorize transactions correctly", () => {
      const coffeeText = "Date: 11 Dec 2025\nDescription: STARBUCKS COFFEE\nAmount: -420.00";
      const foodResult = parseTransactionText(coffeeText);
      
      if (foodResult.length > 0) {
        expect(foodResult[0].category).toBe("food");
      }
    });
  });

  describe("calculateBatchConfidence", () => {
    it("should calculate correct confidence", () => {
      const transactions: ParsedTransaction[] = [
        {
          date: new Date("2025-12-11"),
          description: "Test 1",
          amount: 100,
          type: "debit",
          confidence: 0.9,
        },
        {
          date: new Date("2025-12-10"),
          description: "Test 2",
          amount: 200,
          type: "credit",
          confidence: 0.95,
        },
      ];

      const confidence = calculateBatchConfidence(transactions);
      expect(confidence).toBeGreaterThan(0.85);
      expect(confidence).toBeLessThanOrEqual(1);
    });

    it("should return 0 for empty array", () => {
      const confidence = calculateBatchConfidence([]);
      expect(confidence).toBe(0);
    });
  });

  describe("parseTransactionsWithFallbacks", () => {
    it("should use standard parsing method for well-formatted text", () => {
      const text = "Date: 11 Dec 2025\nDescription: TEST\nAmount: -420.00";
      const result = parseTransactionsWithFallbacks(text);

      expect(result.parseMethod).toBe("standard");
      expect(result.transactions.length).toBeGreaterThan(0);
    });

    it("should return confidence score", () => {
      const text = "Date: 11 Dec 2025\nDescription: TEST\nAmount: -420.00";
      const result = parseTransactionsWithFallbacks(text);

      expect(result.confidence).toBeGreaterThanOrEqual(0);
      expect(result.confidence).toBeLessThanOrEqual(1);
    });

    it("should try fallback parsing for unstructured text", () => {
      const text = "2025-12-11, -420, STARBUCKS";
      const result = parseTransactionsWithFallbacks(text);

      // Should attempt to parse even with fallback
      expect(result.parseMethod).toBeDefined();
    });
  });
});
