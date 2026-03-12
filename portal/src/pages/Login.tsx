import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

import { useAuth } from "../context/AuthContext";

const Login: React.FC = () => {
  const navigate = useNavigate();
  const { authMode, error, loading, login, setRole, supabaseConfigured } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (authMode === "demo") {
      setRole("digidromen_admin");
      navigate("/dashboard");
      return;
    }

    await login(email, password);
    // Navigation happens automatically via LoginRoute's redirect when auth state updates
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
            {authMode === "supabase" ? "Live Portal" : "Demo Mode"}
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
            {authMode === "supabase"
              ? "Log in met je account om de portal te openen."
              : "Supabase is nog niet actief — de portal draait in demo-modus."}
          </p>

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
                disabled={authMode !== "supabase"}
              />
            </div>
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
                disabled={authMode !== "supabase"}
              />
            </div>
            <button
              type="submit"
              disabled={loading || (authMode === "supabase" && (!email || !password))}
              className="w-full rounded-xl bg-digidromen-primary px-4 py-3.5 text-sm font-bold text-digidromen-dark shadow-sm transition-all hover:shadow-md disabled:cursor-not-allowed disabled:bg-digidromen-cream disabled:text-digidromen-dark/30 disabled:shadow-none"
            >
              {loading ? "Bezig..." : authMode === "supabase" ? "Log in" : "Open demo-portal"}
            </button>
          </form>

          {error ? (
            <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {error}
            </div>
          ) : null}

          <div className="mt-6 rounded-xl bg-digidromen-cream/60 px-4 py-3 text-xs text-digidromen-dark/40">
            {supabaseConfigured
              ? "Verbonden met Supabase. Log in met een bestaand account."
              : "Supabase-configuratie ontbreekt. Voeg portal/.env.local toe om live auth te activeren."}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
