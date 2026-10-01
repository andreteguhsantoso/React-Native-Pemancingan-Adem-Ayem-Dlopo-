import { MediaImage as Image } from '@/components/media-image';
import { useRouter } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BottomTabInset, Fonts, MaxContentWidth, Palette, Radius } from '@/constants/theme';
import { useEvents } from '@/context/events-context';
import { formatRupiah } from '@/data/events';

const filters = ['Semua', 'Event Utama', 'Malam', 'Harian'];

export default function AgendaScreen() {
  const router = useRouter();
  const { events, loading, error, refreshEvents } = useEvents();
  const [activeFilter, setActiveFilter] = useState('Semua');
  const visibleEvents = events.filter((item) => {
    const text = `${item.title} ${item.label}`.toLowerCase();
    if (activeFilter === 'Event Utama') return item.featured || /utama|grand|spektakuler/.test(text);
    if (activeFilter === 'Malam') return /malam|night/.test(text);
    if (activeFilter === 'Harian') return /harian|fun|pesta|bareng/.test(text);
    return true;
  });

  return (
    <View style={styles.screen}>
      <SafeAreaView edges={['top']} style={styles.safeArea}>
        <View style={styles.header}>
          <View>
            <Text style={styles.eyebrow}>JADWAL PEMANCINGAN</Text>
            <Text style={styles.title}>Pilih waktu terbaikmu.</Text>
          </View>
          <View style={styles.calendarButton}>
            <SymbolView
              name={{ ios: 'calendar', android: 'calendar_month', web: 'calendar_month' }}
              tintColor={Palette.ink}
              size={23}
            />
          </View>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterRow}>
          {filters.map((filter) => {
            const selected = filter === activeFilter;
            return (
              <Pressable
                key={filter}
                onPress={() => setActiveFilter(filter)}
                style={[styles.filterChip, selected && styles.filterChipActive]}>
                <Text style={[styles.filterText, selected && styles.filterTextActive]}>{filter}</Text>
              </Pressable>
            );
          })}
        </ScrollView>

        <ScrollView
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={loading} onRefresh={() => { void refreshEvents().catch(() => undefined); }} tintColor={Palette.orange} />}
          contentContainerStyle={styles.content}>
          <View style={styles.notice}>
            <View style={styles.noticeMark} />
            <View style={styles.noticeCopy}>
              <Text style={styles.noticeTitle}>Semua event khusus ikan nila</Text>
              <Text style={styles.noticeText}>1 tiket berlaku untuk 1 lapak. Kapasitas mengikuti pengaturan setiap event.</Text>
            </View>
          </View>

          {error ? <Text style={{ color: Palette.orangeDark, fontSize: 14, padding: 16 }}>{error}. Tarik halaman untuk mencoba kembali.</Text> : null}
          {!loading && !visibleEvents.length ? <Text style={{ fontSize: 16, color: Palette.ink, padding: 20 }}>Belum ada event untuk kategori ini.</Text> : null}
          {visibleEvents.map((event) => (
            <View key={event.id} style={styles.eventCard}>
              <Image source={event.image} contentFit="cover" style={styles.eventImage} />
              <View style={styles.eventBody}>
                <View style={styles.eventTopLine}>
                  <Text style={styles.eventLabel}>{event.label}</Text>
                  <Text style={styles.dateBadge}>{event.shortDate}</Text>
                </View>
                <Text style={styles.eventTitle}>{event.title}</Text>
                <Text style={styles.eventMeta}>{event.date}</Text>
                <Text style={styles.eventMeta}>{event.time}</Text>

                <View style={styles.statsRow}>
                  <View style={styles.statPill}>
                    <Text style={styles.statValue}>{event.fishKg} KG</Text>
                    <Text style={styles.statLabel}>nila dilepas</Text>
                  </View>
                  <View style={styles.statPill}>
                    <Text style={styles.statValue}>{event.availableSpots}</Text>
                    <Text style={styles.statLabel}>lapak tersisa</Text>
                  </View>
                </View>

                <View style={styles.cardFooter}>
                  <View>
                    <Text style={styles.priceLabel}>TIKET / LAPAK</Text>
                    <Text style={styles.price}>{formatRupiah(event.price)}</Text>
                  </View>
                  <Pressable
                    onPress={() => router.push({ pathname: '/event/[id]', params: { id: event.id } })}
                    style={({ pressed }) => [styles.bookButton, pressed && styles.pressed]}>
                    <Text style={styles.bookButtonText}>Lihat detail</Text>
                    <Text style={styles.bookArrow}>→</Text>
                  </Pressable>
                </View>
              </View>
            </View>
          ))}
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Palette.paper, alignItems: 'center' },
  safeArea: { flex: 1, width: '100%', maxWidth: MaxContentWidth },
  header: {
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  eyebrow: {
    color: Palette.orange,
    fontFamily: Fonts?.rounded,
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1.6,
  },
  title: {
    color: Palette.ink,
    fontFamily: Fonts?.display,
    fontSize: 28,
    fontWeight: '900',
    letterSpacing: -0.6,
    marginTop: 3,
  },
  calendarButton: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: Palette.mint,
    alignItems: 'center',
    justifyContent: 'center',
    transform: [{ rotate: '3deg' }],
  },
  filterRow: { paddingHorizontal: 20, paddingBottom: 16, gap: 9 },
  filterChip: {
    height: 38,
    paddingHorizontal: 17,
    borderRadius: Radius.pill,
    backgroundColor: Palette.surface,
    borderWidth: 1,
    borderColor: Palette.line,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterChipActive: { backgroundColor: Palette.ink, borderColor: Palette.ink },
  filterText: { color: Palette.ink, fontFamily: Fonts?.rounded, fontSize: 12, fontWeight: '700' },
  filterTextActive: { color: Palette.white },
  content: { paddingHorizontal: 16, paddingBottom: BottomTabInset + 26, gap: 14 },
  notice: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Palette.gold,
    paddingVertical: 13,
    paddingHorizontal: 15,
    borderRadius: Radius.medium,
    overflow: 'hidden',
  },
  noticeMark: { width: 8, height: 44, borderRadius: 8, backgroundColor: Palette.orange, marginRight: 12 },
  noticeCopy: { flex: 1 },
  noticeTitle: { color: Palette.ink, fontFamily: Fonts?.rounded, fontWeight: '900', fontSize: 13 },
  noticeText: { color: Palette.inkSoft, fontFamily: Fonts?.sans, fontSize: 11, marginTop: 3 },
  eventCard: {
    backgroundColor: Palette.surface,
    borderRadius: Radius.large,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#EAE4D7',
    shadowColor: Palette.ink,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.09,
    shadowRadius: 20,
    elevation: 4,
  },
  eventImage: { width: '100%', height: 158, backgroundColor: Palette.inkSoft },
  eventBody: { padding: 17 },
  eventTopLine: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  eventLabel: {
    color: Palette.orange,
    fontFamily: Fonts?.rounded,
    fontWeight: '900',
    fontSize: 10,
    letterSpacing: 1.2,
  },
  dateBadge: {
    color: Palette.ink,
    backgroundColor: Palette.mint,
    borderRadius: 8,
    overflow: 'hidden',
    paddingHorizontal: 9,
    paddingVertical: 5,
    fontFamily: Fonts?.rounded,
    fontWeight: '900',
    fontSize: 10,
  },
  eventTitle: {
    color: Palette.ink,
    fontFamily: Fonts?.display,
    fontSize: 24,
    fontWeight: '900',
    marginTop: 7,
    marginBottom: 5,
  },
  eventMeta: { color: Palette.muted, fontFamily: Fonts?.sans, fontSize: 11, lineHeight: 17 },
  statsRow: { flexDirection: 'row', gap: 8, marginTop: 13 },
  statPill: { flex: 1, backgroundColor: '#EEF3EC', borderRadius: 13, paddingHorizontal: 12, paddingVertical: 9 },
  statValue: { color: Palette.ink, fontFamily: Fonts?.rounded, fontSize: 13, fontWeight: '900' },
  statLabel: { color: Palette.muted, fontFamily: Fonts?.sans, fontSize: 9, marginTop: 1 },
  cardFooter: {
    borderTopWidth: 1,
    borderTopColor: Palette.line,
    marginTop: 15,
    paddingTop: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  priceLabel: { color: Palette.muted, fontFamily: Fonts?.rounded, fontWeight: '800', fontSize: 8, letterSpacing: 1 },
  price: { color: Palette.orange, fontFamily: Fonts?.display, fontWeight: '900', fontSize: 21, marginTop: 1 },
  bookButton: {
    height: 43,
    paddingHorizontal: 16,
    borderRadius: 14,
    backgroundColor: Palette.orange,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
  },
  bookButtonText: { color: Palette.white, fontFamily: Fonts?.rounded, fontSize: 12, fontWeight: '900' },
  bookArrow: { color: Palette.white, fontSize: 18, marginTop: -2 },
  pressed: { opacity: 0.78, transform: [{ scale: 0.98 }] },
});
