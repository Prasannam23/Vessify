"use client";

import React, { createContext, useContext, useState, useCallback, useEffect } from "react";
import axios from "axios";

interface AuthUser {
  id: string;
  email: string;
  name?: string;
}

interface AuthContextType {
  user: AuthUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name?: string) => Promise<void>;
  logout: () => Promise<void>;
  getToken: () => string | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [token, setToken] = useState<string | null>(null);

  // Check session on mount
  useEffect(() => {
    const checkSession = async () => {
      try {
        const savedToken = localStorage.getItem("auth_token");
        if (savedToken) {
          setToken(savedToken);
          // Verify token is still valid
          const response = await axios.get(
            `${process.env.NEXT_PUBLIC_API_URL}/api/auth/session`,
            {
              headers: { Authorization: `Bearer ${savedToken}` },
            }
          );
          const sessionUser = response.data?.data?.session?.user;
          if (sessionUser) {
            setUser(sessionUser);
          }
        }
      } catch (error) {
        localStorage.removeItem("auth_token");
        setToken(null);
      } finally {
        setIsLoading(false);
      }
    };

    checkSession();
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const response = await axios.post(
        `${process.env.NEXT_PUBLIC_API_URL}/api/auth/login`,
        { email, password }
      );

      const { token: authToken, user: authUser } = response.data?.data || {};
      if (!authToken || !authUser) {
        throw new Error("Invalid login response");
      }
      localStorage.setItem("auth_token", authToken);
      document.cookie = `auth_token=${authToken}; path=/; SameSite=Lax`;
      setToken(authToken);
      setUser(authUser);
    } catch (error) {
      console.error("Login failed:", error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const register = useCallback(async (email: string, password: string, name?: string) => {
    setIsLoading(true);
    try {
      const response = await axios.post(
        `${process.env.NEXT_PUBLIC_API_URL}/api/auth/register`,
        { email, password, name }
      );

      const { token: authToken, user: authUser } = response.data?.data || {};
      if (!authToken || !authUser) {
        throw new Error("Invalid registration response");
      }
      localStorage.setItem("auth_token", authToken);
      document.cookie = `auth_token=${authToken}; path=/; SameSite=Lax`;
      setToken(authToken);
      setUser(authUser);
    } catch (error) {
      console.error("Registration failed:", error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      if (token) {
        await axios.post(
          `${process.env.NEXT_PUBLIC_API_URL}/api/auth/sign-out`,
          {},
          { headers: { Authorization: `Bearer ${token}` } }
        );
      }
    } catch (error) {
      console.error("Logout error:", error);
    } finally {
      localStorage.removeItem("auth_token");
      document.cookie = "auth_token=; Max-Age=0; path=/; SameSite=Lax";
      setToken(null);
      setUser(null);
    }
  }, [token]);

  const getToken = useCallback(() => token, [token]);

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        login,
        register,
        logout,
        getToken,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}
