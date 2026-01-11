"use client";

import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { LoginForm } from "@/components/login-form";

export default function LoginPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  if (status === "loading") {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <div className="mb-4 h-12 w-12 animate-spin rounded-full border-4 border-muted border-t-primary mx-auto"></div>
        </div>
      </div>
    );
  }

  if (session?.user) {
    router.push("/");
    return null;
  }

  return (
    <div className="flex h-screen items-center justify-center bg-background">
      <div className="w-full max-w-md px-4">
        <div className="mb-8 text-center">
          <h1 className="mb-2 text-3xl font-bold">Vessify</h1>
          <p className="text-muted-foreground">
            Extract bank transactions with ease
          </p>
        </div>
        <LoginForm />
      </div>
    </div>
  );
}
