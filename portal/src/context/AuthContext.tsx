import React, { createContext, useContext, useEffect, useState } from "react";

import type { Role } from "../types";
import { portalEnv } from "../lib/env";
import { fetchRemoteViewer } from "../lib/portal-remote";
import { clearRemotePortal, configureRemotePortal, portalStore, usePortalContext } from "../lib/portal";
import { getSupabaseClient, supabase } from "../lib/supabase";

interface AuthUser {
  id: string;
  name: string;
  role: Role;
  organizationId: string;
  email: string;
}

interface AuthContextType {
  user: AuthUser | null;
  setRole: (role: Role) => void;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  authMode: "demo" | "supabase";
  supabaseConfigured: boolean;
  loading: boolean;
  error: string | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const demoPortal = usePortalContext();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(portalEnv.isSupabaseConfigured);
  const [error, setError] = useState<string | null>(null);

  const authMode: "demo" | "supabase" = portalEnv.isSupabaseConfigured
    ? "supabase"
    : "demo";

  useEffect(() => {
    if (!portalEnv.isSupabaseConfigured || !supabase) {
      setLoading(false);
      return;
    }

    let cancelled = false;

    const syncAuth = async () => {
      setLoading(true);
      const viewer = await fetchRemoteViewer();

      if (cancelled) {
        return;
      }

      if (!viewer) {
        clearRemotePortal();
        setUser(null);
        setLoading(false);
        return;
      }

      await configureRemotePortal(viewer);

      if (cancelled) {
        return;
      }

      setUser({
        id: viewer.userId,
        name: viewer.name,
        role: viewer.role,
        organizationId: viewer.organizationId,
        email: viewer.email,
      });
      setLoading(false);
      setError(null);
    };

    syncAuth().catch((authError) => {
      if (cancelled) {
        return;
      }
      clearRemotePortal();
      setUser(null);
      setLoading(false);
      setError(authError instanceof Error ? authError.message : "Onbekende authfout");
    });

    const {
      data: { subscription },
    } = getSupabaseClient().auth.onAuthStateChange(() => {
      syncAuth().catch((authError) => {
        clearRemotePortal();
        setUser(null);
        setLoading(false);
        setError(authError instanceof Error ? authError.message : "Onbekende authfout");
      });
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, []);

  const setRole = (role: Role) => {
    if (authMode === "demo") {
      portalStore.setRole(role);
    }
  };

  const login = async (email: string, password: string) => {
    if (authMode === "demo") {
      return;
    }

    setLoading(true);
    setError(null);
    const result = await getSupabaseClient().auth.signInWithPassword({
      email,
      password,
    });

    if (result.error) {
      setLoading(false);
      setError(result.error.message);
      throw result.error;
    }
  };

  const logout = async () => {
    if (authMode === "demo") {
      portalStore.setRole("help_org");
      return;
    }

    await getSupabaseClient().auth.signOut();
    clearRemotePortal();
    setUser(null);
  };

  const effectiveUser =
    authMode === "supabase"
      ? user
      : demoPortal.user
        ? {
            id: demoPortal.user.id,
            name: demoPortal.user.fullName ?? demoPortal.user.name,
            role: demoPortal.snapshot.role,
            organizationId: demoPortal.viewer.organizationId,
            email: demoPortal.user.email,
          }
        : null;

  return (
    <AuthContext.Provider
      value={{
        user: effectiveUser,
        setRole,
        login,
        logout,
        authMode,
        supabaseConfigured: portalEnv.isSupabaseConfigured,
        loading,
        error,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
