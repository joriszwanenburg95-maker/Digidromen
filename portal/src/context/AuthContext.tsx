import React, { createContext, useContext, useEffect, useState } from "react";

import type { Role } from "../types";
import { portalEnv } from "../lib/env";
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
  sendMagicLink: (email: string) => Promise<void>;
  logout: () => Promise<void>;
  authMode: "supabase";
  supabaseConfigured: boolean;
  loading: boolean;
  error: string | null;
  magicLinkSent: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(portalEnv.isSupabaseConfigured);
  const [error, setError] = useState<string | null>(null);
  const [magicLinkSent, setMagicLinkSent] = useState(false);

  const authMode = "supabase" as const;

  useEffect(() => {
    if (!portalEnv.isSupabaseConfigured || !supabase) {
      setLoading(false);
      return;
    }

    let cancelled = false;

    const syncAuth = async () => {
      setLoading(true);
      const sb = getSupabaseClient();
      const { data: { user: authUser }, error: authErr } = await sb.auth.getUser();

      if (cancelled) return;

      if (authErr) throw authErr;
      if (!authUser) {
        setUser(null);
        setLoading(false);
        return;
      }

      const { data: profile } = await sb
        .from("user_profiles")
        .select("id, organization_id, role, name, email")
        .eq("auth_user_id", authUser.id)
        .maybeSingle();

      if (cancelled) return;

      if (!profile) {
        setUser(null);
        setLoading(false);
        return;
      }

      setUser({
        id: profile.id,
        name: profile.name,
        role: profile.role,
        organizationId: profile.organization_id,
        email: profile.email,
      });
      setLoading(false);
      setError(null);
    };

    syncAuth().catch((authError) => {
      if (cancelled) return;
      setUser(null);
      setLoading(false);
      setError(authError instanceof Error ? authError.message : "Onbekende authfout");
    });

    const {
      data: { subscription },
    } = getSupabaseClient().auth.onAuthStateChange(() => {
      syncAuth().catch((authError) => {
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

  const setRole = (_role: Role) => {};

  const sendMagicLink = async (email: string) => {
    if (!portalEnv.isSupabaseConfigured) {
      const envError = new Error("Supabase-configuratie ontbreekt.");
      setError(envError.message);
      throw envError;
    }

    if (!email.trim()) {
      return;
    }

    setLoading(true);
    setError(null);
    setMagicLinkSent(false);

    const { error: otpError } = await getSupabaseClient().auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: window.location.origin + "/dashboard",
      },
    });

    setLoading(false);

    if (otpError) {
      setError(otpError.message);
      throw otpError;
    }

    setMagicLinkSent(true);
  };

  const logout = async () => {
    await getSupabaseClient().auth.signOut();
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        setRole,
        sendMagicLink,
        logout,
        authMode,
        supabaseConfigured: portalEnv.isSupabaseConfigured,
        loading,
        error,
        magicLinkSent,
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
