import { useRouter } from 'expo-router';
import { useCallback } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { MediaImage } from '@/components/media-image';
import { MaxContentWidth, Palette } from '@/constants/theme';
import { useAuth } from '@/context/auth-context';
import { useFocusResource } from '@/hooks/use-focus-resource';
import { requireSupabase } from '@/lib/supabase';
import { galleryMediaUrls } from '@/services/media-service';

type Submission = { id: string; title: string; image_path: string; status: string; created_at: string; imageUrl?: string };
const labels: Record<string, string> = { pending: 'Menunggu persetujuan', approved: 'Disetujui', rejected: 'Ditolak pengelola' };

export default function GallerySubmissionsScreen() {
  const router = useRouter();
  const { session } = useAuth();
  const load = useCallback(async () => {
    if (!session) return [];
    const { data, error } = await requireSupabase().from('gallery_items').select('id,title,image_path,status,created_at').eq('user_id', session.user.id).order('created_at', { ascending: false });
    if (error) throw new Error(error.message);
    const photos = await galleryMediaUrls(data.map((item) => item.image_path));
    return data.map((item) => ({ ...item, imageUrl: photos.get(item.image_path) })) as Submission[];
  }, [session]);
  const { data, refreshing, error, refresh } = useFocusResource(load, [], Boolean(session));
  return <SafeAreaView style={styles.screen}><View style={styles.page}>
    <View style={styles.header}><Pressable onPress={() => router.back()} style={styles.back}><Text style={styles.backText}>‹</Text></Pressable><View><Text style={styles.kicker}>GALERI KOMUNITAS</Text><Text style={styles.title}>Kiriman saya</Text></View></View>
    <ScrollView refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={Palette.orange} />} contentContainerStyle={styles.content}>
      <Text style={styles.body}>Pantau status foto Anda. Foto yang disetujui tampil di galeri publik; foto ditolak dapat dikirim ulang setelah diperbaiki.</Text>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {!session ? <Text style={styles.body}>Masuk untuk melihat foto kiriman Anda.</Text> : !refreshing && !data.length ? <Text style={styles.body}>Belum ada foto yang dikirim.</Text> : null}
      {data.map((item) => <View key={item.id} style={styles.card}><MediaImage source={item.imageUrl ? { uri: item.imageUrl } : null} style={styles.photo} showRetry fallbackLabel="Foto gagal dibuka. Silakan kirim ulang foto asli." /><Text style={styles.status}>{labels[item.status] ?? item.status}</Text><Text style={styles.itemTitle}>{item.title}</Text><Text style={styles.body}>{new Date(item.created_at).toLocaleDateString('id-ID')}</Text></View>)}
    </ScrollView>
  </View></SafeAreaView>;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Palette.ink, alignItems: 'center' }, page: { flex: 1, width: '100%', maxWidth: MaxContentWidth, backgroundColor: Palette.paper }, header: { padding: 16, gap: 14, flexDirection: 'row', alignItems: 'center', backgroundColor: Palette.ink }, back: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', backgroundColor: Palette.inkSoft, borderRadius: 14 }, backText: { fontSize: 30, color: Palette.white }, kicker: { fontSize: 11, color: Palette.gold, fontWeight: '800' }, title: { fontSize: 28, color: Palette.white, fontWeight: '900' }, content: { padding: 16, paddingBottom: 40, gap: 16 }, body: { fontSize: 14, lineHeight: 21, color: Palette.inkSoft }, error: { color: Palette.orangeDark, fontSize: 14 }, card: { borderRadius: 20, backgroundColor: Palette.surface, padding: 14, gap: 10 }, photo: { height: 240, width: '100%', borderRadius: 14 }, status: { color: Palette.orangeDark, fontSize: 12, fontWeight: '800' }, itemTitle: { color: Palette.ink, fontSize: 20, fontWeight: '800' },
});
