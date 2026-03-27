"use client";

import { createContext, useContext, useState, useCallback } from "react";
import type { ConnectedIdentity } from "@/types";

interface AuthContextValue {
  identity: ConnectedIdentity;
  setIdentity: (identity: ConnectedIdentity) => void;
  disconnect: () => void;
}

const AuthContext = createContext<AuthContextValue>({
  identity: null,
  setIdentity: () => {},
  disconnect: () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [identity, setIdentityState] = useState<ConnectedIdentity>(null);

  const setIdentity = useCallback((id: ConnectedIdentity) => {
    setIdentityState(id);
  }, []);

  const disconnect = useCallback(() => {
    setIdentityState(null);
  }, []);

  return (
    <AuthContext.Provider value={{ identity, setIdentity, disconnect }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
