"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { TransactionExtractor } from "@/components/transaction-extractor";
import { TransactionsList } from "@/components/transactions-list";
import { TransactionStats } from "@/components/transaction-stats";
import { LogOut, Home, Loader2 } from "lucide-react";

export default function DashboardPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [refreshKey, setRefreshKey] = useState(0);

  if (status === "loading") {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <Loader2 className="mb-4 h-12 w-12 animate-spin text-primary mx-auto" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (status === "unauthenticated") {
    router.push("/login");
    return null;
  }

  const handleLogout = async () => {
    await signOut({ redirect: false });
    router.push("/login");
  };

  const handleTransactionSuccess = () => {
    setRefreshKey((prev) => prev + 1);
  };

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="border-b bg-white/80 backdrop-blur-sm shadow-sm">
        <div className="container mx-auto flex items-center justify-between px-4 py-4">
          <div className="flex items-center gap-2">
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-2 rounded-lg">
              <Home className="h-5 w-5 text-white" />
            </div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">Vessify</h1>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-sm">
              <p className="text-muted-foreground">Welcome back,</p>
              <p className="font-semibold">{session?.user?.name || session?.user?.email}</p>
            </div>
            <Button
              onClick={handleLogout}
              variant="outline"
              size="sm"
              className="gap-2"
            >
              <LogOut className="h-4 w-4" />
              Logout
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="grid gap-8">
          <div>
            <h2 className="mb-2 text-3xl font-bold tracking-tight">
              Transaction Dashboard
            </h2>
            <p className="text-muted-foreground">
              Extract and manage your bank transactions with AI-powered parsing
            </p>
          </div>

          {/* Stats Section */}
          <TransactionStats key={`stats-${refreshKey}`} />

          <div className="grid gap-8 lg:grid-cols-3">
            <div className="lg:col-span-1">
              <TransactionExtractor onSuccess={handleTransactionSuccess} />
            </div>
            <div className="lg:col-span-2">
              <TransactionsList key={`list-${refreshKey}`} />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
