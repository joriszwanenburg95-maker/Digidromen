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

function getAuthCallbackError(): string | null {
  const search = new URLSearchParams(window.location.search);
  const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
  const rawError =
    search.get("error_description") ||
    search.get("error") ||
    hash.get("error_description") ||
    hash.get("error");
  return rawError ? translateError(rawError) : null;
}

function hasAuthCallbackParams(): boolean {
  const search = new URLSearchParams(window.location.search);
  const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
  return (
    search.has("code") ||
    search.has("error") ||
    hash.has("access_token") ||
    hash.has("refresh_token") ||
    hash.has("error")
  );
}

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
  const syncRunRef = useRef(0);
  const syncTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastAuthErrorRef = useRef<string | null>(null);
  const manualPasswordSignInRef = useRef(false);

  const setFriendlyAuthError = useCallback((err: unknown, fallback: string) => {
    const message = translateError(err, fallback);
    if (lastAuthErrorRef.current !== message) {
      lastAuthErrorRef.current = message;
      setError(message);
    }
  }, []);

  const loadUserProfile = useCallback(async (authUserId: string): Promise<AuthUser | null> => {
    if (!portalEnv.isSupabaseConfigured || !supabase) {
      return null;
    }
    const { data: profile, error: profileError } = await getSupabaseClient()
      .from("user_profiles")
      .select("id, organization_id, role, name, email")
      .eq("auth_user_id", authUserId)
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

  const loadCurrentUserProfile = useCallback(async (): Promise<AuthUser | null> => {
    const {
      data: { session },
      error: sessionError,
    } = await getSupabaseClient().auth.getSession();
    if (sessionError) {
      throw sessionError;
    }
    if (!session?.user?.id) {
      return null;
    }
    return loadUserProfile(session.user.id);
  }, [loadUserProfile]);

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
    const callbackError = getAuthCallbackError();
    if (callbackError) {
      setError(callbackError);
    }

    const syncAuth = async () => {
      const runId = ++syncRunRef.current;
      const quietRefresh = hasAuthenticatedSessionRef.current;
      if (!quietRefresh) {
        setLoading(true);
      }

      try {
        const profile = await loadCurrentUserProfile();
        if (cancelled || runId !== syncRunRef.current) return;

        if (!profile) {
          if (!hasAuthCallbackParams()) {
            hasAuthenticatedSessionRef.current = false;
            setUser(null);
            if (!callbackError) {
              setError(null);
              lastAuthErrorRef.current = null;
            }
          }
          return;
        }

        hasAuthenticatedSessionRef.current = true;
        setUser(profile);
        setError(null);
        lastAuthErrorRef.current = null;
      } finally {
        if (!quietRefresh && !cancelled && runId === syncRunRef.current) {
          setLoading(false);
        }
      }
    };

    const scheduleSyncAuth = (delay = 80) => {
      if (syncTimerRef.current) {
        clearTimeout(syncTimerRef.current);
      }
      syncTimerRef.current = setTimeout(() => {
        syncAuth().catch((authError) => {
          if (cancelled) return;
          hasAuthenticatedSessionRef.current = false;
          setUser(null);
          setLoading(false);
          setFriendlyAuthError(
            authError,
            "Inloggen is niet gelukt. Vraag eventueel een nieuwe magic link aan.",
          );
        });
      }, delay);
    };

    scheduleSyncAuth(hasAuthCallbackParams() ? 250 : 0);

    const {
      data: { subscription },
    } = getSupabaseClient().auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT") {
        hasAuthenticatedSessionRef.current = false;
        setUser(null);
        setError(null);
        lastAuthErrorRef.current = null;
        setLoading(false);
        return;
      }
      if (event === "SIGNED_IN" && manualPasswordSignInRef.current) {
        return;
      }
      scheduleSyncAuth(event === "SIGNED_IN" ? 40 : 120);
    });

    return () => {
      cancelled = true;
      if (syncTimerRef.current) {
        clearTimeout(syncTimerRef.current);
      }
      subscription.unsubscribe();
    };
  }, [loadCurrentUserProfile, setFriendlyAuthError]);

  const setRole = (_role: Role) => {};

  const signInWithPassword = async (email: string, password: string) => {
    if (!portalEnv.isSupabaseConfigured) {
      const envError = new Error("Supabase-configuratie ontbreekt.");
      setError(translateError(envError));
      throw envError;
    }

    setLoading(true);
    lastAuthErrorRef.current = null;
    setError(null);
    manualPasswordSignInRef.current = true;
    syncRunRef.current += 1;
    if (syncTimerRef.current) {
      clearTimeout(syncTimerRef.current);
      syncTimerRef.current = null;
    }

    try {
      const { error: signInError } = await getSupabaseClient().auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) {
        setFriendlyAuthError(signInError, "Inloggen mislukt. Controleer je gegevens en probeer opnieuw.");
        throw signInError;
      }

      const profile = await loadCurrentUserProfile();
      if (!profile) {
        const profileError = new Error("Je bent ingelogd, maar je portalprofiel kon niet worden geladen.");
        setFriendlyAuthError(profileError, "Je portalprofiel kon niet worden geladen. Neem contact op met Digidromen.");
        throw profileError;
      }

      hasAuthenticatedSessionRef.current = true;
      setUser(profile);
      setError(null);
      lastAuthErrorRef.current = null;
    } finally {
      manualPasswordSignInRef.current = false;
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
    lastAuthErrorRef.current = null;
    setError(null);
    setMagicLinkSent(false);

    try {
      const { error: otpError } = await getSupabaseClient().auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: window.location.origin + "/dashboard",
        },
      });

      if (otpError) {
        setFriendlyAuthError(otpError, "Magic link versturen mislukt. Probeer het opnieuw.");
        throw otpError;
      }

      setMagicLinkSent(true);
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    hasAuthenticatedSessionRef.current = false;
    await getSupabaseClient().auth.signOut();
    setUser(null);
    setError(null);
    lastAuthErrorRef.current = null;
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
