import { parseTransactionText } from "@services/transactionParser";

describe("Parser - Assignment Sample Texts", () => {
  it("Sample 1: Starbucks multi-line format", () => {
    const text = `Date: 11 Dec 2025
Description: STARBUCKS COFFEE MUMBAI
Amount: -420.00
Balance after transaction: 18,420.50`;

    const result = parseTransactionText(text);
    
    expect(result.length).toBe(1);
    expect(result[0].description).toContain("STARBUCKS");
    expect(result[0].amount).toBe(420);
    expect(result[0].type).toBe("debit");
    expect(result[0].balance).toBe(18420.50);
  });

  it("Sample 2: Uber single-line format", () => {
    const text = `Uber Ride * Airport Drop
12/11/2025 → ₹1,250.00 debited
Available Balance → ₹17,170.50`;

    const result = parseTransactionText(text);
    
    expect(result.length).toBe(1);
    expect(result[0].description).toContain("Uber");
    expect(result[0].amount).toBe(1250);
    expect(result[0].type).toBe("debit");
    expect(result[0].balance).toBe(17170.50);
  });

  it("Sample 3: Amazon messy single-line", () => {
    const text = `txn123 2025-12-10 Amazon.in Order #403-1234567-8901234 ₹2,999.00 Dr Bal 14171.50 Shopping`;

    const result = parseTransactionText(text);
    
    expect(result.length).toBe(1);
    expect(result[0].description).toContain("Amazon");
    expect(result[0].amount).toBe(2999);
    expect(result[0].type).toBe("debit");
    expect(result[0].category).toBe("shopping");
    expect(result[0].balance).toBe(14171.50);
  });
});
