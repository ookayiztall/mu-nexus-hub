import { supabase } from '@/integrations/supabase/client';

// Max active listings per slot. Slots not listed here have no enforced cap.
export const SLOT_CAPACITY: Record<number, number> = {
  4: 5, // Premium Mu Online Servers
  5: 3, // Main Banner
  6: 5, // Upcoming & Recent Mu Online Servers
};

export interface CapacityResult {
  atCapacity: boolean;
  activeCount: number;
  max: number;
  nextAvailableAt: Date | null;
}

/**
 * Returns capacity info for the given slot. If the slot has no cap defined,
 * always returns `atCapacity: false`.
 */
export const checkSlotCapacity = async (slotId: number): Promise<CapacityResult> => {
  const max = SLOT_CAPACITY[slotId];
  if (!max) {
    return { atCapacity: false, activeCount: 0, max: Infinity, nextAvailableAt: null };
  }

  let table: 'premium_text_servers' | 'premium_banners' | 'servers';
  if (slotId === 4) table = 'premium_text_servers';
  else if (slotId === 5) table = 'premium_banners';
  else if (slotId === 6) table = 'servers';
  else return { atCapacity: false, activeCount: 0, max, nextAvailableAt: null };

  let query = supabase
    .from(table)
    .select('expires_at')
    .eq('is_active', true);

  if (table === 'servers') {
    query = query.eq('slot_id', slotId);
  }

  const { data, error } = await query;
  if (error || !data) {
    return { atCapacity: false, activeCount: 0, max, nextAvailableAt: null };
  }

  const now = Date.now();
  const active = data.filter((row: any) => {
    if (!row.expires_at) return true; // no expiry = still active
    return new Date(row.expires_at).getTime() > now;
  });

  const activeCount = active.length;
  const atCapacity = activeCount >= max;

  let nextAvailableAt: Date | null = null;
  if (atCapacity) {
    const withDates = active
      .map((r: any) => (r.expires_at ? new Date(r.expires_at) : null))
      .filter((d): d is Date => d !== null)
      .sort((a, b) => a.getTime() - b.getTime());
    nextAvailableAt = withDates[0] || null;
  }

  return { atCapacity, activeCount, max, nextAvailableAt };
};

export const formatCapacityMessage = (slotId: number, res: CapacityResult): string => {
  const slotNames: Record<number, string> = {
    4: 'Premium Mu Online Servers',
    5: 'Main Banner',
    6: 'Upcoming & Recent Servers',
  };
  const name = slotNames[slotId] || `Slot ${slotId}`;
  const base = `${name} is fully booked (${res.activeCount}/${res.max}).`;
  if (res.nextAvailableAt) {
    return `${base} Next spot opens ${res.nextAvailableAt.toLocaleDateString()}.`;
  }
  return `${base} Please check back later.`;
};
