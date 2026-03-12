import React, { useMemo, useState } from "react";
import { Download, FileUp, Laptop, PackageCheck, Truck } from "lucide-react";

import { portalStore, usePortalContext } from "../lib/portal";

type ParsedInventoryImportRow = {
  location: string;
  availableQuantity: number;
  reservedQuantity: number;
  incomingQuantity: number;
  incomingEta?: string;
};

const REQUIRED_HEADERS = ["locatie", "beschikbaar", "gereserveerd", "binnenkomend"];
type InventoryView = "voorraad" | "mutatieregels" | "toekomstige_mutaties";

function normalizeHeader(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, "_");
}

function parseImportRows(input: string): ParsedInventoryImportRow[] {
  const lines = input
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length < 2) {
    throw new Error("Gebruik een CSV met minimaal een headerregel en een datarij.");
  }

  const delimiter = lines[0].includes(";") ? ";" : ",";
  const headers = lines[0].split(delimiter).map(normalizeHeader);
  const headerMap = new Map(headers.map((header, index) => [header, index]));

  for (const header of REQUIRED_HEADERS) {
    if (!headerMap.has(header)) {
      throw new Error(`Verplichte kolom ontbreekt: ${header}`);
    }
  }

  return lines.slice(1).map((line, index) => {
    const cells = line.split(delimiter).map((cell) => cell.trim());
    const valueFor = (header: string) => cells[headerMap.get(header) ?? -1] ?? "";
    const location = valueFor("locatie");
    const availableQuantity = Number(valueFor("beschikbaar") || 0);
    const reservedQuantity = Number(valueFor("gereserveerd") || 0);
    const incomingQuantity = Number(valueFor("binnenkomend") || 0);
    const incomingEta =
      valueFor("binnenkomend_op") ||
      valueFor("incoming_eta") ||
      valueFor("eta") ||
      undefined;

    if (!location) {
      throw new Error(`Rij ${index + 2}: locatie is verplicht.`);
    }
    if ([availableQuantity, reservedQuantity, incomingQuantity].some((value) => Number.isNaN(value) || value < 0)) {
      throw new Error(`Rij ${index + 2}: aantallen moeten nul of positief zijn.`);
    }

    return {
      location,
      availableQuantity,
      reservedQuantity,
      incomingQuantity,
      incomingEta,
    };
  });
}

const Inventory: React.FC = () => {
  const { inventory, snapshot, orders, donations } = usePortalContext();
  const [importText, setImportText] = useState("");
  const [importError, setImportError] = useState<string | null>(null);
  const [importNotice, setImportNotice] = useState<string | null>(null);
  const [activeView, setActiveView] = useState<InventoryView>("voorraad");
  const canImport = snapshot.role === "digidromen_admin" || snapshot.role === "digidromen_staff";

  const inventoryRows = useMemo(() => {
    const grouped = new Map<
      string,
      {
        id: string;
        location: string;
        availableQuantity: number;
        reservedQuantity: number;
        incomingQuantity: number;
        incomingEta?: string;
        updatedAt?: string;
      }
    >();

    inventory
      .filter((item: any) => !item.serialNumber)
      .forEach((item: any) => {
        const key = item.locationName ?? item.warehouseLocation ?? item.id;
        const current = grouped.get(key) ?? {
          id: item.id,
          location: key,
          availableQuantity: 0,
          reservedQuantity: 0,
          incomingQuantity: 0,
          incomingEta: item.incomingEta,
          updatedAt: item.updatedAt,
        };

        current.availableQuantity += Number(item.availableQuantity ?? 0);
        current.reservedQuantity += Number(item.reservedQuantity ?? 0);
        current.incomingQuantity += Number(item.inTransitQuantity ?? 0);
        current.incomingEta = item.incomingEta ?? current.incomingEta;
        current.updatedAt =
          (item.updatedAt ?? "") > (current.updatedAt ?? "") ? item.updatedAt : current.updatedAt;

        grouped.set(key, current);
      });

    return Array.from(grouped.values()).sort((left, right) => left.location.localeCompare(right.location));
  }, [inventory]);

  const totals = useMemo(
    () =>
      inventoryRows.reduce(
        (acc, row) => {
          acc.available += row.availableQuantity;
          acc.reserved += row.reservedQuantity;
          acc.incoming += row.incomingQuantity;
          return acc;
        },
        { available: 0, reserved: 0, incoming: 0 },
      ),
    [inventoryRows],
  );

  const mutationRows = useMemo(() => {
    const orderMutations = orders.flatMap((order: any) =>
      (order.lineItems ?? []).map((line: any) => {
        const delivered = ["GELEVERD", "AFGESLOTEN"].includes(order.status);
        const planned = ["INGEDIEND", "BEOORDEELD", "IN_BEHANDELING", "IN_VOORBEREIDING", "VERZONDEN"].includes(order.status);
        return {
          id: `order-${order.id}-${line.id ?? line.productId}`,
          type: "Uitlevering",
          direction: "uit",
          quantity: Number(line.quantity ?? 0),
          party: snapshot.data.organizations[order.organizationId]?.name ?? "Onbekende klant",
          reference: order.id,
          status: order.status,
          date: order.preferredDeliveryDate ?? order.updatedAt ?? order.createdAt ?? "",
          scope: delivered ? "historisch" : planned ? "toekomstig" : "historisch",
          note: delivered ? "Laptop uitgeleverd aan klant" : "Laptopaanvraag van klant",
        };
      }),
    );

    const donationMutations = donations.map((donation: any) => {
      const quantity = Number(
        donation.refurbishableCount ??
          donation.stockImpactQuantity ??
          donation.deviceCount ??
          0,
      );
      const completed = donation.status === "OP_VOORRAAD";
      return {
        id: `donation-${donation.id}`,
        type: "Donatie",
        direction: "in",
        quantity,
        party: snapshot.data.organizations[donation.donorOrganizationId]?.name ?? "Onbekende donor",
        reference: donation.id,
        status: donation.status,
        date: donation.estimatedPickupDate ?? donation.updatedAt ?? donation.createdAt ?? "",
        scope: completed ? "historisch" : "toekomstig",
        note: completed ? "Laptops toegevoegd aan voorraad" : "Donatie in aanloop naar toekomstige voorraad",
      };
    });

    const incomingRows = inventoryRows
      .filter((row) => row.incomingQuantity > 0)
      .map((row) => ({
        id: `incoming-${row.id}`,
        type: "Binnenkomst",
        direction: "in",
        quantity: row.incomingQuantity,
        party: row.location,
        reference: row.location,
        status: row.incomingEta ? "GEPLAND" : "OPEN",
        date: row.incomingEta ?? row.updatedAt ?? "",
        scope: "toekomstig",
        note: "Verwachte ontvangst op voorraadlocatie",
      }));

    return [...donationMutations, ...incomingRows, ...orderMutations]
      .filter((row) => row.quantity > 0)
      .sort((left, right) => String(right.date).localeCompare(String(left.date)));
  }, [donations, inventoryRows, orders, snapshot.data.organizations]);

  const visibleMutationRows = useMemo(
    () =>
      mutationRows.filter((row) =>
        activeView === "toekomstige_mutaties" ? row.scope === "toekomstig" : true,
      ),
    [activeView, mutationRows],
  );

  const handleImport = async () => {
    setImportError(null);
    setImportNotice(null);

    try {
      const rows = parseImportRows(importText);
      await portalStore.inventory.importRows(rows);
      setImportNotice(`${rows.length} voorraadregels geimporteerd.`);
      setImportText("");
    } catch (error: any) {
      setImportError(error.message ?? "Import mislukt.");
    }
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }
    setImportText(await file.text());
    event.target.value = "";
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Laptopvoorraad</h2>
          <p className="text-sm text-slate-500">{inventoryRows.length} locaties zichtbaar voor deze rol</p>
        </div>
        {canImport ? (
          <label className="flex cursor-pointer items-center rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm">
            <FileUp size={16} className="mr-2" />
            CSV laden
            <input type="file" accept=".csv,text/csv" className="hidden" onChange={handleFileSelect} />
          </label>
        ) : null}
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-sky-50 p-2 text-sky-600">
              <Laptop size={18} />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Beschikbaar</p>
              <p className="text-2xl font-bold text-slate-900">{totals.available}</p>
            </div>
          </div>
        </div>
        <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-amber-50 p-2 text-amber-600">
              <PackageCheck size={18} />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Gereserveerd</p>
              <p className="text-2xl font-bold text-slate-900">{totals.reserved}</p>
            </div>
          </div>
        </div>
        <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-emerald-50 p-2 text-emerald-600">
              <Truck size={18} />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Binnenkomend</p>
              <p className="text-2xl font-bold text-slate-900">{totals.incoming}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="flex gap-2 rounded-2xl bg-slate-100 p-1">
        {[
          { key: "voorraad" as const, label: "Voorraad" },
          { key: "mutatieregels" as const, label: "Mutatieregels" },
          { key: "toekomstige_mutaties" as const, label: "Toekomstige mutaties" },
        ].map((view) => (
          <button
            key={view.key}
            onClick={() => setActiveView(view.key)}
            className={`rounded-xl px-4 py-2 text-sm font-semibold transition-colors ${
              activeView === view.key
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            {view.label}
          </button>
        ))}
      </div>

      {canImport ? (
        <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h3 className="text-lg font-bold text-slate-900">Voorraad importeren</h3>
              <p className="mt-1 text-sm text-slate-500">
                Verwachte kolommen: `locatie`, `beschikbaar`, `gereserveerd`, `binnenkomend`, optioneel `binnenkomend_op`.
              </p>
            </div>
            <button
              onClick={() =>
                setImportText([
                  "locatie,beschikbaar,gereserveerd,binnenkomend,binnenkomend_op",
                  "Tilburg-A1,24,6,4,2026-03-18",
                  "Tilburg-Buffer,12,0,8,2026-03-20",
                ].join("\n"))
              }
              className="flex items-center rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600"
            >
              <Download size={16} className="mr-2" />
              Voorbeeld invullen
            </button>
          </div>

          {importError ? <p className="mt-4 text-sm text-rose-600">{importError}</p> : null}
          {importNotice ? <p className="mt-4 text-sm text-emerald-600">{importNotice}</p> : null}

          <textarea
            value={importText}
            onChange={(event) => setImportText(event.target.value)}
            rows={8}
            placeholder="Plak hier CSV-data..."
            className="mt-4 w-full rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm outline-none ring-digidromen-primary focus:ring-2"
          />

          <div className="mt-4 flex gap-3">
            <button
              onClick={() => void handleImport()}
              disabled={!importText.trim()}
              className="rounded-xl bg-digidromen-primary px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-300"
            >
              Import uitvoeren
            </button>
            <button
              onClick={() => {
                setImportText("");
                setImportError(null);
                setImportNotice(null);
              }}
              className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600"
            >
              Wissen
            </button>
          </div>
        </div>
      ) : null}

      <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
        {activeView === "voorraad" ? (
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Locatie</th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Beschikbaar</th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Gereserveerd</th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Binnenkomend</th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Verwacht</th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Laatste mutatie</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {inventoryRows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-sm text-slate-400">
                    Nog geen laptopvoorraad.
                  </td>
                </tr>
              ) : (
                inventoryRows.map((row) => (
                  <tr key={row.id} className="hover:bg-slate-50">
                    <td className="px-6 py-4 text-sm font-semibold text-slate-900">{row.location}</td>
                    <td className="px-6 py-4 text-sm text-slate-600">{row.availableQuantity}</td>
                    <td className="px-6 py-4 text-sm text-slate-600">{row.reservedQuantity}</td>
                    <td className="px-6 py-4 text-sm text-slate-600">{row.incomingQuantity}</td>
                    <td className="px-6 py-4 text-sm text-slate-600">{row.incomingEta ?? "-"}</td>
                    <td className="px-6 py-4 text-sm text-slate-600">
                      {row.updatedAt ? new Date(row.updatedAt).toLocaleString("nl-NL") : "-"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        ) : (
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Type</th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Partij / Locatie</th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Referentie</th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Mutatie</th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Status</th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Datum</th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Toelichting</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {visibleMutationRows.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-sm text-slate-400">
                    Geen mutaties voor dit filter.
                  </td>
                </tr>
              ) : (
                visibleMutationRows.map((row) => (
                  <tr key={row.id} className="hover:bg-slate-50">
                    <td className="px-6 py-4 text-sm font-semibold text-slate-900">{row.type}</td>
                    <td className="px-6 py-4 text-sm text-slate-600">{row.party}</td>
                    <td className="px-6 py-4 text-sm text-slate-600">{row.reference}</td>
                    <td className={`px-6 py-4 text-sm font-semibold ${row.direction === "in" ? "text-emerald-600" : "text-rose-600"}`}>
                      {row.direction === "in" ? "+" : "-"}
                      {row.quantity}
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600">{row.status}</td>
                    <td className="px-6 py-4 text-sm text-slate-600">{row.date ? String(row.date) : "-"}</td>
                    <td className="px-6 py-4 text-sm text-slate-600">{row.note}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default Inventory;
