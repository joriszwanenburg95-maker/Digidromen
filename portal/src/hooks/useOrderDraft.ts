import { useState, useCallback, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { getSupabaseClient } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import type { Role } from '../types';

export interface OrderDraftData {
  /** Clientorganisatie; verplicht voor staff (namens hulporg), voor help_org altijd eigen org in saveDraft. */
  organization_id?: string;
  motivation: string;
  delivery_address: string;
  preferred_delivery_date: string | null;
  lines: Array<{
    product_id: string;
    quantity: number;
    line_type: 'new_request' | 'rma_defect';
    rma_category?: string;
    serial_number?: string;
    defect_description?: string;
    replacement_reason?: string;
    connector_type?: string;
    connector_wattage?: string;
    defect_photo_urls?: string[];
  }>;
}

const DRAFT_KEY = 'order_draft_id';

function resolveOrderOrganizationId(
  role: Role,
  userOrganizationId: string,
  dataOrganizationId: string | undefined,
): string {
  if (role === 'help_org') {
    return userOrganizationId;
  }
  if (dataOrganizationId) {
    return dataOrganizationId;
  }
  return userOrganizationId;
}

export function useOrderDraft() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const autosaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [draftId, setDraftId] = useState<string | null>(
    () => localStorage.getItem(DRAFT_KEY)
  );
  const [isSaving, setIsSaving] = useState(false);

  const saveDraft = useCallback(
    async (data: Partial<OrderDraftData>): Promise<string> => {
      if (!user) throw new Error('Niet ingelogd');

      setIsSaving(true);
      try {
        const supabase = getSupabaseClient();
        const organizationId = resolveOrderOrganizationId(
          user.role,
          user.organizationId,
          data.organization_id,
        );
        const payload = {
          organization_id: organizationId,
          requester_user_id: user.id,
          status: 'concept' as const,
          motivation: data.motivation ?? '',
          delivery_address: data.delivery_address ?? '',
          preferred_delivery_date: data.preferred_delivery_date ?? null,
          requested_at: new Date().toISOString(),
          stock_badge: '',
          ordering_window_ref: null,
          target_month: null,
        };

        if (draftId) {
          const { error, data: updated } = await supabase
            .from('orders')
            .update(payload)
            .eq('id', draftId)
            .eq('status', 'concept')
            .select('id');
          if (error) throw error;
          // UPDATE matched the existing draft — we're done
          if (updated && updated.length > 0) return draftId;
          // 0 rows updated: stale draft ID (e.g. after data reset). Clear it and fall through to INSERT.
          localStorage.removeItem(DRAFT_KEY);
          setDraftId(null);
        }
        const id = `ord-draft-${Date.now()}`;
        const { error } = await supabase
          .from('orders')
          .insert({ ...payload, id });
        if (error) throw error;
        setDraftId(id);
        localStorage.setItem(DRAFT_KEY, id);
        return id;
      } finally {
        setIsSaving(false);
      }
    },
    [draftId, user],
  );

  const scheduleSave = useCallback(
    (data: Partial<OrderDraftData>) => {
      if (autosaveTimer.current) clearTimeout(autosaveTimer.current);
      autosaveTimer.current = setTimeout(() => { void saveDraft(data); }, 30_000);
    },
    [saveDraft]
  );

  const discardDraft = useCallback(async () => {
    if (!draftId) return;
    await getSupabaseClient()
      .from('orders')
      .delete()
      .eq('id', draftId)
      .eq('status', 'concept');
    localStorage.removeItem(DRAFT_KEY);
    setDraftId(null);
    queryClient.invalidateQueries({ queryKey: ['orders'] });
  }, [draftId, queryClient]);

  const submitDraft = useCallback(
    async (lines: OrderDraftData['lines'], resolvedDraftId?: string) => {
      const effectiveDraftId = resolvedDraftId ?? draftId;
      if (!effectiveDraftId) throw new Error('Geen concept order aanwezig');

      const supabase = getSupabaseClient();

      const { error: deleteError } = await supabase
        .from('order_lines')
        .delete()
        .eq('order_id', effectiveDraftId);
      if (deleteError) throw deleteError;

      // Insert order lines
      const lineRows = lines.map((l, i) => ({
        id: `${effectiveDraftId}-line-${i}`,
        order_id: effectiveDraftId,
        product_id: l.product_id,
        quantity: l.quantity,
        line_type: l.line_type,
        rma_category: l.rma_category ?? null,
        serial_number: l.serial_number ?? null,
        defect_description: l.defect_description ?? null,
        replacement_reason: l.replacement_reason ?? null,
        connector_type: l.connector_type ?? null,
        connector_wattage: l.connector_wattage ?? null,
        defect_photo_urls: l.defect_photo_urls ?? [],
      }));

      const { error: lineError } = await supabase
        .from('order_lines')
        .insert(lineRows);
      if (lineError) throw lineError;

      // Status naar ingediend
      const { data: updatedRows, error } = await supabase
        .from('orders')
        .update({
          status: 'ingediend',
          requested_at: new Date().toISOString(),
        })
        .eq('id', effectiveDraftId)
        .eq('status', 'concept')
        .select('id');
      if (error) throw error;
      if (!updatedRows?.length) {
        throw new Error(
          'Kon de bestelling niet indienen: geen open concept meer met dit id. Vernieuw de pagina en start zo nodig een nieuwe bestelling.'
        );
      }

      localStorage.removeItem(DRAFT_KEY);
      setDraftId(null);
      queryClient.invalidateQueries({ queryKey: ['orders'] });

      return effectiveDraftId;
    },
    [draftId, queryClient]
  );

  return { draftId, isSaving, saveDraft, scheduleSave, discardDraft, submitDraft };
}
