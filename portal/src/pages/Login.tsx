import React from "react";
import { useNavigate } from "react-router-dom";

import { useAuth } from "../context/AuthContext";
import { usePortalContext } from "../lib/portal";
import type { Role } from "../types";

const Login: React.FC = () => {
  const { setRole } = useAuth();
  const { snapshot } = usePortalContext();
  const navigate = useNavigate();

  const handleLogin = (role: Role) => {
    setRole(role);
    navigate('/dashboard');
  };

  const roles: Array<{ id: Role; label: string; desc: string }> = [
    { id: 'help_org', label: 'Hulporganisatie', desc: 'Bestellingen plaatsen en reparaties melden' },
    { id: 'digidromen_staff', label: 'Digidromen Medewerker', desc: 'Aanvragen beoordelen en proces bewaken' },
    { id: 'digidromen_admin', label: 'Digidromen Beheerder', desc: 'Volledige toegang en rapportages' },
    { id: 'service_partner', label: 'Servicepartner', desc: 'Logistiek en refurbish updates' },
  ];

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_#dbeafe,_transparent_40%),linear-gradient(180deg,_#f8fafc_0%,_#eef2ff_100%)] px-4 py-12 sm:px-6 lg:px-8">
      <div className="mx-auto grid max-w-5xl gap-8 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="rounded-[2rem] bg-slate-950 p-10 text-white shadow-2xl">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-sky-300">PoC Demo</p>
          <h1 className="mt-4 max-w-md text-4xl font-black leading-tight">
            Digidromen Supply & Service Portal
          </h1>
          <p className="mt-4 max-w-xl text-sm leading-6 text-slate-300">
            Klik door de drie kernketens, wissel direct van persona en laat zien
            hoe orders, reparaties, donaties en CRM-sync vanuit een centrale
            workflow samenkomen.
          </p>

          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            {[
              "6 demo-orders en 4 reparaties direct beschikbaar",
              "3 donation batches inclusief voorraadimpact",
              "Workflow-events, notificaties en document placeholders",
              "CRM queue, failed sync en retry-flow zonder backend",
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
            Digidromen Portal
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Selecteer een persona om de demo te starten
          </p>
        </div>
        
        <div className="mt-8 space-y-4">
          {roles.map((role) => (
            <button
              key={role.id}
              onClick={() => handleLogin(role.id)}
              className="w-full flex flex-col items-start p-4 border border-gray-200 rounded-xl hover:border-digidromen-primary hover:bg-blue-50 transition-all text-left group"
            >
                <span className="text-sm font-bold text-gray-900 group-hover:text-digidromen-primary">{role.label}</span>
                <span className="text-xs text-gray-500">{role.desc}</span>
              </button>
          ))}
        </div>

        <div className="mt-6 pt-6 border-t border-gray-100">
          <p className="text-center text-xs text-gray-400">
            Huidige actieve rol in localStorage: <span className="font-semibold text-gray-600">{snapshot.role}</span>
          </p>
        </div>
      </div>
      </div>
    </div>
  );
};

export default Login;
