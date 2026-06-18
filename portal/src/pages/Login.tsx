import React, { useState } from "react";

import { AuthPage } from "@/components/ui/auth-page";
import { useAuth } from "../context/AuthContext";

const Login: React.FC = () => {
  const {
    error,
    loading,
    magicLinkSent,
    sendMagicLink,
    signInWithPassword,
    supabaseConfigured,
  } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  // Klanten (hulporganisaties) worden per uitnodiging/magic link aangemeld en
  // hebben geen wachtwoord; magic link is daarom de standaard inlogmethode.
  const [loginMode, setLoginMode] = useState<"magic" | "password">("magic");

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    try {
      if (loginMode === "magic") {
        await sendMagicLink(email);
        return;
      }
      await signInWithPassword(email, password);
    } catch {
      // AuthContext vertaalt en toont de fout; voorkom een losse promise rejection.
    }
  };

  return (
    <AuthPage
      email={email}
      password={password}
      loginMode={loginMode}
      magicLinkSent={magicLinkSent}
      error={error}
      loading={loading}
      supabaseConfigured={supabaseConfigured}
      onEmailChange={setEmail}
      onPasswordChange={setPassword}
      onLoginModeChange={setLoginMode}
      onSubmit={handleSubmit}
    />
  );
};

export default Login;
