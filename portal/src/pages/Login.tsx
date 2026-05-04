import React, { useState } from "react";

import { AuthPage } from "@/components/ui/auth-page";
import { useAuth } from "../context/AuthContext";

const Login: React.FC = () => {
  const { error, loading, signInWithPassword, supabaseConfigured } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    await signInWithPassword(email, password);
  };

  return (
    <AuthPage
      email={email}
      password={password}
      error={error}
      loading={loading}
      supabaseConfigured={supabaseConfigured}
      onEmailChange={setEmail}
      onPasswordChange={setPassword}
      onSubmit={handleSubmit}
    />
  );
};

export default Login;
