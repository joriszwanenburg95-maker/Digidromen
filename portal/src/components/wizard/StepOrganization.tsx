import React from "react";

type OrgOption = { id: string; name: string; city: string | null };

interface Props {
  /** Hulporganisatie: vaste keuze, geen wijziging */
  mode: "fixed" | "select";
  options: OrgOption[];
  selectedId: string;
  onChange: (organizationId: string) => void;
  error?: string;
  isLoading?: boolean;
}

export const StepOrganization: React.FC<Props> = ({
  mode,
  options,
  selectedId,
  onChange,
  error,
  isLoading,
}) => {
  const selected = options.find((o) => o.id === selectedId);

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-base font-semibold text-slate-800">
          Voor wie is deze bestelling?
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          {mode === "fixed"
            ? "Deze bestelling staat op naam van jouw organisatie. Controleer of dit klopt."
            : "Kies de hulporganisatie of gemeente waarvoor je namens Digidromen bestelt."}
        </p>
      </div>

      {isLoading ? (
        <p className="text-sm text-slate-400">Organisaties laden...</p>
      ) : mode === "fixed" && selected ? (
        <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
            Organisatie
          </p>
          <p className="mt-1 font-medium text-slate-900">{selected.name}</p>
          {selected.city ? (
            <p className="text-slate-600">{selected.city}</p>
          ) : null}
        </div>
      ) : mode === "select" ? (
        <div>
          <label htmlFor="order-organization" className="sr-only">
            Organisatie
          </label>
          <select
            id="order-organization"
            value={selectedId}
            onChange={(e) => onChange(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 focus:border-digidromen-primary focus:outline-none focus:ring-2 focus:ring-digidromen-primary/25"
          >
            <option value="">— Kies een organisatie —</option>
            {options.map((o) => (
              <option key={o.id} value={o.id}>
                {o.name}
                {o.city ? ` (${o.city})` : ""}
              </option>
            ))}
          </select>
        </div>
      ) : (
        <p className="text-sm text-amber-700">
          Je profiel heeft geen organisatie gekoppeld. Neem contact op met Digidromen.
        </p>
      )}

      {error ? (
        <p className="text-sm text-red-600" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
};
