import { MediaImage as Image } from '@/components/media-image';
import { Href, useRouter } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BottomTabInset, Fonts, MaxContentWidth, Palette, Radius } from '@/constants/theme';
import { useAuth } from '@/context/auth-context';
import { GalleryCategory, GalleryItem, galleryItems } from '@/data/community';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';
import { galleryMediaUrls } from '@/services/media-service';
import { useFocusResource } from '@/hooks/use-focus-resource';

type GalleryFilter = 'Semua' | GalleryCategory;

const filters: GalleryFilter[] = ['Semua', 'Event', 'Tangkapan', 'Momen', 'Kolam'];

export default function GalleryScreen() {
  const router = useRouter();
  const { session } = useAuth();
  const { width } = useWindowDimensions();
  const [activeFilter, setActiveFilter] = useState<GalleryFilter>('Semua');
  const [selectedItem, setSelectedItem] = useState<GalleryItem | null>(null);
  const contentWidth = Math.min(width, MaxContentWidth);
  const cardWidth = (contentWidth - 42) / 2;

  const loadGallery = useCallback(async () => {
    const approvedQuery = supabase.from('gallery_items').select('id,title,category,image_path,created_at').eq('status', 'approved').eq('is_active', true).order('created_at', { ascending: false });
    const pendingQuery = session
      ? supabase.from('gallery_items').select('id', { count: 'exact', head: true }).eq('user_id', session.user.id).eq('status', 'pending')
      : Promise.resolve({ count: 0, error: null });
    const [approvedResult, pendingResult] = await Promise.all([approvedQuery, pendingQuery]);
    if (approvedResult.error) throw new Error(approvedResult.error.message);
    let warning = pendingResult.error ? 'Status kiriman Anda belum dapat diperbarui.' : '';
    const photos = await galleryMediaUrls((approvedResult.data ?? []).map((item) => item.image_path)).catch((cause) => { warning = cause instanceof Error ? cause.message : 'Foto belum dapat dimuat.'; return new Map<string, string>(); });
    const items = (approvedResult.data ?? []).map((item) => ({
        id: item.id,
        title: item.title,
        category: `${item.category.slice(0, 1).toUpperCase()}${item.category.slice(1)}` as GalleryCategory,
        date: new Intl.DateTimeFormat('id-ID', { dateStyle: 'long' }).format(new Date(item.created_at)),
        event: 'Komunitas Adem Ayem',
        image: { uri: photos.get(item.image_path) ?? '' },
      }));
    return { items, pendingCount: pendingResult.count ?? 0, warning };
  }, [session]);
  const { data, refreshing, error, refresh } = useFocusResource<{ items: GalleryItem[]; pendingCount: number; warning: string }>(loadGallery, { items: [], pendingCount: 0, warning: '' }, isSupabaseConfigured);
  const pendingCount = data.pendingCount;
  const loadError = error || data.warning;
  const allItems = isSupabaseConfigured ? data.items : galleryItems;
  const visibleItems = activeFilter === 'Semua' ? allItems : allItems.filter((item) => item.category === activeFilter);

  return (
    <View style={styles.screen}>
      <SafeAreaView edges={['top']} style={styles.safeArea}>
        <View style={styles.header}>
          <View style={styles.headerCopy}>
            <Text style={styles.eyebrow}>CERITA DARI TEPI KOLAM</Text>
            <Text style={styles.title}>Galeri pemancingan.</Text>
            <Text style={styles.subtitle}>Momen asli dari pelepasan ikan, event, dan hasil tangkapan nila.</Text>
          </View>
          <View style={styles.headerIcon}>
            <SymbolView
              name={{ ios: 'photo.stack.fill', android: 'collections', web: 'collections' }}
              tintColor={Palette.gold}
              size={26}
            />
          </View>
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={Palette.orange} colors={[Palette.orange]} />}
          contentContainerStyle={styles.content}>
          {loadError ? <View style={styles.syncNotice}><Text style={styles.syncNoticeTitle}>Galeri belum tersinkron</Text><Text style={styles.syncNoticeText}>{loadError}</Text></View> : null}
          {pendingCount > 0 ? <View style={styles.pendingNotice}><ActivityIndicator size="small" color={Palette.ink} /><View style={styles.pendingCopy}><Text style={styles.pendingTitle}>{pendingCount} foto Anda sedang ditinjau</Text><Text style={styles.pendingText}>Foto otomatis muncul setelah disetujui pengelola.</Text></View></View> : null}
          {allItems[0] ? <Pressable onPress={() => setSelectedItem(allItems[0])} style={styles.featuredCard}>
            <Image source={allItems[0].image} contentFit="cover" transition={300} style={styles.featuredImage} />
            <View style={styles.featuredShade} />
            <View style={styles.featuredBadge}>
              <View style={styles.liveDot} />
              <Text style={styles.featuredBadgeText}>ALBUM TERBARU</Text>
            </View>
            <View style={styles.featuredCopy}>
              <Text style={styles.featuredTitle}>{allItems[0].title}</Text>
              <Text style={styles.featuredMeta}>{allItems[0].event} · {allItems[0].date}</Text>
            </View>
          </Pressable> : null}

          <View style={styles.sectionHeading}>
            <View>
              <Text style={styles.sectionEyebrow}>JELAJAHI MOMEN</Text>
              <Text style={styles.sectionTitle}>Foto pilihan</Text>
            </View>
            <Text style={styles.photoCount}>{visibleItems.length} FOTO</Text>
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterRow}>
            {filters.map((filter) => {
              const active = filter === activeFilter;
              return (
                <Pressable
                  key={filter}
                  onPress={() => setActiveFilter(filter)}
                  style={[styles.filterChip, active && styles.filterChipActive]}>
                  <Text style={[styles.filterText, active && styles.filterTextActive]}>{filter}</Text>
                </Pressable>
              );
            })}
          </ScrollView>

          <View style={styles.grid}>
            {!refreshing && visibleItems.length === 0 ? <View style={{ padding: 20 }}><Text style={{ color: Palette.ink, fontSize: 18, fontWeight: '800' }}>Belum ada foto pada kategori ini</Text><Text style={{ color: Palette.muted, fontSize: 14, lineHeight: 21, marginTop: 8 }}>Kiriman akan tampil setelah disetujui pengelola. Tarik halaman untuk memperbarui.</Text></View> : null}
            {visibleItems.map((item, index) => (
              <Pressable
                key={item.id}
                onPress={() => setSelectedItem(item)}
                style={({ pressed }) => [
                  styles.photoCard,
                  { width: cardWidth },
                  pressed && styles.pressed,
                ]}>
                <Image
                  source={item.image}
                  contentFit="cover"
                  transition={250}
                  style={[styles.photoImage, { height: index % 3 === 0 ? 218 : 166 }]}
                />
                <View style={styles.photoBody}>
                  <Text numberOfLines={2} style={styles.photoTitle}>{item.title}</Text>
                  <View style={styles.photoFooter}>
                    <Text style={styles.category}>{item.category.toUpperCase()}</Text>
                    <Text style={styles.openMark}>↗</Text>
                  </View>
                </View>
              </Pressable>
            ))}
          </View>

          <Pressable onPress={() => router.push('/gallery-submit' as Href)} style={({ pressed }) => [styles.galleryNote, pressed && styles.pressed]}>
            <SymbolView
              name={{ ios: 'camera.fill', android: 'photo_camera', web: 'photo_camera' }}
              tintColor={Palette.orange}
              size={22}
            />
            <View style={styles.galleryNoteCopy}>
              <Text style={styles.galleryNoteTitle}>Punya momen bagus di kolam?</Text>
              <Text style={styles.galleryNoteText}>Kirim langsung dari aplikasi. Foto akan tampil setelah disetujui pengelola.</Text>
            </View>
            <Text style={styles.uploadArrow}>→</Text>
          </Pressable>
          {session ? <Pressable onPress={() => router.push('/gallery-submissions' as Href)} style={styles.galleryNote}><Text style={styles.galleryNoteTitle}>Lihat foto kiriman saya & status moderasi →</Text></Pressable> : null}
        </ScrollView>
      </SafeAreaView>

      <Modal
        animationType="fade"
        transparent
        visible={selectedItem !== null}
        onRequestClose={() => setSelectedItem(null)}>
        <View style={styles.modalBackdrop}>
          <SafeAreaView style={styles.modalSafeArea}>
            <View style={styles.modalTopBar}>
              <View>
                <Text style={styles.modalEyebrow}>{selectedItem?.category.toUpperCase()}</Text>
                <Text style={styles.modalTitle}>Lihat foto</Text>
              </View>
              <Pressable onPress={() => setSelectedItem(null)} style={styles.closeButton}>
                <Text style={styles.closeText}>×</Text>
              </Pressable>
            </View>
            <Image source={selectedItem?.image} contentFit="contain" style={styles.modalImage} showRetry fallbackLabel="Foto belum dapat dimuat. Jika tetap gagal, pengirim perlu mengunggah ulang foto asli." />
            <View style={styles.modalCaption}>
              <Text style={styles.modalCaptionTitle}>{selectedItem?.title}</Text>
              <Text style={styles.modalCaptionMeta}>{selectedItem?.event} · {selectedItem?.date}</Text>
            </View>
          </SafeAreaView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Palette.paper, alignItems: 'center' },
  safeArea: { flex: 1, width: '100%', maxWidth: MaxContentWidth },
  header: {
    backgroundColor: Palette.ink,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 28,
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  headerCopy: { flex: 1, paddingRight: 10 },
  eyebrow: { color: Palette.gold, fontFamily: Fonts?.rounded, fontSize: 10, fontWeight: '900', letterSpacing: 1.5 },
  title: { color: Palette.white, fontFamily: Fonts?.display, fontSize: 30, fontWeight: '900', letterSpacing: -0.7, marginTop: 4 },
  subtitle: { color: '#B9CFCC', fontFamily: Fonts?.sans, fontSize: 11, lineHeight: 17, marginTop: 5, maxWidth: 310 },
  headerIcon: { width: 48, height: 48, borderRadius: 16, backgroundColor: Palette.inkSoft, alignItems: 'center', justifyContent: 'center', transform: [{ rotate: '4deg' }] },
  content: { paddingBottom: BottomTabInset + 28 },
  syncNotice: { marginHorizontal: 16, marginTop: 14, borderRadius: 14, backgroundColor: '#FFF0EB', borderWidth: 1, borderColor: '#F3B9A8', padding: 12 },
  syncNoticeTitle: { color: Palette.orangeDark, fontFamily: Fonts?.rounded, fontSize: 10, fontWeight: '900' },
  syncNoticeText: { color: Palette.inkSoft, fontFamily: Fonts?.sans, fontSize: 8, lineHeight: 12, marginTop: 3 },
  pendingNotice: { marginHorizontal: 16, marginTop: 14, borderRadius: 14, backgroundColor: Palette.gold, padding: 12, flexDirection: 'row', alignItems: 'center', gap: 11 },
  pendingCopy: { flex: 1 },
  pendingTitle: { color: Palette.ink, fontFamily: Fonts?.rounded, fontSize: 10, fontWeight: '900' },
  pendingText: { color: Palette.inkSoft, fontFamily: Fonts?.sans, fontSize: 8, marginTop: 2 },
  featuredCard: { height: 248, marginHorizontal: 16, marginTop: -12, borderRadius: Radius.large, overflow: 'hidden', backgroundColor: Palette.inkSoft, shadowColor: Palette.ink, shadowOffset: { width: 0, height: 12 }, shadowOpacity: 0.2, shadowRadius: 22, elevation: 6 },
  featuredImage: { width: '100%', height: '100%' },
  featuredShade: { position: 'absolute', inset: 0, backgroundColor: 'rgba(5, 34, 37, 0.25)' },
  featuredBadge: { position: 'absolute', top: 16, left: 16, flexDirection: 'row', alignItems: 'center', gap: 7, backgroundColor: Palette.surface, borderRadius: Radius.pill, paddingHorizontal: 11, paddingVertical: 7 },
  liveDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: Palette.orange },
  featuredBadgeText: { color: Palette.ink, fontFamily: Fonts?.rounded, fontSize: 9, fontWeight: '900', letterSpacing: 0.8 },
  featuredCopy: { position: 'absolute', left: 18, right: 18, bottom: 18 },
  featuredTitle: { color: Palette.white, fontFamily: Fonts?.display, fontSize: 25, fontWeight: '900', letterSpacing: -0.4 },
  featuredMeta: { color: '#E7F3EF', fontFamily: Fonts?.sans, fontSize: 11, marginTop: 4 },
  sectionHeading: { marginTop: 28, paddingHorizontal: 18, flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' },
  sectionEyebrow: { color: Palette.orange, fontFamily: Fonts?.rounded, fontSize: 9, fontWeight: '900', letterSpacing: 1.3 },
  sectionTitle: { color: Palette.ink, fontFamily: Fonts?.display, fontSize: 25, fontWeight: '900', marginTop: 2 },
  photoCount: { color: Palette.muted, fontFamily: Fonts?.rounded, fontSize: 9, fontWeight: '900', letterSpacing: 1 },
  filterRow: { paddingHorizontal: 18, paddingTop: 14, paddingBottom: 16, gap: 8 },
  filterChip: { height: 36, borderRadius: Radius.pill, borderWidth: 1, borderColor: '#D8D9CF', backgroundColor: Palette.surface, paddingHorizontal: 15, alignItems: 'center', justifyContent: 'center' },
  filterChipActive: { backgroundColor: Palette.orange, borderColor: Palette.orange },
  filterText: { color: Palette.ink, fontFamily: Fonts?.rounded, fontSize: 11, fontWeight: '800' },
  filterTextActive: { color: Palette.white },
  grid: { paddingHorizontal: 16, flexDirection: 'row', flexWrap: 'wrap', alignItems: 'flex-start', gap: 10 },
  photoCard: { borderRadius: 18, overflow: 'hidden', backgroundColor: Palette.surface, borderWidth: 1, borderColor: '#E8E2D5' },
  photoImage: { width: '100%', backgroundColor: Palette.inkSoft },
  photoBody: { paddingHorizontal: 11, paddingTop: 10, paddingBottom: 9 },
  photoTitle: { minHeight: 34, color: Palette.ink, fontFamily: Fonts?.rounded, fontSize: 12, lineHeight: 16, fontWeight: '900' },
  photoFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 6 },
  category: { color: Palette.orange, fontFamily: Fonts?.rounded, fontSize: 8, fontWeight: '900', letterSpacing: 0.8 },
  openMark: { color: Palette.ink, fontSize: 15, fontWeight: '900' },
  pressed: { opacity: 0.82, transform: [{ scale: 0.985 }] },
  galleryNote: { marginHorizontal: 16, marginTop: 22, borderRadius: Radius.medium, backgroundColor: Palette.gold, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 13 },
  galleryNoteCopy: { flex: 1 },
  galleryNoteTitle: { color: Palette.ink, fontFamily: Fonts?.rounded, fontSize: 13, fontWeight: '900' },
  galleryNoteText: { color: Palette.inkSoft, fontFamily: Fonts?.sans, fontSize: 10, lineHeight: 15, marginTop: 3 },
  uploadArrow: { color: Palette.ink, fontSize: 23, marginLeft: 8 },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(3, 24, 26, 0.97)' },
  modalSafeArea: { flex: 1, width: '100%', maxWidth: MaxContentWidth, alignSelf: 'center' },
  modalTopBar: { paddingHorizontal: 18, paddingVertical: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  modalEyebrow: { color: Palette.gold, fontFamily: Fonts?.rounded, fontSize: 9, fontWeight: '900', letterSpacing: 1.2 },
  modalTitle: { color: Palette.white, fontFamily: Fonts?.display, fontSize: 23, fontWeight: '900', marginTop: 2 },
  closeButton: { width: 43, height: 43, borderRadius: 15, backgroundColor: Palette.inkSoft, alignItems: 'center', justifyContent: 'center' },
  closeText: { color: Palette.white, fontFamily: Fonts?.sans, fontSize: 28, lineHeight: 31, marginTop: -2 },
  modalImage: { flex: 1, width: '100%' },
  modalCaption: { paddingHorizontal: 20, paddingTop: 18, paddingBottom: 28 },
  modalCaptionTitle: { color: Palette.white, fontFamily: Fonts?.display, fontSize: 25, fontWeight: '900' },
  modalCaptionMeta: { color: '#B9CFCC', fontFamily: Fonts?.sans, fontSize: 11, marginTop: 5 },
});
