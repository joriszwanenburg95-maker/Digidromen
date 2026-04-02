import { useQuery } from '@tanstack/react-query';
import { getSupabaseClient } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { queryKeys } from '../lib/queryKeys';

export interface OrderingWindowStatus {
  isOpen: boolean;
  openDay: number;
  closeDay: number;
  todayDay: number;
  /** Admin mag altijd bestellen */
  bypassActive: boolean;
  /** Dag waarop venster opent (huidige maand) */
  nextOpenDate: string;
}

export function useOrderingWindow(): {
  data: OrderingWindowStatus | undefined;
  isLoading: boolean;
} {
  const { user } = useAuth();
  const isAdmin = user?.role === 'digidromen_admin';

  const { data, isLoading } = useQuery({
    queryKey: queryKeys.orderingWindow.status(),
    queryFn: async (): Promise<OrderingWindowStatus> => {
      const { data, error } = await getSupabaseClient()
        .rpc('check_ordering_window');
      if (error) throw error;

      const row = Array.isArray(data) ? data[0] : data;
      const { is_open, open_day, close_day, today_day } = row as {
        is_open: boolean;
        open_day: number;
        close_day: number;
        today_day: number;
      };

      // Bereken wanneer het venster volgende keer opent
      const now = new Date();
      let nextOpen = new Date(now.getFullYear(), now.getMonth(), open_day);
      if (now.getDate() > close_day) {
        // Venster is al voorbij deze maand — volgende maand
        nextOpen = new Date(now.getFullYear(), now.getMonth() + 1, open_day);
      }
      const nextOpenDate = nextOpen.toLocaleDateString('nl-NL', {
        day: 'numeric',
        month: 'long',
      });

      return {
        isOpen: is_open,
        openDay: open_day,
        closeDay: close_day,
        todayDay: today_day,
        bypassActive: isAdmin,
        nextOpenDate,
      };
    },
    staleTime: 5 * 60 * 1000, // 5 min cache
  });

  return { data, isLoading };
}
