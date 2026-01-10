/**
 * Validation utilities
 */

export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

export function isStrongPassword(password: string): boolean {
  // Min 8 chars, at least one uppercase, one lowercase, one number
  const strongRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
  return strongRegex.test(password);
}

export function sanitizeInput(input: string): string {
  return input.trim().slice(0, 1000); // Max 1000 chars
}

export function validateTransactionText(text: string): boolean {
  if (!text || typeof text !== "string") return false;
  if (text.length < 5 || text.length > 10000) return false;
  return true;
}

export function validatePaginationLimit(limit: any): number {
  const parsed = parseInt(limit, 10);
  if (isNaN(parsed) || parsed < 1 || parsed > 100) {
    return 20; // Default
  }
  return parsed;
}
