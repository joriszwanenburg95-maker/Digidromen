import React from "react";
import { ArrowRightIcon, AtSignIcon, LockKeyholeIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface AuthPageProps {
  email: string;
  password: string;
  error: string | null;
  loading: boolean;
  supabaseConfigured: boolean;
  onEmailChange: (value: string) => void;
  onPasswordChange: (value: string) => void;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
}

export function AuthPage({
  email,
  password,
  error,
  loading,
  supabaseConfigured,
  onEmailChange,
  onPasswordChange,
  onSubmit,
}: AuthPageProps) {
  const canSubmit = supabaseConfigured && email.trim() && password;

  return (
    <main className="min-h-screen bg-digidromen-beige lg:grid lg:grid-cols-[1.05fr_0.95fr]">
      <section className="relative hidden min-h-screen overflow-hidden bg-digidromen-dark p-10 lg:flex lg:flex-col lg:justify-between">
        <div aria-hidden className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(255,213,0,0.16),transparent_26%),radial-gradient(circle_at_85%_70%,rgba(238,114,25,0.18),transparent_30%)]" />
        <div aria-hidden className="absolute -left-24 top-16 h-72 w-72 rounded-full bg-digidromen-yellow/12 blur-3xl motion-safe:animate-auth-float" />
        <div aria-hidden className="absolute -bottom-24 right-10 h-96 w-96 rounded-full bg-digidromen-orange/16 blur-3xl motion-safe:animate-auth-float-delayed" />
        <div className="relative z-10 motion-safe:animate-auth-rise">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-digidromen-yellow">
            Digidromen Portal
          </p>
          <h1 className="mt-5 max-w-xl font-heading text-4xl font-semibold leading-tight text-white">
            Samen maken we digidromen waar.
          </h1>
        </div>

        <div className="relative z-10 motion-safe:animate-auth-rise-delayed">
          <div className="overflow-hidden rounded-[28px] border border-white/12 bg-white shadow-2xl transition-transform duration-500 hover:-translate-y-1 hover:rotate-[0.4deg]">
            <img
              src="/Digidromen kleuren.png"
              alt="Ieder kind verdient grote dromen"
              className="h-auto w-full object-contain"
            />
          </div>
          <p className="mt-6 max-w-lg text-base leading-relaxed text-white/68">
            Beheer aanvragen, donaties, voorraad en uitleveringen vanuit een veilige portal voor
            hulporganisaties, servicepartners en Digidromen.
          </p>
        </div>
      </section>

      <section className="relative flex min-h-screen flex-col justify-center px-5 py-8 sm:px-8 lg:px-12">
        <div aria-hidden className="absolute inset-0 overflow-hidden">
          <div className="absolute right-[-8rem] top-[-10rem] h-80 w-80 rounded-full bg-digidromen-yellow/20 blur-3xl motion-safe:animate-auth-float" />
          <div className="absolute bottom-[-12rem] left-[-10rem] h-96 w-96 rounded-full bg-digidromen-orange/10 blur-3xl motion-safe:animate-auth-float-delayed" />
        </div>

        <div className="relative z-10 mx-auto w-full max-w-md motion-safe:animate-auth-rise">
          <div className="mb-8 overflow-hidden rounded-3xl border border-digidromen-cream bg-white p-3 shadow-sm motion-safe:animate-auth-rise-delayed lg:hidden">
            <img
              src="/Digidromen kleuren.png"
              alt="Ieder kind verdient grote dromen"
              className="w-full rounded-2xl object-contain"
            />
          </div>

          <div className="rounded-[28px] border border-digidromen-cream bg-white/92 p-6 shadow-sm backdrop-blur transition-all duration-300 hover:shadow-md sm:p-8">
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-digidromen-orange">
                Veilig inloggen
              </p>
              <h2 className="font-heading text-3xl font-semibold text-digidromen-dark">
                Welkom terug
              </h2>
              <p className="text-base leading-relaxed text-digidromen-dark/62">
                Log in met je e-mailadres en wachtwoord om verder te werken in de Digidromen portal.
              </p>
            </div>

            <form onSubmit={onSubmit} className="mt-8 space-y-4">
              <div>
                <label
                  htmlFor="email"
                  className="mb-2 block text-xs font-semibold uppercase tracking-wide text-digidromen-dark/50"
                >
                  E-mailadres
                </label>
                <div className="relative">
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(event) => onEmailChange(event.target.value)}
                    placeholder="naam@organisatie.nl"
                    disabled={!supabaseConfigured || loading}
                    autoComplete="email"
                    className="h-12 rounded-[20px] border-digidromen-cream bg-white ps-11 text-base text-digidromen-dark focus-visible:border-digidromen-orange"
                  />
                  <AtSignIcon className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-digidromen-dark/36" />
                </div>
              </div>

              <div>
                <label
                  htmlFor="password"
                  className="mb-2 block text-xs font-semibold uppercase tracking-wide text-digidromen-dark/50"
                >
                  Wachtwoord
                </label>
                <div className="relative">
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(event) => onPasswordChange(event.target.value)}
                    placeholder="Wachtwoord"
                    disabled={!supabaseConfigured || loading}
                    autoComplete="current-password"
                    className="h-12 rounded-[20px] border-digidromen-cream bg-white ps-11 text-base text-digidromen-dark focus-visible:border-digidromen-orange"
                  />
                  <LockKeyholeIcon className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-digidromen-dark/36" />
                </div>
              </div>

              <Button
                type="submit"
                disabled={loading || !canSubmit}
                className="min-h-12 w-full rounded-[20px] bg-digidromen-orange text-base font-semibold text-white hover:bg-digidromen-orange-hover disabled:bg-digidromen-cream disabled:text-digidromen-dark/35"
              >
                {loading ? "Inloggen..." : "Inloggen"}
                {!loading ? <ArrowRightIcon className="size-4" /> : null}
              </Button>
            </form>

            {error ? (
              <div className="mt-5 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm leading-relaxed text-rose-700">
                {error}
              </div>
            ) : null}

            <div className="mt-6 rounded-2xl bg-digidromen-cream/70 px-4 py-3 text-sm leading-relaxed text-digidromen-dark/58">
              {supabaseConfigured
                ? "Gebruik het account dat aan jouw organisatie is gekoppeld."
                : "Supabase-configuratie ontbreekt. Voeg portal/.env.local toe om live auth te activeren."}
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
