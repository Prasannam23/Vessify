"use client";

import React, { useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import apiClient from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CheckCircle2, AlertCircle } from "lucide-react";

const SAMPLE_TEXTS = [
  {
    title: "Sample 1: Starbucks",
    text: `Date: 11 Dec 2025
Description: STARBUCKS COFFEE MUMBAI
Amount: -420.00
Balance after transaction: 18,420.50`,
  },
  {
    title: "Sample 2: Uber",
    text: `Uber Ride * Airport Drop
12/11/2025 → ₹1,250.00 debited
Available Balance → ₹17,170.50`,
  },
  {
    title: "Sample 3: Amazon",
    text: `txn123 2025-12-10 Amazon.in Order #403-1234567-8901234 ₹2,999.00 Dr Bal 14171.50 Shopping`,
  },
];

interface ParseResult {
  id: string;
  date: string;
  description: string;
  amount: string;
  type: "debit" | "credit";
  category?: string;
  confidence: number;
}

export function TransactionExtractor({ onSuccess }: { onSuccess?: () => void }) {
  const { data: session } = useSession();
  const [text, setText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [results, setResults] = useState<ParseResult[]>([]);

  const handleExtract = useCallback(async () => {
    if (!text.trim()) {
      setError("Please enter transaction text");
      return;
    }

    setError(null);
    setSuccess(null);
    setIsLoading(true);

    try {
      if (!session?.accessToken) {
        setError("Authentication required");
        return;
      }

      const response = await apiClient.post("/api/transactions/extract", { text });

      if (response.data.success) {
        const transactions = response.data.data.transactions;
        setResults(transactions);
        setSuccess(
          `Successfully extracted ${transactions.length} transaction(s)`
        );
        setText("");
        
        // Notify parent to refresh transaction list
        if (onSuccess) {
          setTimeout(() => onSuccess(), 1000);
        }
      }
    } catch (error: any) {
      console.error("Extraction error:", error);
      setError(
        error.response?.data?.error?.message || 
        error.message || 
        "Failed to extract transactions"
      );
    } finally {
      setIsLoading(false);
    }
  }, [text, session, onSuccess]);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Extract Transactions</CardTitle>
          <CardDescription>
            Paste bank statement text to extract and save transactions
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {success && (
            <Alert className="border-green-200 bg-green-50 text-green-800">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800">{success}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <Label htmlFor="transaction-text">Transaction Text</Label>
            <Textarea
              id="transaction-text"
              placeholder="Paste your bank statement text here..."
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={6}
              disabled={isLoading}
            />
            <p className="text-xs text-muted-foreground">
              Min 1 character required
            </p>
          </div>

          <div className="flex gap-2">
            <Button
              onClick={handleExtract}
              isLoading={isLoading}
              disabled={!text.trim()}
            >
              Parse & Save
            </Button>
          </div>

          {/* Sample texts section */}
          <div className="mt-6 space-y-3">
            <p className="text-sm font-medium">Try with sample texts:</p>
            <div className="grid gap-2 sm:grid-cols-3">
              {SAMPLE_TEXTS.map((sample) => (
                <Button
                  key={sample.title}
                  variant="outline"
                  size="sm"
                  onClick={() => setText(sample.text)}
                  disabled={isLoading}
                >
                  {sample.title}
                </Button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      {results.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Parsed Transactions</CardTitle>
            <CardDescription>
              {results.length} transaction(s) extracted
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {results.map((txn) => (
                <div
                  key={txn.id}
                  className="flex items-center justify-between rounded-lg border p-3"
                >
                  <div className="flex-1">
                    <p className="font-medium">{txn.description}</p>
                    <p className="text-sm text-muted-foreground">
                      {new Date(txn.date).toLocaleDateString()}
                      {txn.category && ` • ${txn.category}`}
                    </p>
                  </div>
                  <div className="text-right">
                    <p
                      className={`font-semibold ${
                        txn.type === "debit"
                          ? "text-red-600"
                          : "text-green-600"
                      }`}
                    >
                      {txn.type === "debit" ? "-" : "+"}₹{txn.amount}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Confidence: {(txn.confidence * 100).toFixed(0)}%
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
