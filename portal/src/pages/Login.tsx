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
    navigate("/dashboard");
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_#dbeafe,_transparent_40%),linear-gradient(180deg,_#f8fafc_0%,_#eef2ff_100%)] px-4 py-12 sm:px-6 lg:px-8">
      <div className="mx-auto grid max-w-5xl gap-8 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="rounded-[2rem] bg-slate-950 p-10 text-white shadow-2xl">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-sky-300">
            {authMode === "supabase" ? "Live Portal" : "Demo Mode"}
          </p>
          <h1 className="mt-4 max-w-md text-4xl font-black leading-tight">
            Digidromen Supply & Service Portal
          </h1>
          <p className="mt-4 max-w-xl text-sm leading-6 text-slate-300">
            De portal draait CRM-onafhankelijk. Eerst een werkende operationele backend en frontend, later pas de CRM-koppeling.
          </p>
          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            {[
              "Orders, reparaties en donaties op een centrale workflow",
              "Voorraad en rapportages vanuit dezelfde portal",
              "Excel-export voor operationele rapportages",
              "CRM alleen voorbereid, nog niet actief gekoppeld",
            ].map((item) => (
              <div key={item} className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-slate-200">
                {item}
              </div>
            ))}
          </div>
        </div>

        <div className="w-full space-y-8 rounded-[2rem] border border-white/60 bg-white/90 p-10 shadow-xl backdrop-blur">
          <div>
            <div className="flex justify-center">
              <div className="rounded-2xl bg-digidromen-primary p-3 text-2xl font-bold tracking-tighter text-white">DD</div>
            </div>
            <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
              Inloggen
            </h2>
            <p className="mt-2 text-center text-sm text-gray-600">
              {authMode === "supabase"
                ? "Gebruik je Supabase testaccount om de portal te openen."
                : "Supabase is nog niet actief; de portal draait in demo-modus."}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm outline-none ring-digidromen-primary focus:ring-2"
              placeholder="E-mailadres"
              disabled={authMode !== "supabase"}
            />
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm outline-none ring-digidromen-primary focus:ring-2"
              placeholder="Wachtwoord"
              disabled={authMode !== "supabase"}
            />
            <button
              type="submit"
              disabled={loading || (authMode === "supabase" && (!email || !password))}
              className="w-full rounded-xl bg-digidromen-primary px-4 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-300"
            >
              {loading ? "Bezig..." : authMode === "supabase" ? "Log in" : "Open demo-portal"}
            </button>
          </form>

          {error ? (
            <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {error}
            </div>
          ) : null}

          <div className="rounded-xl bg-slate-50 px-4 py-3 text-xs text-slate-500">
            {supabaseConfigured
              ? "Supabase-configuratie staat aan. Zorg dat je testgebruikers in Supabase Authentication aanwezig zijn en gekoppeld worden aan user_profiles via e-mailadres."
              : "Supabase-configuratie ontbreekt nog. Voeg portal/.env.local toe om live auth te activeren."}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
