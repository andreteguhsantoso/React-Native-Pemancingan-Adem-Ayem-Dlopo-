import { createContext, ReactNode, useCallback, useContext, useEffect, useState } from 'react';

import { events as fallbackEvents, FishingEvent } from '@/data/events';
import type { RemoteEvent } from '@/lib/database.types';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';
import { fetchOccupiedSpots } from '@/services/booking-service';
import { publicMediaUrl } from '@/services/media-service';

type EventsContextValue = {
  events: FishingEvent[];
  loading: boolean;
  error: string | null;
  refreshEvents: () => Promise<void>;
};

const EventsContext = createContext<EventsContextValue | null>(null);

const fallbackImages = [
  require('../../assets/images/nila/carousel-event-nila.png'),
  require('../../assets/images/nila/gallery-nila.png'),
  require('../../assets/images/nila/carousel-night-nila.png'),
  require('../../assets/images/nila/venue-nila.png'),
];

function formatEventDate(value: string) {
  const date = new Date(value);
  return {
    date: new Intl.DateTimeFormat('id-ID', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      timeZone: 'Asia/Jakarta',
    }).format(date),
    shortDate: new Intl.DateTimeFormat('id-ID', {
      day: '2-digit',
      month: 'short',
      timeZone: 'Asia/Jakarta',
    }).format(date).replace('.', '').toUpperCase(),
  };
}

function formatTimeRange(startsAt: string, endsAt: string) {
  const formatter = new Intl.DateTimeFormat('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: 'Asia/Jakarta',
  });
  return `${formatter.format(new Date(startsAt)).replace('.', ':')} - ${formatter.format(new Date(endsAt)).replace('.', ':')} WIB`;
}

async function mapRemoteEvent(event: RemoteEvent, index: number): Promise<FishingEvent> {
  const occupied = await fetchOccupiedSpots(event.id);
  const date = formatEventDate(event.starts_at);
  const publicImage = publicMediaUrl('content', event.image_path);

  return {
    startsAt: event.starts_at, endsAt: event.ends_at, description: event.description, featured: event.featured,
    id: event.id,
    title: event.title,
    label: event.label,
    date: date.date,
    shortDate: date.shortDate,
    time: formatTimeRange(event.starts_at, event.ends_at),
    fishKg: Number(event.fish_kg),
    price: event.price,
    availableSpots: Math.max(0, event.total_spots - occupied.size),
    totalSpots: event.total_spots,
    image: publicImage ? { uri: publicImage } : fallbackImages[index % fallbackImages.length],
  };
}

export function EventsProvider({ children }: { children: ReactNode }) {
  const [events, setEvents] = useState<FishingEvent[]>(isSupabaseConfigured ? [] : fallbackEvents);
  const [loading, setLoading] = useState(isSupabaseConfigured);
  const [loadError, setLoadError] = useState<string | null>(null);

  const refreshEvents = useCallback(async () => {
    if (!isSupabaseConfigured) return;
    setLoading(true);
    try {
      const { data, error } = await supabase.from('events').select('*').eq('status', 'published').order('starts_at', { ascending: true });
      if (error) throw new Error(error.message);
      const mapped = await Promise.all((data as RemoteEvent[]).map(mapRemoteEvent));
      setEvents(mapped);
      setLoadError(null);
    } catch (cause) { setLoadError(cause instanceof Error ? cause.message : 'Agenda belum dapat dimuat.'); throw cause; }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    if (!isSupabaseConfigured) return;
    const timer = setTimeout(() => {
      refreshEvents().catch(() => undefined).finally(() => setLoading(false));
    }, 0);
    return () => clearTimeout(timer);
  }, [refreshEvents]);

  return <EventsContext.Provider value={{ events, loading, error: loadError, refreshEvents }}>{children}</EventsContext.Provider>;
}

export function useEvents() {
  const context = useContext(EventsContext);
  if (!context) throw new Error('useEvents harus digunakan di dalam EventsProvider');
  return context;
}
