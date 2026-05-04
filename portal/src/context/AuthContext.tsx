import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";

import type { Role } from "../types";
import { portalEnv } from "../lib/env";
import { translateError } from "../lib/errors";
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
  /** Herlaadt naam/e-mail/rol uit `user_profiles` (bijv. na profielwijziging in Instellingen). */
  refreshUserProfile: () => Promise<void>;
  sendMagicLink: (email: string) => Promise<void>;
  signInWithPassword: (email: string, password: string) => Promise<void>;
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

  /** Na eerste ingelogde sessie: token-refresh zonder `loading` → voorkomt unmount van o.a. bestelwizard bij tab-switch. */
  const hasAuthenticatedSessionRef = useRef(false);

  const loadCurrentUserProfile = useCallback(async (): Promise<AuthUser | null> => {
    if (!portalEnv.isSupabaseConfigured || !supabase) {
      return null;
    }
    const sb = getSupabaseClient();
    const {
      data: { user: authUser },
      error: authErr,
    } = await sb.auth.getUser();
    if (authErr || !authUser) {
      return null;
    }
    const { data: profile, error: profileError } = await sb
      .from("user_profiles")
      .select("id, organization_id, role, name, email")
      .eq("auth_user_id", authUser.id)
      .maybeSingle();
    if (profileError) {
      throw profileError;
    }
    if (!profile) {
      return null;
    }
    return {
      id: profile.id,
      name: profile.name,
      role: profile.role,
      organizationId: profile.organization_id,
      email: profile.email,
    };
  }, []);

  const refreshUserProfile = useCallback(async () => {
    const profile = await loadCurrentUserProfile();
    if (!profile) return;
    hasAuthenticatedSessionRef.current = true;
    setUser(profile);
  }, [loadCurrentUserProfile]);

  useEffect(() => {
    if (!portalEnv.isSupabaseConfigured || !supabase) {
      setLoading(false);
      return;
    }

    let cancelled = false;

    const syncAuth = async () => {
      const quietRefresh = hasAuthenticatedSessionRef.current;
      if (!quietRefresh) {
        setLoading(true);
      }

      try {
        const profile = await loadCurrentUserProfile();
        if (cancelled) return;

        if (!profile) {
          hasAuthenticatedSessionRef.current = false;
          setUser(null);
          setError(null);
          return;
        }

        hasAuthenticatedSessionRef.current = true;
        setUser(profile);
        setError(null);
      } finally {
        if (!quietRefresh && !cancelled) {
          setLoading(false);
        }
      }
    };

    syncAuth().catch((authError) => {
      if (cancelled) return;
      hasAuthenticatedSessionRef.current = false;
      setUser(null);
      setLoading(false);
      setError(translateError(authError, "Onbekende authfout"));
    });

    const {
      data: { subscription },
    } = getSupabaseClient().auth.onAuthStateChange(() => {
      syncAuth().catch((authError) => {
        hasAuthenticatedSessionRef.current = false;
        setUser(null);
        setLoading(false);
        setError(translateError(authError, "Onbekende authfout"));
      });
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, [loadCurrentUserProfile]);

  const setRole = (_role: Role) => {};

  const signInWithPassword = async (email: string, password: string) => {
    if (!portalEnv.isSupabaseConfigured) {
      const envError = new Error("Supabase-configuratie ontbreekt.");
      setError(translateError(envError));
      throw envError;
    }

    setLoading(true);
    setError(null);

    try {
      const { error: signInError } = await getSupabaseClient().auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) {
        setError(translateError(signInError, "Inloggen mislukt. Controleer je gegevens en probeer opnieuw."));
        throw signInError;
      }

      const profile = await loadCurrentUserProfile();
      if (!profile) {
        const profileError = new Error("Je bent ingelogd, maar je portalprofiel kon niet worden geladen.");
        setError(translateError(profileError));
        throw profileError;
      }

      hasAuthenticatedSessionRef.current = true;
      setUser(profile);
      setError(null);
    } finally {
      setLoading(false);
    }
  };

  const sendMagicLink = async (email: string) => {
    if (!portalEnv.isSupabaseConfigured) {
      const envError = new Error("Supabase-configuratie ontbreekt.");
      setError(translateError(envError));
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
      setError(translateError(otpError, "Magic link versturen mislukt. Probeer het opnieuw."));
      throw otpError;
    }

    setMagicLinkSent(true);
  };

  const logout = async () => {
    hasAuthenticatedSessionRef.current = false;
    await getSupabaseClient().auth.signOut();
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        setRole,
        refreshUserProfile,
        sendMagicLink,
        signInWithPassword,
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
