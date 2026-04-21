import React, { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Building2, MapPin } from "lucide-react";

import { DEFAULT_SERVICE_PARTNER_ORG_ID } from "../lib/defaultServicePartner";
import { getSupabaseClient } from "../lib/supabase";
import { queryKeys } from "../lib/queryKeys";
import type { Database } from "../types/database";

type Organization = Pick<Database["public"]["Tables"]["organizations"]["Row"], "id" | "name">;
type StockLocation = Pick<
  Database["public"]["Tables"]["stock_locations"]["Row"],
  "id" | "name" | "address" | "city"
>;

interface Props {
  donationId: string;
  open: boolean;
  onClose: () => void;
  onAssigned: () => void;
  currentPartnerId?: string | null;
  currentLocationId?: string | null;
}

export default function DonationAssignmentModal({
  donationId,
  open,
  onClose,
  onAssigned,
  currentPartnerId,
  currentLocationId,
}: Props) {
  const queryClient = useQueryClient();
  const [selectedPartnerId, setSelectedPartnerId] = useState(currentPartnerId ?? "");
  const [selectedLocationId, setSelectedLocationId] = useState(currentLocationId ?? "");

  // Fetch active service partners
  const { data: partners = [] } = useQuery({
    queryKey: queryKeys.organizations.list({ type: "service_partner", active: true }),
    queryFn: async () => {
      const { data, error } = await getSupabaseClient()
        .from("organizations")
        .select("id, name")
        .eq("type", "service_partner")
        .eq("active", true)
        .order("name");
      if (error) throw error;
      return (data ?? []) as Organization[];
    },
    enabled: open,
  });

  // Fetch locations for selected partner
  const { data: locations = [] } = useQuery({
    queryKey: queryKeys.stockLocations.byPartner(selectedPartnerId),
    queryFn: async () => {
      const { data, error } = await getSupabaseClient()
        .from("stock_locations")
        .select("id, name, address, city")
        .eq("organization_id", selectedPartnerId)
        .eq("is_active", true)
        .order("name");
      if (error) throw error;
      return (data ?? []) as StockLocation[];
    },
    enabled: open && !!selectedPartnerId,
  });

  // Auto-select: if only 1 partner, pick it; if only 1 location, pick it
  useEffect(() => {
    if (partners.length === 1 && !selectedPartnerId) {
      setSelectedPartnerId(partners[0].id);
    } else if (partners.length > 0 && !selectedPartnerId) {
      // Failsafe: default to Aces Direct if available
      const aces = partners.find((p) => p.id === DEFAULT_SERVICE_PARTNER_ORG_ID);
      if (aces) setSelectedPartnerId(aces.id);
    }
  }, [partners, selectedPartnerId]);

  useEffect(() => {
    if (locations.length === 1) {
      setSelectedLocationId(locations[0].id);
    } else if (locations.length === 0) {
      setSelectedLocationId("");
    }
  }, [locations]);

  const assignMutation = useMutation({
    mutationFn: async () => {
      const { error } = await getSupabaseClient()
        .from("donation_batches")
        .update({
          assigned_service_partner_id: selectedPartnerId,
          assigned_stock_location_id: selectedLocationId || null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", donationId);
      if (error) throw error;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.donations.detail(donationId) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.donations.all });
      onAssigned();
    },
  });

  if (!open) return null;

  const canSubmit = !!selectedPartnerId && (locations.length === 0 || !!selectedLocationId);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 backdrop-blur-sm sm:items-center">
      <div
        className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-xl"
        role="dialog"
        aria-labelledby="assign-sp-title"
      >
        <h2 id="assign-sp-title" className="text-lg font-bold text-slate-900">
          Servicepartner toewijzen
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          Wijs deze donatiebatch toe aan een servicepartner en kies de opslaglocatie.
        </p>

        <div className="mt-4 space-y-4">
          {/* Service Partner dropdown */}
          <div>
            <label
              htmlFor="sp-select"
              className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500"
            >
              <Building2 size={14} />
              Servicepartner *
            </label>
            <select
              id="sp-select"
              value={selectedPartnerId}
              onChange={(e) => {
                setSelectedPartnerId(e.target.value);
                setSelectedLocationId("");
              }}
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
            >
              <option value="">Selecteer servicepartner...</option>
              {partners.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          {/* Location dropdown — only if partner has locations */}
          {selectedPartnerId && locations.length > 1 && (
            <div>
              <label
                htmlFor="loc-select"
                className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500"
              >
                <MapPin size={14} />
                Opslaglocatie *
              </label>
              <select
                id="loc-select"
                value={selectedLocationId}
                onChange={(e) => setSelectedLocationId(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
              >
                <option value="">Selecteer locatie...</option>
                {locations.map((loc) => (
                  <option key={loc.id} value={loc.id}>
                    {loc.name}{loc.city ? ` — ${loc.city}` : ""}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Auto-selected location info */}
          {selectedPartnerId && locations.length === 1 && (
            <div className="rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-600">
              <MapPin size={14} className="mr-1 inline text-slate-400" />
              Locatie: <strong>{locations[0].name}</strong>
              {locations[0].city ? ` — ${locations[0].city}` : ""}
            </div>
          )}

          {/* No locations warning */}
          {selectedPartnerId && locations.length === 0 && (
            <div className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-700">
              Deze servicepartner heeft geen actieve opslaglocaties. De toewijzing wordt opgeslagen zonder locatie.
            </div>
          )}
        </div>

        {assignMutation.isError && (
          <p className="mt-3 text-sm text-red-600" role="alert">
            {assignMutation.error instanceof Error
              ? assignMutation.error.message
              : "Toewijzing mislukt."}
          </p>
        )}

        <div className="mt-6 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700"
          >
            Annuleren
          </button>
          <button
            type="button"
            disabled={!canSubmit || assignMutation.isPending}
            onClick={() => assignMutation.mutate()}
            className="rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-50"
          >
            {assignMutation.isPending ? "Bezig..." : "Toewijzen"}
          </button>
        </div>
      </div>
    </div>
  );
}
