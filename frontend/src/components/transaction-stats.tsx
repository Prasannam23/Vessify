"use client";

import React, { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import apiClient from "@/lib/api";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, TrendingDown, DollarSign, Hash } from "lucide-react";

interface TransactionStats {
  totalTransactions: number;
  totalAmount: string;
  byType: Array<{
    type: string;
    count: number;
    amount: string;
  }>;
  byCategory: Array<{
    category: string | null;
    count: number;
    amount: string;
  }>;
}

export function TransactionStats() {
  const { data: session } = useSession();
  const [stats, setStats] = useState<TransactionStats | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (session) {
      fetchStats();
    }
  }, [session]);

  const fetchStats = async () => {
    setIsLoading(true);
    setError(null);

    try {
      if (!session?.accessToken) {
        setError("Authentication required");
        return;
      }

      const response = await apiClient.get("/api/transactions/stats");

      if (response.data.success) {
        setStats(response.data.data);
      }
    } catch (error) {
      console.error("Fetch stats error:", error);
      setError(
        error instanceof Error ? error.message : "Failed to fetch statistics"
      );
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Transaction Statistics</CardTitle>
          <CardDescription>Loading your transaction insights...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-muted border-t-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Transaction Statistics</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
            {error}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!stats) {
    return null;
  }

  const debitStats = stats.byType.find((t) => t.type === "debit");
  const creditStats = stats.byType.find((t) => t.type === "credit");

  return (
    <div className="space-y-6">
      {/* Overview Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Transactions
            </CardTitle>
            <Hash className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalTransactions}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Amount
            </CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₹{parseFloat(stats.totalAmount).toLocaleString()}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Debits
            </CardTitle>
            <TrendingDown className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              ₹{debitStats ? parseFloat(debitStats.amount).toLocaleString() : "0"}
            </div>
            <p className="text-xs text-muted-foreground">
              {debitStats?.count || 0} transactions
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Credits
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              ₹{creditStats ? parseFloat(creditStats.amount).toLocaleString() : "0"}
            </div>
            <p className="text-xs text-muted-foreground">
              {creditStats?.count || 0} transactions
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Category Breakdown */}
      {stats.byCategory.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Spending by Category</CardTitle>
            <CardDescription>Breakdown of your transactions</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {stats.byCategory.map((cat, idx) => (
                <div key={idx} className="flex items-center justify-between">
                  <div className="flex-1">
                    <p className="text-sm font-medium capitalize">
                      {cat.category || "Uncategorized"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {cat.count} transaction{cat.count !== 1 ? "s" : ""}
                    </p>
                  </div>
                  <div className="text-sm font-semibold">
                    ₹{parseFloat(cat.amount).toLocaleString()}
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
