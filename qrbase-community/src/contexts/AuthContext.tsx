"use client";

import { createContext, useContext, useState, useCallback, useEffect } from "react";
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

const STORAGE_KEY = "qrbase_identity";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [identity, setIdentityState] = useState<ConnectedIdentity>(null);

  // Restore identity from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) setIdentityState(JSON.parse(saved));
    } catch {}
  }, []);

  const setIdentity = useCallback((id: ConnectedIdentity) => {
    setIdentityState(id);
    try {
      if (id) localStorage.setItem(STORAGE_KEY, JSON.stringify(id));
      else localStorage.removeItem(STORAGE_KEY);
    } catch {}
  }, []);

  const disconnect = useCallback(() => {
    setIdentityState(null);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {}
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
