import { LeaderboardEntry } from '@/data/community';
import { requireSupabase } from '@/lib/supabase';
import { publicMediaUrl } from '@/services/media-service';

export type LeaderRecord = {
  id: string; event_id: string | null; angler_name: string; fish_weight_kg: number;
  caught_at: string; image_path: string | null; notes: string; is_active: boolean;
  fish_count?: number; total_weight_kg?: number; events?: { title: string } | null;
};

export async function fetchLeaderboard(): Promise<LeaderboardEntry[]> {
  const { data, error } = await requireSupabase().from('leaderboard_entries').select('*,events(title)').eq('is_active', true).order('fish_weight_kg', { ascending: false }).order('caught_at', { ascending: false });
  if (error) throw new Error(error.message);
  return (data as LeaderRecord[]).map((item) => ({
    id: item.id, name: item.angler_name, event: item.events?.title || 'Penimbangan Adem Ayem',
    eventId: item.event_id, dateKey: item.caught_at,
    biggestKg: Number(item.fish_weight_kg), totalKg: Number(item.total_weight_kg ?? item.fish_weight_kg), fishCount: item.fish_count ?? 1,
    caughtAt: new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium', timeZone: 'Asia/Jakarta' }).format(new Date(`${item.caught_at}T00:00:00+07:00`)),
    image: item.image_path ? { uri: publicMediaUrl('content', item.image_path) ?? '' } : {}, periods: [],
  }));
}
