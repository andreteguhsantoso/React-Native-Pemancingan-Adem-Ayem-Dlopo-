import { createContext, ReactNode, useContext, useEffect, useState } from 'react';

import type { VenueSettings } from '@/lib/database.types';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';

const fallbackVenue: VenueSettings = {
  id: true,
  venue_name: 'Pemancingan Adem Ayem Dlopo',
  opens_at: '06:00',
  closes_at: '22:00',
  fish_mood: 'aktif',
  fish_mood_note: 'Cuaca teduh, waktu terbaik 06.30 - 09.00.',
  map_url: 'https://maps.app.goo.gl/cQtnrkjTiAvC5JNC7',
  whatsapp: null,
  natural_bait_rule: 'Umpan wajib berasal dari bahan alami. Essen atau pemanis hanya boleh sebagai campuran umpan alami.',
  updated_by: null,
  updated_at: '',
};

type VenueContextValue = {
  venue: VenueSettings;
  refreshVenue: () => Promise<void>;
};

const VenueContext = createContext<VenueContextValue | null>(null);

export function VenueProvider({ children }: { children: ReactNode }) {
  const [venue, setVenue] = useState(fallbackVenue);

  const refreshVenue = async () => {
    if (!isSupabaseConfigured) return;
    const { data, error } = await supabase.from('venue_settings').select('*').eq('id', true).single();
    if (error) throw new Error(error.message);
    setVenue(data as VenueSettings);
  };

  useEffect(() => {
    if (!isSupabaseConfigured) return;
    const timer = setTimeout(() => refreshVenue().catch(() => undefined), 0);
    return () => clearTimeout(timer);
  }, []);

  return <VenueContext.Provider value={{ venue, refreshVenue }}>{children}</VenueContext.Provider>;
}

export function useVenue() {
  const context = useContext(VenueContext);
  if (!context) throw new Error('useVenue harus digunakan di dalam VenueProvider');
  return context;
}
