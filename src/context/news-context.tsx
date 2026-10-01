import { createContext, ReactNode, useCallback, useContext, useEffect, useState } from 'react';

import { NewsCategory, NewsItem, newsItems as fallbackNews } from '@/data/news';
import type { RemoteNewsItem } from '@/lib/database.types';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';
import { publicMediaUrl } from '@/services/media-service';

type NewsContextValue = {
  newsItems: NewsItem[];
  loading: boolean;
  error: string | null;
  refreshNews: () => Promise<void>;
};

const NewsContext = createContext<NewsContextValue | null>(null);

const fallbackImages = [
  require('../../assets/images/nila/carousel-event-nila.png'),
  require('../../assets/images/nila/gallery-release.png'),
  require('../../assets/images/nila/news-natural-bait.png'),
  require('../../assets/images/nila/gallery-family.png'),
];

const categoryLabels: Record<string, NewsCategory> = {
  event: 'Event',
  kolam: 'Kolam',
  aturan: 'Aturan',
  pengumuman: 'Pengumuman',
};

function mapRemoteNews(item: RemoteNewsItem, index: number): NewsItem {
  const category = categoryLabels[item.category.toLowerCase()] ?? 'Pengumuman';
  const body = item.body.trim();
  const wordCount = body.split(/\s+/).filter(Boolean).length;
  const publicImage = publicMediaUrl('content', item.image_path);

  return {
    id: item.id,
    category,
    title: item.title,
    summary: item.summary,
    date: new Intl.DateTimeFormat('id-ID', {
      day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Asia/Jakarta',
    }).format(new Date(item.published_at ?? item.created_at)),
    readTime: `${Math.max(1, Math.ceil(wordCount / 180))} menit`,
    badge: category === 'Event' ? 'EVENT TERBARU' : category.toUpperCase(),
    image: publicImage ? { uri: publicImage } : fallbackImages[index % fallbackImages.length],
    featured: index === 0,
    relatedEventId: item.event_id ?? undefined,
    paragraphs: body.split(/\n\s*\n/).filter(Boolean).length
      ? body.split(/\n\s*\n/).filter(Boolean)
      : [item.summary],
  };
}

export function NewsProvider({ children }: { children: ReactNode }) {
  const [newsItems, setNewsItems] = useState<NewsItem[]>(isSupabaseConfigured ? [] : fallbackNews);
  const [loading, setLoading] = useState(isSupabaseConfigured);
  const [loadError, setLoadError] = useState<string | null>(null);

  const refreshNews = useCallback(async () => {
    if (!isSupabaseConfigured) return;
    setLoading(true);
    try {
      const { data, error } = await supabase.from('news_items').select('*').eq('is_active', true).lte('published_at', new Date().toISOString()).order('published_at', { ascending: false });
      if (error) throw new Error(error.message);
      const mapped = (data as RemoteNewsItem[]).map(mapRemoteNews);
      setNewsItems(mapped);
      setLoadError(null);
    } catch (cause) { setLoadError(cause instanceof Error ? cause.message : 'Berita belum dapat dimuat.'); throw cause; }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    if (!isSupabaseConfigured) return;
    const timer = setTimeout(() => {
      refreshNews().catch(() => undefined).finally(() => setLoading(false));
    }, 0);
    return () => clearTimeout(timer);
  }, [refreshNews]);

  return <NewsContext.Provider value={{ newsItems, loading, error: loadError, refreshNews }}>{children}</NewsContext.Provider>;
}

export function useNews() {
  const context = useContext(NewsContext);
  if (!context) throw new Error('useNews harus digunakan di dalam NewsProvider');
  return context;
}
