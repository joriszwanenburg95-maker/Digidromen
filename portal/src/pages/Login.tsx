import React, { useState } from "react";

import { useAuth } from "../context/AuthContext";

const Login: React.FC = () => {
  const { error, loading, magicLinkSent, sendMagicLink, signInWithPassword, supabaseConfigured } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loginMode, setLoginMode] = useState<"magic" | "password">("magic");

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (loginMode === "password") {
      await signInWithPassword(email, password);
    } else {
      await sendMagicLink(email);
    }
  };

  return (
    <div className="flex min-h-screen bg-digidromen-warm">
      {/* Left branding panel */}
      <div className="hidden w-[45%] bg-digidromen-dark p-12 lg:flex lg:flex-col lg:justify-between">
        <div>
          <img src="/Digidromen logo.png" alt="Digidromen" className="h-10 brightness-0 invert" />
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-digidromen-primary">
            Live Portal
          </p>
          <h1 className="mt-4 max-w-md text-4xl font-extrabold leading-[1.1] text-white">
            Ieder kind verdient
            <span className="text-digidromen-primary"> grote dromen</span>
          </h1>
          <p className="mt-6 max-w-lg text-sm leading-relaxed text-white/50">
            Supply & Service Portal voor het beheren van bestellingen, reparaties en donaties. CRM-onafhankelijk, operationeel klaar.
          </p>
          <div className="mt-10 grid grid-cols-2 gap-3">
            {[
              "Orders & reparaties",
              "Voorraad & rapportages",
              "Donatie workflows",
              "CRM voorbereiding",
            ].map((item) => (
              <div key={item} className="rounded-xl border border-white/8 bg-white/5 px-4 py-3 text-xs font-medium text-white/60">
                {item}
              </div>
            ))}
          </div>
        </div>
        <p className="text-[11px] text-white/20">
          Digidromen &middot; Supply & Service Portal
        </p>
      </div>

      {/* Right login form */}
      <div className="flex flex-1 items-center justify-center px-6 py-12">
        <div className="w-full max-w-md">
          <div className="mb-8 lg:hidden">
            <img src="/Digidromen logo.png" alt="Digidromen" className="h-10" />
          </div>

          <h2 className="text-2xl font-bold text-digidromen-dark">
            Inloggen
          </h2>
          <p className="mt-2 text-sm text-digidromen-dark/50">
            {loginMode === "magic"
              ? "Voer je e-mailadres in en ontvang een login-link."
              : "Log in met e-mailadres en wachtwoord."}
          </p>

          {magicLinkSent && loginMode === "magic" ? (
            <div className="mt-8 rounded-xl border border-emerald-200 bg-emerald-50 px-6 py-5">
              <p className="text-sm font-semibold text-emerald-800">Login link verstuurd</p>
              <p className="mt-1 text-sm text-emerald-700">
                Check je inbox op <span className="font-medium">{email}</span> en klik op de link om in te loggen.
              </p>
              <button
                type="button"
                onClick={() => setEmail("")}
                className="mt-3 text-xs text-emerald-600 underline underline-offset-2"
              >
                Ander e-mailadres gebruiken
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="mt-8 space-y-4">
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-digidromen-dark/40">
                  E-mailadres
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  className="w-full rounded-xl border border-digidromen-cream bg-white p-3.5 text-sm text-digidromen-dark outline-none transition-colors focus:border-digidromen-primary focus:ring-2 focus:ring-digidromen-primary/20"
                  placeholder="naam@organisatie.nl"
                  disabled={!supabaseConfigured}
                  autoComplete="email"
                />
              </div>

              {loginMode === "password" ? (
                <div>
                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-digidromen-dark/40">
                    Wachtwoord
                  </label>
                  <input
                    type="password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    className="w-full rounded-xl border border-digidromen-cream bg-white p-3.5 text-sm text-digidromen-dark outline-none transition-colors focus:border-digidromen-primary focus:ring-2 focus:ring-digidromen-primary/20"
                    placeholder="Wachtwoord"
                    disabled={!supabaseConfigured}
                    autoComplete="current-password"
                  />
                </div>
              ) : null}

              <button
                type="submit"
                disabled={loading || !email || !supabaseConfigured || (loginMode === "password" && !password)}
                className="w-full rounded-xl bg-digidromen-primary px-4 py-3.5 text-sm font-bold text-digidromen-dark shadow-sm transition-all hover:shadow-md disabled:cursor-not-allowed disabled:bg-digidromen-cream disabled:text-digidromen-dark/30 disabled:shadow-none"
              >
                {loading
                  ? "Bezig..."
                  : loginMode === "password"
                    ? "Inloggen →"
                    : "Stuur login link →"}
              </button>

              <button
                type="button"
                onClick={() => setLoginMode(loginMode === "magic" ? "password" : "magic")}
                className="w-full text-center text-xs text-digidromen-dark/40 underline underline-offset-2 hover:text-digidromen-dark/60"
              >
                {loginMode === "magic"
                  ? "Inloggen met wachtwoord"
                  : "Inloggen met magic link"}
              </button>
            </form>
          )}

          {error ? (
            <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {error}
            </div>
          ) : null}

          <div className="mt-6 rounded-xl bg-digidromen-cream/60 px-4 py-3 text-xs text-digidromen-dark/40">
            {supabaseConfigured
              ? "Verbonden met Supabase. Je ontvangt een link per e-mail."
              : "Supabase-configuratie ontbreekt. Voeg portal/.env.local toe om live auth te activeren."}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
