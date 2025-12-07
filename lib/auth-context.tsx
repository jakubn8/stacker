"use client";

import { createContext, useContext, ReactNode } from "react";

export interface AuthContextUser {
  whopUserId: string;
  dbUserId: string | null;
  whopCompanyId: string;
  email: string | null;
  isAdmin: boolean;
}

interface AuthContextValue {
  user: AuthContextUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  isAuthenticated: false,
  isLoading: true,
});

export function AuthProvider({
  children,
  user,
}: {
  children: ReactNode;
  user: AuthContextUser | null;
}) {
  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading: false,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
