import { MediaImage as Image } from '@/components/media-image';
import { useRouter } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useMemo, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Fonts, MaxContentWidth, Palette, Radius } from '@/constants/theme';
import { useNews } from '@/context/news-context';
import { NewsCategory } from '@/data/news';

type NewsFilter = 'Semua' | NewsCategory;

const filters: NewsFilter[] = ['Semua', 'Event', 'Kolam', 'Aturan', 'Pengumuman'];

export default function NewsScreen() {
  const router = useRouter();
  const { newsItems, loading, error, refreshNews } = useNews();
  const [activeFilter, setActiveFilter] = useState<NewsFilter>('Semua');
  const featured = newsItems.find((item) => item.featured) ?? newsItems[0];
  const visibleNews = useMemo(
    () => newsItems.filter((item) => !item.featured && (activeFilter === 'Semua' || item.category === activeFilter)),
    [activeFilter, newsItems],
  );

  return (
    <View style={styles.screen}>
      <SafeAreaView edges={['top']} style={styles.safeArea}>
        <View style={styles.header}>
          <View style={styles.headerTop}>
            <Pressable onPress={() => router.back()} style={styles.backButton}>
              <Text style={styles.backText}>‹</Text>
            </Pressable>
            <View style={styles.headerCopy}>
              <Text style={styles.eyebrow}>KABAR PEMANCINGAN</Text>
              <Text style={styles.title}>Kabar Adem Ayem.</Text>
            </View>
            <View style={styles.newsIcon}>
              <SymbolView
                name={{ ios: 'newspaper.fill', android: 'newspaper', web: 'newspaper' }}
                tintColor={Palette.gold}
                size={24}
              />
            </View>
          </View>
          <Text style={styles.subtitle}>Pengumuman resmi, kondisi kolam, aturan, dan rencana event terbaru.</Text>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} refreshControl={<RefreshControl refreshing={loading} onRefresh={() => { void refreshNews().catch(() => undefined); }} tintColor={Palette.orange} />} contentContainerStyle={styles.content}>
          {error ? <Text style={{ fontSize: 14, color: Palette.orangeDark, padding: 18 }}>{error}</Text> : null}
          {!loading && !newsItems.length ? <Text style={{ fontSize: 16, color: Palette.ink, padding: 18 }}>Belum ada kabar yang diterbitkan pengelola.</Text> : null}
          {featured ? <Pressable
            onPress={() => router.push({ pathname: '/news/[id]', params: { id: featured.id } })}
            style={({ pressed }) => [styles.featuredCard, pressed && styles.pressed]}>
            <Image source={featured.image} contentFit="cover" transition={300} style={styles.featuredImage} />
            <View style={styles.featuredShade} />
            <View style={styles.featuredBadge}>
              <View style={styles.badgeDot} />
              <Text style={styles.featuredBadgeText}>{featured.badge}</Text>
            </View>
            <View style={styles.featuredCopy}>
              <Text style={styles.featuredMeta}>{featured.category.toUpperCase()} · {featured.date}</Text>
              <Text style={styles.featuredTitle}>{featured.title}</Text>
              <Text style={styles.featuredSummary}>{featured.summary}</Text>
              <View style={styles.readRow}>
                <Text style={styles.readText}>Baca selengkapnya</Text>
                <Text style={styles.readArrow}>→</Text>
              </View>
            </View>
          </Pressable> : null}

          <View style={styles.sectionHeading}>
            <View>
              <Text style={styles.sectionEyebrow}>INFORMASI TERBARU</Text>
              <Text style={styles.sectionTitle}>Dari pengelola kolam</Text>
            </View>
            <Text style={styles.articleCount}>{visibleNews.length} KABAR</Text>
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
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

          <View style={styles.newsList}>
            {visibleNews.length ? visibleNews.map((item) => (
              <Pressable
                key={item.id}
                onPress={() => router.push({ pathname: '/news/[id]', params: { id: item.id } })}
                style={({ pressed }) => [styles.newsCard, pressed && styles.pressed]}>
                <Image source={item.image} contentFit="cover" transition={250} style={styles.newsImage} />
                <View style={styles.newsBody}>
                  <View style={styles.newsTopLine}>
                    <Text style={styles.newsCategory}>{item.category.toUpperCase()}</Text>
                    <Text style={styles.newsReadTime}>{item.readTime}</Text>
                  </View>
                  <Text numberOfLines={2} style={styles.newsTitle}>{item.title}</Text>
                  <Text numberOfLines={2} style={styles.newsSummary}>{item.summary}</Text>
                  <View style={styles.newsFooter}>
                    <Text style={styles.newsDate}>{item.date}</Text>
                    <View style={styles.openButton}>
                      <Text style={styles.openArrow}>↗</Text>
                    </View>
                  </View>
                </View>
              </Pressable>
            )) : (
              <View style={styles.emptyCard}>
                <Text style={styles.emptyTitle}>Belum ada kabar di kategori ini</Text>
                <Text style={styles.emptyText}>Pilih kategori lain untuk melihat pengumuman Pemancingan Adem Ayem Dlopo.</Text>
              </View>
            )}
          </View>

          <View style={styles.officialNote}>
            <SymbolView
              name={{ ios: 'checkmark.seal.fill', android: 'verified', web: 'verified' }}
              tintColor={Palette.gold}
              size={23}
            />
            <View style={styles.officialCopy}>
              <Text style={styles.officialTitle}>Sumber informasi resmi</Text>
              <Text style={styles.officialText}>Perubahan jadwal dan pembukaan tiket hanya dianggap resmi jika tampil di aplikasi ini.</Text>
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Palette.paper, alignItems: 'center' },
  safeArea: { flex: 1, width: '100%', maxWidth: MaxContentWidth },
  header: { backgroundColor: Palette.ink, paddingHorizontal: 18, paddingTop: 12, paddingBottom: 31 },
  headerTop: { flexDirection: 'row', alignItems: 'center' },
  backButton: { width: 43, height: 43, borderRadius: 14, backgroundColor: Palette.inkSoft, alignItems: 'center', justifyContent: 'center' },
  backText: { color: Palette.white, fontFamily: Fonts?.sans, fontSize: 31, lineHeight: 32, marginTop: -3 },
  headerCopy: { flex: 1, paddingHorizontal: 12 },
  eyebrow: { color: Palette.gold, fontFamily: Fonts?.rounded, fontSize: 9, fontWeight: '900', letterSpacing: 1.4 },
  title: { color: Palette.white, fontFamily: Fonts?.display, fontSize: 27, fontWeight: '900', letterSpacing: -0.6, marginTop: 2 },
  newsIcon: { width: 43, height: 43, borderRadius: 14, backgroundColor: Palette.inkSoft, alignItems: 'center', justifyContent: 'center', transform: [{ rotate: '3deg' }] },
  subtitle: { color: '#B9CFCC', fontFamily: Fonts?.sans, fontSize: 10, lineHeight: 15, marginTop: 12, paddingLeft: 55, maxWidth: 390 },
  content: { paddingBottom: 38 },
  featuredCard: { height: 350, marginHorizontal: 16, marginTop: -15, borderRadius: Radius.large, overflow: 'hidden', backgroundColor: Palette.inkSoft, shadowColor: Palette.ink, shadowOffset: { width: 0, height: 12 }, shadowOpacity: 0.22, shadowRadius: 23, elevation: 7 },
  featuredImage: { width: '100%', height: '100%' },
  featuredShade: { position: 'absolute', inset: 0, backgroundColor: 'rgba(3,29,31,0.42)' },
  featuredBadge: { position: 'absolute', top: 15, left: 15, flexDirection: 'row', alignItems: 'center', gap: 7, backgroundColor: Palette.gold, borderRadius: Radius.pill, paddingHorizontal: 11, paddingVertical: 7 },
  badgeDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: Palette.orange },
  featuredBadgeText: { color: Palette.ink, fontFamily: Fonts?.rounded, fontSize: 8, fontWeight: '900', letterSpacing: 0.8 },
  featuredCopy: { position: 'absolute', left: 18, right: 18, bottom: 18 },
  featuredMeta: { color: Palette.gold, fontFamily: Fonts?.rounded, fontSize: 8, fontWeight: '900', letterSpacing: 0.9 },
  featuredTitle: { color: Palette.white, fontFamily: Fonts?.display, fontSize: 29, lineHeight: 31, fontWeight: '900', marginTop: 6 },
  featuredSummary: { color: '#E0ECE9', fontFamily: Fonts?.sans, fontSize: 10, lineHeight: 15, marginTop: 7, maxWidth: 340 },
  readRow: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 14, backgroundColor: Palette.orange, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 9 },
  readText: { color: Palette.white, fontFamily: Fonts?.rounded, fontSize: 9, fontWeight: '900' },
  readArrow: { color: Palette.white, fontSize: 15 },
  sectionHeading: { paddingHorizontal: 18, marginTop: 30, flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' },
  sectionEyebrow: { color: Palette.orange, fontFamily: Fonts?.rounded, fontSize: 8, fontWeight: '900', letterSpacing: 1.3 },
  sectionTitle: { color: Palette.ink, fontFamily: Fonts?.display, fontSize: 24, fontWeight: '900', marginTop: 2 },
  articleCount: { color: Palette.muted, fontFamily: Fonts?.rounded, fontSize: 8, fontWeight: '900', letterSpacing: 0.8 },
  filterRow: { paddingHorizontal: 18, paddingTop: 14, paddingBottom: 15, gap: 8 },
  filterChip: { height: 36, paddingHorizontal: 15, borderRadius: Radius.pill, borderWidth: 1, borderColor: '#D8D9CF', backgroundColor: Palette.surface, alignItems: 'center', justifyContent: 'center' },
  filterChipActive: { backgroundColor: Palette.ink, borderColor: Palette.ink },
  filterText: { color: Palette.ink, fontFamily: Fonts?.rounded, fontSize: 10, fontWeight: '800' },
  filterTextActive: { color: Palette.white },
  newsList: { paddingHorizontal: 16, gap: 11 },
  newsCard: { minHeight: 144, borderRadius: Radius.medium, backgroundColor: Palette.surface, borderWidth: 1, borderColor: '#E5DED1', padding: 9, flexDirection: 'row' },
  newsImage: { width: 118, minHeight: 126, borderRadius: 14, backgroundColor: Palette.inkSoft },
  newsBody: { flex: 1, paddingLeft: 11, paddingVertical: 3 },
  newsTopLine: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  newsCategory: { color: Palette.orange, fontFamily: Fonts?.rounded, fontSize: 8, fontWeight: '900', letterSpacing: 0.8 },
  newsReadTime: { color: Palette.muted, fontFamily: Fonts?.sans, fontSize: 8 },
  newsTitle: { color: Palette.ink, fontFamily: Fonts?.rounded, fontSize: 13, lineHeight: 17, fontWeight: '900', marginTop: 6 },
  newsSummary: { color: Palette.muted, fontFamily: Fonts?.sans, fontSize: 9, lineHeight: 13, marginTop: 4 },
  newsFooter: { marginTop: 'auto', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  newsDate: { color: Palette.inkSoft, fontFamily: Fonts?.rounded, fontSize: 7, fontWeight: '800' },
  openButton: { width: 27, height: 27, borderRadius: 9, backgroundColor: Palette.mint, alignItems: 'center', justifyContent: 'center' },
  openArrow: { color: Palette.ink, fontSize: 13, fontWeight: '900' },
  emptyCard: { borderRadius: Radius.medium, backgroundColor: Palette.surface, borderWidth: 1, borderColor: Palette.line, padding: 24, alignItems: 'center' },
  emptyTitle: { color: Palette.ink, fontFamily: Fonts?.rounded, fontSize: 13, fontWeight: '900' },
  emptyText: { color: Palette.muted, fontFamily: Fonts?.sans, fontSize: 9, lineHeight: 14, textAlign: 'center', marginTop: 5 },
  officialNote: { marginHorizontal: 16, marginTop: 18, borderRadius: Radius.medium, backgroundColor: Palette.ink, padding: 15, flexDirection: 'row', alignItems: 'center', gap: 12 },
  officialCopy: { flex: 1 },
  officialTitle: { color: Palette.white, fontFamily: Fonts?.rounded, fontSize: 11, fontWeight: '900' },
  officialText: { color: '#B9CFCC', fontFamily: Fonts?.sans, fontSize: 9, lineHeight: 13, marginTop: 3 },
  pressed: { opacity: 0.82, transform: [{ scale: 0.985 }] },
});
