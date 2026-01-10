"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import apiClient from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Trash2 } from "lucide-react";

interface Transaction {
  id: string;
  date: string;
  description: string;
  amount: string;
  type: "debit" | "credit";
  category?: string;
  confidence: number;
  createdAt: string;
}

interface PageInfo {
  hasMore: boolean;
  nextCursor?: string;
}

export function TransactionsList() {
  const { data: session } = useSession();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [pageInfo, setPageInfo] = useState<PageInfo>({ hasMore: false });
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchTransactions = useCallback(async (cursorVal?: string) => {
    setIsLoading(true);
    setError(null);

    try {
      if (!session?.accessToken) {
        setError("Authentication required");
        return;
      }

      const params = new URLSearchParams({
        limit: "10",
        sortBy: "date",
        order: "desc",
      });

      if (cursorVal) {
        params.append("cursor", cursorVal);
      }

      const response = await apiClient.get(`/api/transactions?${params}`);

      if (response.data.success) {
        if (cursorVal) {
          setTransactions((prev) => [...prev, ...response.data.data.items]);
        } else {
          setTransactions(response.data.data.items);
        }
        setPageInfo(response.data.data.pageInfo);
      }
    } catch (error: any) {
      console.error("Fetch error:", error);
      setError(
        error.response?.data?.error?.message || 
        error.message || 
        "Failed to fetch transactions"
      );
    } finally {
      setIsLoading(false);
    }
  }, [session]);

  useEffect(() => {
    if (session) {
      fetchTransactions();
    }
  }, [session, fetchTransactions]);

  const loadMore = () => {
    if (pageInfo.nextCursor) {
      fetchTransactions(pageInfo.nextCursor);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this transaction?")) {
      return;
    }

    setDeletingId(id);
    setError(null);

    try {
      if (!session?.accessToken) {
        setError("Authentication required");
        return;
      }

      await apiClient.delete(`/api/transactions/${id}`);

      // Remove from local state
      setTransactions((prev) => prev.filter((t) => t.id !== id));
    } catch (error: any) {
      console.error("Delete error:", error);
      setError(
        error.response?.data?.error?.message || 
        error.message || 
        "Failed to delete transaction"
      );
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Your Transactions</CardTitle>
        <CardDescription>
          {transactions.length} transaction(s) loaded
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
            {error}
          </div>
        )}

        {transactions.length === 0 && !error ? (
          <p className="text-center text-muted-foreground py-8">
            No transactions yet. Start by extracting some!
          </p>
        ) : (
          <>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead className="text-center">Confidence</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transactions.map((txn) => (
                    <TableRow key={txn.id}>
                      <TableCell className="text-sm">
                        {new Date(txn.date).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="max-w-xs truncate">
                        {txn.description}
                      </TableCell>
                      <TableCell className="text-sm">
                        {txn.category || "-"}
                      </TableCell>
                      <TableCell
                        className={`text-right font-semibold ${
                          txn.type === "debit"
                            ? "text-red-600"
                            : "text-green-600"
                        }`}
                      >
                        {txn.type === "debit" ? "-" : "+"}₹{txn.amount}
                      </TableCell>
                      <TableCell className="text-center text-sm">
                        {(txn.confidence * 100).toFixed(0)}%
                      <TableCell className="text-center">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(txn.id)}
                          disabled={deletingId === txn.id}
                          className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {pageInfo.hasMore && (
              <Button
                onClick={loadMore}
                isLoading={isLoading}
                variant="outline"
                className="w-full"
              >
                Load More
              </Button>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
