import type { ParsedTransaction } from "types";
import { z } from "zod";

/**
 * Transaction Parser Service
 * Handles parsing of various bank statement formats with confidence scoring
 */

// Parser returns explicit objects; legacy ParseResult removed.
// Regex patterns for different date formats
const datePatterns = [
  /(\d{1,2})\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+(\d{4})/i,
  /(\d{1,2})\/(\d{1,2})\/(\d{4})/,
  /(\d{4})-(\d{2})-(\d{2})/,
  /(\d{2})-(\d{2})-(\d{4})/,
];

// Amount patterns (handles ₹, $, etc.) - ordered by specificity
const amountPatterns = [
  /Amount[:\s]+(-?\d{1,3}(?:,\d{3})*(?:\.\d{2})?)/i, // "Amount: 420.00"
  /₹\s*([\d,]+(?:\.\d{2})?)/,  // "₹1,250.00"
  /Rs\.?\s*([\d,]+(?:\.\d{2})?)/i, // "Rs 1250"
  /\$\s*([\d,]+(?:\.\d{2})?)/,  // "$1250.00"
  /(?:^|[^\d])([\d,]+\.\d{2})(?:\s+(?:Dr|Cr|debit|credit))/i, // "2,999.00 Dr"
];

// Keywords for categorization
const categoryKeywords: Record<string, string[]> = {
  food: ["starbucks", "coffee", "restaurant", "pizza", "burger", "food", "cafe"],
  transport: ["uber", "taxi", "ola", "bus", "train", "flight", "airport"],
  shopping: ["amazon", "flipkart", "mall", "store", "shop", "order"],
  utilities: ["electric", "water", "gas", "internet", "phone", "bill"],
};

/**
 * Parse date from various formats
 */
function parseDate(dateStr: string): Date | null {
  // Month mapping for text formats
  const monthMap: Record<string, number> = {
    jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
    jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11,
  };

  for (const pattern of datePatterns) {
    const match = dateStr.match(pattern);
    if (!match) continue;

    try {
      // Format: DD Mon YYYY
      if (pattern === datePatterns[0]) {
        const day = parseInt(match[1]);
        const month = monthMap[match[2].toLowerCase()];
        const year = parseInt(match[3]);
        return new Date(year, month, day);
      }
      // Format: DD/MM/YYYY
      else if (pattern === datePatterns[1]) {
        const day = parseInt(match[1]);
        const month = parseInt(match[2]) - 1;
        const year = parseInt(match[3]);
        return new Date(year, month, day);
      }
      // Format: YYYY-MM-DD
      else if (pattern === datePatterns[2]) {
        const year = parseInt(match[1]);
        const month = parseInt(match[2]) - 1;
        const day = parseInt(match[3]);
        return new Date(year, month, day);
      }
      // Format: DD-MM-YYYY
      else if (pattern === datePatterns[3]) {
        const day = parseInt(match[1]);
        const month = parseInt(match[2]) - 1;
        const year = parseInt(match[3]);
        return new Date(year, month, day);
      }
    } catch {
      continue;
    }
  }

  return null;
}

/**
 * Parse amount from string
 */
function parseAmount(text: string): { amount: number; confidence: number } | null {
  for (const pattern of amountPatterns) {
    const match = text.match(pattern);
    if (match) {
      const amountStr = match[1].replace(/,/g, "");
      const amount = parseFloat(amountStr);
      if (!isNaN(amount)) {
        return { amount: Math.abs(amount), confidence: 0.95 };
      }
    }
  }
  return null;
}

/**
 * Determine transaction type (debit/credit)
 */
function determineTransactionType(text: string): "debit" | "credit" {
  const debitIndicators = ["debit", "paid", "spent", "charges", "debited", "withdrawn", "dr", "-"];
  const creditIndicators = ["credit", "deposited", "received", "refund", "credited", "cr", "\\+"];

  const lowerText = text.toLowerCase();

  // Check for negative amount sign (strong debit indicator)
  if (/Amount[:\s]+-/.test(text) || /-\d{1,3}(?:,\d{3})*(?:\.\d{2})?/.test(text)) {
    return "debit";
  }

  const debitScore = debitIndicators.filter(ind => lowerText.includes(ind)).length;
  const creditScore = creditIndicators.filter(ind => lowerText.includes(ind)).length;

  return debitScore > creditScore ? "debit" : "credit";
}

/**
 * Categorize transaction based on description
 */
function categorizeTransaction(description: string): string | undefined {
  const lowerDesc = description.toLowerCase();

  for (const [category, keywords] of Object.entries(categoryKeywords)) {
    if (keywords.some(keyword => lowerDesc.includes(keyword))) {
      return category;
    }
  }

  return undefined;
}

/**
 * Extract balance from text
 */
function extractBalance(text: string): number | null {
  // Look for patterns like "Balance: 18,420.50" or "Available Balance → 17,170.50" or "Bal 14171.50"
  const balancePatterns = [
    /Balance[:\s]+(?:after\s+transaction[:\s]+)?(?:₹|Rs\.?)?[\s]*(-?\d{1,}(?:,\d{3})*(?:\.\d{2})?)/i,
    /Available[:\s]+(?:Balance)?[:\s→]*(?:₹|Rs\.?)?[\s]*(-?\d{1,}(?:,\d{3})*(?:\.\d{2})?)/i,
    /Bal[\s]+(-?\d{1,}(?:,\d{3})*(?:\.\d{2})?)/i,
  ];

  for (const pattern of balancePatterns) {
    const match = text.match(pattern);
    if (match) {
      return parseFloat(match[1].replace(/,/g, ""));
    }
  }

  return null;
}

/**
 * Parse single transaction (can be multi-line)
 */
function parseSingleTransaction(text: string): ParsedTransaction | null {
  // Skip empty blocks
  if (!text.trim()) return null;

  // Try to parse date from entire text block
  const date = parseDate(text);
  
  if (!date) return null;

  const amountData = parseAmount(text);
  if (!amountData) return null;

  // Extract description - keep the meaningful parts
  let description = text;
  
  // Remove metadata lines but preserve merchant/description
  const lines = description.split('\n').map(l => l.trim());
  const descLines = lines.filter(line => {
    const lower = line.toLowerCase();
    // Skip pure metadata lines
    if (lower.startsWith('date:')) return false;
    if (lower.startsWith('amount:')) return false;
    if (lower.startsWith('balance')) return false;
    if (lower.startsWith('available balance')) return false;
    if (/^\d{1,2}\/\d{1,2}\/\d{4}/.test(line)) return false;
    if (lower.startsWith('description:')) {
      // Extract the actual description part
      return line.substring(line.indexOf(':') + 1).trim().length > 0;
    }
    return line.length > 0;
  });
  
  // Join description lines
  description = descLines.join(' ').trim();
  
  // Clean up remaining noise
  description = description
    .replace(/^description:\s*/i, '') // Remove "Description:" prefix
    .replace(/txn\d+/gi, '') // Remove transaction IDs
    .replace(/\d{4}-\d{2}-\d{2}/g, '') // Remove ISO dates
    .replace(/₹[\d,]+(?:\.\d{2})?/g, '') // Remove amounts
    .replace(/Rs\.?\s*[\d,]+(?:\.\d{2})?/gi, '') // Remove Rs amounts
    .replace(/\s+(?:Dr|Cr|debit|credit|debited|credited)\s*/gi, ' ') // Remove transaction type words
    .replace(/Bal\s+[\d,]+(?:\.\d{2})?/gi, '') // Remove balance info
    .replace(/Order\s+#[\d-]+/gi, '') // Remove order numbers but keep "Order" text
    .replace(/[*→]/g, ' ') // Remove special chars
    .replace(/\s+/g, ' ') // Normalize whitespace
    .trim();
  
  // If description is still empty, use a placeholder
  if (!description || description.length < 2) {
    description = "Transaction";
  }

  const type = determineTransactionType(text);
  const category = categorizeTransaction(description);
  const balance = extractBalance(text);

  return {
    date,
    description: description.trim(),
    amount: amountData.amount,
    type,
    category,
    balance: balance || undefined,
    confidence: amountData.confidence,
  };
}

/**
 * Format validation schema
 */
const transactionSchema = z.object({
  date: z.date(),
  description: z.string().min(1),
  amount: z.number().positive(),
  type: z.enum(["debit", "credit"]),
  category: z.string().optional(),
  balance: z.number().optional(),
  confidence: z.number().min(0).max(1),
});

/**
 * Main transaction parsing function
 */
export function parseTransactionText(text: string): ParsedTransaction[] {
  if (!text || typeof text !== "string") {
    return [];
  }

  // Split by empty lines to get transaction blocks
  const blocks = text.split(/\n\s*\n/);
  const parsed: ParsedTransaction[] = [];

  for (const block of blocks) {
    const transaction = parseSingleTransaction(block);
    if (transaction) {
      // Validate with schema
      const validated = transactionSchema.safeParse(transaction);
      if (validated.success) {
        parsed.push(validated.data);
      }
    }
  }

  return parsed;
}

/**
 * Calculate overall confidence for a batch of transactions
 */
export function calculateBatchConfidence(transactions: ParsedTransaction[]): number {
  if (transactions.length === 0) return 0;

  const avgConfidence = transactions.reduce((sum, t) => sum + t.confidence, 0) / transactions.length;
  
  // Penalize if too few transactions found
  let confidence = avgConfidence;
  if (transactions.length === 1) {
    confidence *= 0.9;
  }

  return Math.min(confidence, 1);
}

/**
 * Enhanced parsing with fallback strategies
 */
export function parseTransactionsWithFallbacks(text: string): {
  transactions: ParsedTransaction[];
  confidence: number;
  parseMethod: string;
} {
  // Try standard parsing first
  let transactions = parseTransactionText(text);
  
  if (transactions.length > 0) {
    return {
      transactions,
      confidence: calculateBatchConfidence(transactions),
      parseMethod: "standard",
    };
  }

  // Fallback: Try comma-separated format
  if (text.includes(",")) {
    const rows = text.split("\n").filter(line => line.includes(","));
    
    for (const row of rows) {
      const parts = row.split(",");
      if (parts.length >= 3) {
        const date = parseDate(parts[0]);
        const amount = parseAmount(parts[1]);
        
        if (date && amount) {
          transactions.push({
            date,
            description: parts[2]?.trim() || "Parsed Transaction",
            amount: amount.amount,
            type: determineTransactionType(row),
            confidence: 0.75,
          });
        }
      }
    }
  }

  if (transactions.length > 0) {
    return {
      transactions,
      confidence: calculateBatchConfidence(transactions),
      parseMethod: "csv_fallback",
    };
  }

  return {
    transactions: [],
    confidence: 0,
    parseMethod: "failed",
  };
}
