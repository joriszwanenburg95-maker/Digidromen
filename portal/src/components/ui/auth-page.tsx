import React from "react";
import { ArrowRightIcon, AtSignIcon, LockKeyholeIcon } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { TextRotate } from "@/components/ui/text-rotate";

interface AuthPageProps {
  email: string;
  password: string;
  loginMode: "magic" | "password";
  magicLinkSent: boolean;
  error: string | null;
  loading: boolean;
  supabaseConfigured: boolean;
  onEmailChange: (value: string) => void;
  onPasswordChange: (value: string) => void;
  onLoginModeChange: (value: "magic" | "password") => void;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
}

const loginQuotes = [
  "Ieder kind groot laten dromen",
  "Een laptop opent een wereld",
  "Leren, ontdekken en ontwikkelen",
  "Gelijke kansen voor ieder kind",
  "Maak Digidromen waar",
];

function LoginAmbientField({ side }: { side: "left" | "right" }) {
  const prefersReducedMotion = useReducedMotion();
  const isLeft = side === "left";

  return (
    <div
      aria-hidden
      className={`pointer-events-none absolute inset-0 z-0 overflow-hidden ${
        isLeft ? "opacity-100" : "opacity-80"
      }`}
    >
      <motion.div
        className={`absolute rounded-full blur-3xl ${
          isLeft
            ? "-left-20 top-[22%] h-96 w-96 bg-digidromen-yellow/30"
            : "-right-24 top-[-8rem] h-80 w-80 bg-digidromen-yellow/22"
        }`}
        animate={{
          x: prefersReducedMotion ? 0 : isLeft ? [0, 110, 42, 0] : [0, -34, 18, 0],
          y: prefersReducedMotion ? 0 : isLeft ? [0, -34, 44, 0] : [0, 32, -14, 0],
          scale: prefersReducedMotion ? 1 : [1, 1.18, 0.94, 1],
          opacity: prefersReducedMotion ? 0.68 : isLeft ? [0.46, 0.78, 0.52, 0.46] : [0.34, 0.52, 0.38, 0.34],
          backgroundColor: prefersReducedMotion
            ? "#FFD500"
            : ["#FFD500", "#F2A900", "#EE7219", "#FFD500"],
        }}
        transition={{ duration: isLeft ? 10 : 11.5, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className={`absolute rounded-full blur-3xl ${
          isLeft
            ? "bottom-[10%] right-[-10rem] h-[30rem] w-[30rem] bg-digidromen-orange/32"
            : "bottom-[-13rem] left-[-8rem] h-96 w-96 bg-digidromen-orange/14"
        }`}
        animate={{
          x: prefersReducedMotion ? 0 : isLeft ? [0, -96, -22, 0] : [0, 38, -20, 0],
          y: prefersReducedMotion ? 0 : isLeft ? [0, 42, -26, 0] : [0, -26, 18, 0],
          scale: prefersReducedMotion ? 1 : [0.98, 1.16, 1.04, 0.98],
          opacity: prefersReducedMotion ? 0.6 : isLeft ? [0.42, 0.7, 0.48, 0.42] : [0.24, 0.42, 0.3, 0.24],
          backgroundColor: prefersReducedMotion
            ? "#EE7219"
            : ["#EE7219", "#FFD500", "#F2A900", "#EE7219"],
        }}
        transition={{ duration: isLeft ? 12 : 13.5, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className={`absolute rounded-full blur-2xl ${
          isLeft
            ? "left-[18%] top-[45%] h-[32rem] w-[52rem] bg-[conic-gradient(from_90deg,rgba(255,213,0,0.34),rgba(238,114,25,0.32),rgba(255,255,255,0.03),rgba(255,213,0,0.34))]"
            : "left-1/2 top-1/2 h-[26rem] w-[34rem] -translate-x-1/2 -translate-y-1/2 bg-[conic-gradient(from_90deg,rgba(255,213,0,0.16),rgba(238,114,25,0.12),rgba(255,255,255,0),rgba(255,213,0,0.16))]"
        }`}
        animate={{
          rotate: prefersReducedMotion ? 0 : 360,
          scale: prefersReducedMotion ? 1 : [1, 1.08, 0.98, 1],
          opacity: prefersReducedMotion ? 0.42 : isLeft ? [0.28, 0.58, 0.36, 0.28] : [0.2, 0.38, 0.24, 0.2],
        }}
        transition={{
          rotate: { duration: isLeft ? 18 : 24, repeat: Infinity, ease: "linear" },
          scale: { duration: 7.5, repeat: Infinity, ease: "easeInOut" },
          opacity: { duration: 7.5, repeat: Infinity, ease: "easeInOut" },
        }}
      />
      {isLeft ? (
        <motion.div
          className="absolute -right-[16rem] top-0 h-full w-[34rem] bg-gradient-to-r from-transparent via-digidromen-yellow/10 to-digidromen-orange/16 blur-2xl"
          animate={{
            x: prefersReducedMotion ? 0 : [-18, 34, -18],
            opacity: prefersReducedMotion ? 0.44 : [0.26, 0.54, 0.26],
          }}
          transition={{ duration: 8.5, repeat: Infinity, ease: "easeInOut" }}
        />
      ) : null}
    </div>
  );
}

function LoginCardGlow() {
  const prefersReducedMotion = useReducedMotion();

  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-x-0 top-1/2 z-0 h-[34rem] -translate-y-1/2 overflow-visible"
    >
      <motion.div
        className="absolute left-1/2 top-1/2 h-72 w-72 -translate-x-1/2 -translate-y-1/2 rounded-full bg-digidromen-yellow/34 blur-3xl"
        animate={{
          x: prefersReducedMotion ? 0 : [-28, 42, 14, -28],
          y: prefersReducedMotion ? 0 : [-18, 22, -4, -18],
          scale: prefersReducedMotion ? 1 : [1, 1.18, 0.98, 1],
          opacity: prefersReducedMotion ? 0.44 : [0.34, 0.58, 0.4, 0.34],
          backgroundColor: prefersReducedMotion
            ? "#FFD500"
            : ["#FFD500", "#F2A900", "#EE7219", "#FFD500"],
        }}
        transition={{ duration: 9, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute left-[56%] top-[56%] h-80 w-80 -translate-x-1/2 -translate-y-1/2 rounded-full bg-digidromen-orange/24 blur-3xl"
        animate={{
          x: prefersReducedMotion ? 0 : [42, -32, 18, 42],
          y: prefersReducedMotion ? 0 : [18, -20, 24, 18],
          scale: prefersReducedMotion ? 1 : [0.96, 1.12, 1.22, 0.96],
          opacity: prefersReducedMotion ? 0.38 : [0.28, 0.5, 0.36, 0.28],
          backgroundColor: prefersReducedMotion
            ? "#EE7219"
            : ["#EE7219", "#FFD500", "#EE7219"],
        }}
        transition={{ duration: 10.5, repeat: Infinity, ease: "easeInOut" }}
      />
    </div>
  );
}

export function AuthPage({
  email,
  password,
  loginMode,
  magicLinkSent,
  error,
  loading,
  supabaseConfigured,
  onEmailChange,
  onPasswordChange,
  onLoginModeChange,
  onSubmit,
}: AuthPageProps) {
  const canSubmit =
    supabaseConfigured && email.trim() && (loginMode === "magic" || password);

  return (
    <main className="min-h-screen bg-digidromen-beige lg:grid lg:grid-cols-[1.05fr_0.95fr]">
      <section className="relative hidden min-h-screen overflow-hidden bg-digidromen-dark p-10 lg:flex lg:flex-col lg:justify-between">
        <div aria-hidden className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(255,213,0,0.16),transparent_26%),radial-gradient(circle_at_85%_70%,rgba(238,114,25,0.18),transparent_30%)]" />
        <LoginAmbientField side="left" />
        <div className="relative z-10 motion-safe:animate-auth-rise">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-digidromen-yellow">
            Digidromen Portal
          </p>
          <h1 className="mt-5 max-w-xl font-heading text-4xl font-semibold leading-tight text-white">
            Samen maken we digidromen waar.
          </h1>
        </div>

        <div className="relative z-10 motion-safe:animate-auth-rise-delayed">
          <div className="relative mb-4 min-h-[4.5rem] overflow-hidden rounded-[24px] border border-white/12 bg-white/10 px-5 py-4 text-white shadow-sm backdrop-blur">
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-digidromen-yellow">
              Digitale kansen
            </p>
            <TextRotate
              texts={loginQuotes}
              splitBy="words"
              staggerFrom="first"
              staggerDuration={0.035}
              rotationInterval={3000}
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -14 }}
              transition={{ type: "spring", damping: 30, stiffness: 420 }}
              mainClassName="font-heading text-2xl font-semibold leading-tight"
            />
          </div>
          <div className="relative overflow-hidden rounded-[28px] border border-white/12 bg-white shadow-2xl transition-transform duration-500 hover:-translate-y-1 hover:rotate-[0.4deg]">
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
        <LoginAmbientField side="right" />
        <LoginCardGlow />

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
                Log in met je e-mailadres. Kies een wachtwoord of ontvang een magic link.
              </p>
            </div>

            <div className="mt-6 grid grid-cols-2 gap-2 rounded-[22px] bg-digidromen-cream p-1">
              <button
                type="button"
                onClick={() => onLoginModeChange("password")}
                className={`min-h-10 rounded-[18px] px-3 text-sm font-semibold transition-all ${
                  loginMode === "password"
                    ? "bg-white text-digidromen-dark shadow-sm"
                    : "text-digidromen-dark/58 hover:text-digidromen-dark"
                }`}
              >
                Wachtwoord
              </button>
              <button
                type="button"
                onClick={() => onLoginModeChange("magic")}
                className={`min-h-10 rounded-[18px] px-3 text-sm font-semibold transition-all ${
                  loginMode === "magic"
                    ? "bg-white text-digidromen-dark shadow-sm"
                    : "text-digidromen-dark/58 hover:text-digidromen-dark"
                }`}
              >
                Magic link
              </button>
            </div>

            {magicLinkSent && loginMode === "magic" ? (
              <div className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-4 text-sm leading-relaxed text-emerald-800">
                <p className="font-semibold">Magic link verstuurd</p>
                <p className="mt-1">
                  Check je inbox op <span className="font-medium">{email}</span> en klik op de link
                  om in te loggen.
                </p>
              </div>
            ) : null}

            <form onSubmit={onSubmit} className="mt-6 space-y-4">
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

              {loginMode === "password" ? (
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
              ) : null}

              <Button
                type="submit"
                disabled={loading || !canSubmit}
                className="min-h-12 w-full rounded-[20px] bg-digidromen-orange text-base font-semibold text-white hover:bg-digidromen-orange-hover disabled:bg-digidromen-cream disabled:text-digidromen-dark/35"
              >
                {loading
                  ? loginMode === "magic"
                    ? "Versturen..."
                    : "Inloggen..."
                  : loginMode === "magic"
                    ? "Stuur magic link"
                    : "Inloggen"}
                {!loading ? <ArrowRightIcon className="size-4" /> : null}
              </Button>
            </form>

            {error && !loading ? (
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
