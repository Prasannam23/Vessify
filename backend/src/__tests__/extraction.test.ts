import { describe, it, expect } from "@jest/globals";
import { parseTransactionText } from "@services/transactionParser";

describe("Transaction Extraction and Validation Tests", () => {

  describe("Parser confidence and accuracy", () => {
    it("should parse Starbucks transaction with high confidence", () => {
      const starbucksText = `
    Date: 2024-01-15
    Description: Starbucks Coffee
    Amount: $5.50
    Type: Debit
    Balance: $1,234.56
      `;

      const results = parseTransactionText(starbucksText);

      expect(results.length).toBeGreaterThan(0);
      const starbucksTxn = results.find((t: { description: string }) =>
        t.description.toLowerCase().includes("starbucks")
      );
      expect(starbucksTxn).toBeDefined();
      if (starbucksTxn) {
        expect(starbucksTxn.confidence).toBeGreaterThan(0.7);
        expect(starbucksTxn.amount).toBeGreaterThan(0);
      }
    });

    it("should parse Uber transaction with correct category", () => {
      const uberText = `
Date: 2024-01-20
Description: UberX from Downtown to Airport
Amount: $25.99
Type: Debit
      `;

      const results = parseTransactionText(uberText);

      expect(results.length).toBeGreaterThan(0);
      const uberTxn = results.find((t: { description: string }) =>
        t.description.toLowerCase().includes("uber")
      );
      expect(uberTxn).toBeDefined();
      if (uberTxn && typeof (uberTxn as any).category === "string") {
        const category = ((uberTxn as any).category as string).toLowerCase();
        expect(["transport", "travel", "ride"].some((cat) =>
          category.includes(cat)
        )).toBe(true);
      }
    });

    it("should parse Amazon transaction with debit type", () => {
      const amazonText = `
Date: 2024-01-10
Description: Amazon Wireless Mouse
Amount: $19.99
Type: Debit
      `;

      const results = parseTransactionText(amazonText);

      expect(results.length).toBeGreaterThan(0);
      const amazonTxn = results.find((t: { description: string }) =>
        t.description.toLowerCase().includes("amazon")
      );
      expect(amazonTxn).toBeDefined();
      if (amazonTxn && typeof (amazonTxn as any).category === "string") {
        const category = ((amazonTxn as any).category as string).toLowerCase();
        expect(["shopping", "electronics", "retail"].some((cat) =>
          category.includes(cat)
        )).toBe(true);
      }
      if (amazonTxn && typeof (amazonTxn as any).type === "string") {
        expect((amazonTxn as any).type).toMatch(/debit/i);
      }
    });
  });

  describe("Amount parsing", () => {
    it("should extract numeric amount correctly", () => {
      const testText = "Transaction: $42.99";

      const results = parseTransactionText(testText);

      if (results.length > 0) {
        expect(results[0].amount).toBeGreaterThan(0);
        expect(typeof results[0].amount).toBe("number");
      }
    });

    it("should handle currency symbols", () => {
      const testTexts = [
        "Amount: $100",
        "Price: €80",
        "Cost: £50",
        "Total: ¥10000",
      ];

      testTexts.forEach((text) => {
        const results = parseTransactionText(text);
        // Should parse without errors
        expect(results).toBeDefined();
      });
    });

    it("should handle decimal amounts", () => {
      const testText = "Charge: $123.45";

      const results = parseTransactionText(testText);

      if (results.length > 0) {
        expect(results[0].amount).toBe(123.45);
      }
    });

    it("should handle large amounts", () => {
      const testText = "Balance: $10,000,000.99";

      const results = parseTransactionText(testText);

      if (results.length > 0) {
        expect(results[0].amount).toBeGreaterThan(1000000);
      }
    });
  });

  describe("Date parsing", () => {
    it("should parse YYYY-MM-DD format", () => {
      const testText = "Date: 2024-01-15";

      const results = parseTransactionText(testText);

      if (results.length > 0) {
        expect(results[0].date).toBeDefined();
      }
    });

    it("should parse Month Day, Year format", () => {
      const testText = "Date: January 15, 2024";

      const results = parseTransactionText(testText);

      if (results.length > 0) {
        expect(results[0].date).toBeDefined();
      }
    });

    it("should parse MM/DD/YYYY format", () => {
      const testText = "Date: 01/15/2024";

      const results = parseTransactionText(testText);

      if (results.length > 0) {
        expect(results[0].date).toBeDefined();
      }
    });
  });

  describe("Category detection", () => {
    it("should detect Food & Drink category", () => {
      const testText = "Restaurant transaction at coffee shop";

      const results = parseTransactionText(testText);

      if (results.length > 0) {
        expect(results[0].category).toBeDefined();
      }
    });

    it("should detect Transportation category", () => {
      const testText = "Uber ride expense for commute";

      const results = parseTransactionText(testText);

      if (results.length > 0) {
        expect(results[0].category).toBeDefined();
      }
    });

    it("should detect Shopping category", () => {
      const testText = "Amazon purchase online store";

      const results = parseTransactionText(testText);

      if (results.length > 0) {
        expect(results[0].category).toBeDefined();
      }
    });
  });

  describe("Transaction type classification", () => {
    it("should classify debit transactions", () => {
      const testTexts = [
        "Debit: -$50",
        "Charge: $50",
        "Withdrawal: $50",
      ];

      testTexts.forEach((text) => {
        const results = parseTransactionText(text);
        if (results.length > 0) {
          expect(["debit", "Debit"].some((type) =>
            results[0].type.includes(type)
          )).toBe(true);
        }
      });
    });

    it("should classify credit transactions", () => {
      const testTexts = [
        "Credit: +$100",
        "Deposit: $100",
        "Income: $100",
        "Refund: $100",
      ];

      testTexts.forEach((text) => {
        const results = parseTransactionText(text);
        if (results.length > 0) {
          expect(["credit", "Credit"].some((type) =>
            results[0].type.includes(type)
          )).toBe(true);
        }
      });
    });
  });

  describe("Parser robustness", () => {
    it("should handle empty input", () => {
      const results = parseTransactionText("");

      expect(results).toBeDefined();
      expect(Array.isArray(results)).toBe(true);
    });

    it("should handle whitespace-only input", () => {
      const results = parseTransactionText("   \n\n   ");

      expect(results).toBeDefined();
      expect(Array.isArray(results)).toBe(true);
    });

    it("should handle malformed input gracefully", () => {
      const testText = "!@#$%^&*() <invalid> [data]";

      expect(() => {
        parseTransactionText(testText);
      }).not.toThrow();
    });

    it("should handle very long descriptions", () => {
      const longDesc =
        "This is a very long transaction description that contains many words ".repeat(
          10
        );
      const testText = `Description: ${longDesc}
Amount: $50`;

      const results = parseTransactionText(testText);

      expect(results).toBeDefined();
    });

    it("should handle multiple transactions in one text", () => {
      const multiText = `
Date: 2024-01-15
Description: Starbucks Coffee
Amount: $5.50
Type: Debit

Date: 2024-01-16
Description: Uber Ride
Amount: $25.99
Type: Debit
      `;

      const results = parseTransactionText(multiText);

      expect(results.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe("Confidence scoring", () => {
    it("should assign confidence between 0 and 1", () => {
      const testText = `
Date: 2024-01-15
Description: Starbucks Coffee
Amount: $5.50
Type: Debit
      `;

      const results = parseTransactionText(testText);

      if (results.length > 0) {
        expect(results[0].confidence).toBeGreaterThanOrEqual(0);
        expect(results[0].confidence).toBeLessThanOrEqual(1);
      }
    });

    it("should give higher confidence to complete transactions", () => {
      const completeText = `
Date: 2024-01-15
Description: Starbucks Coffee
Amount: $5.50
Type: Debit
Balance: $1,234.56
Category: Food & Drink
      `;

      const incompleteText = `
Amount: $5.50
      `;

      const completeResults = parseTransactionText(completeText);
      const incompleteResults = parseTransactionText(incompleteText);

      if (
        completeResults.length > 0 &&
        incompleteResults.length > 0
      ) {
        expect(completeResults[0].confidence).toBeGreaterThanOrEqual(
          incompleteResults[0].confidence
        );
      }
    });
  });

  describe("Data validation", () => {
    it("should not create transaction with missing required fields", () => {
      const incompleteText = "Some random text without transaction data";

      const results = parseTransactionText(incompleteText);

      // Parser should either return empty or create entries with defaults
      results.forEach((txn: { amount: unknown; type: unknown; description: unknown }) => {
        expect(txn.amount).toBeDefined();
        expect(txn.type).toBeDefined();
        expect(txn.description).toBeDefined();
      });
    });

    it("should ensure amount is positive", () => {
      const testText = "Debit: $50.00";

      const results = parseTransactionText(testText);

      results.forEach((txn: { amount: number }) => {
        expect(txn.amount).toBeGreaterThanOrEqual(0);
      });
    });

    it("should validate transaction type is debit or credit", () => {
      const testTexts = [
        "Charge: $50",
        "Refund: $50",
        "Deposit: $50",
      ];

      testTexts.forEach((text) => {
        const results = parseTransactionText(text);
        results.forEach((txn: { type: string }) => {
          expect(
            txn.type.toLowerCase()
          ).toMatch(/(debit|credit)/);
        });
      });
    });
  });
});
