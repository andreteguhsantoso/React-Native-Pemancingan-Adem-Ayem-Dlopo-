import { SymbolView } from 'expo-symbols';
import { Href, useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BottomTabInset, Fonts, MaxContentWidth, Palette, Radius } from '@/constants/theme';
import { MediaImage } from '@/components/media-image';
import { leaderboardEntries, LeaderboardPeriod } from '@/data/community';
import { useFocusResource } from '@/hooks/use-focus-resource';
import { matchesLeaderboardPeriod } from '@/lib/domain';
import { isSupabaseConfigured } from '@/lib/supabase';
import { fetchLeaderboard } from '@/services/community-service';
import { useAuth } from '@/context/auth-context';

const periods: LeaderboardPeriod[] = ['Hari Ini', 'Per Event', 'Bulanan'];

export default function LeaderboardScreen() {
  const router = useRouter();
  const { profile } = useAuth();
  const isStaff = profile?.role === 'admin' || profile?.role === 'operator';
  const [activePeriod, setActivePeriod] = useState<LeaderboardPeriod>('Per Event');
  const [failedPhoto, setFailedPhoto] = useState<string | null>(null);
  const [selectedEvent, setSelectedEvent] = useState('all');
  const { data: remoteEntries, refreshing, error: loadError, refresh, updatedAt } = useFocusResource(fetchLeaderboard, [], isSupabaseConfigured);
  const allEntries = isSupabaseConfigured ? remoteEntries : leaderboardEntries;
  const eventOptions = Array.from(new Map(allEntries.filter((item) => item.eventId).map((item) => [item.eventId!, item.event])).entries());
  const rankings = allEntries.filter((entry) => entry.dateKey
    ? matchesLeaderboardPeriod(entry.dateKey, activePeriod, entry.eventId ?? null, selectedEvent)
    : entry.periods.includes(activePeriod));
  const champion = rankings[0];
  const photoIdentity = champion ? JSON.stringify(champion.image) : null;
  const missingPhoto = champion && (failedPhoto === photoIdentity || (typeof champion.image === 'object' && !('uri' in champion.image && champion.image.uri)));


  return (
    <View style={styles.screen}>
      <SafeAreaView edges={['top']} style={styles.safeArea}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={Palette.orange} colors={[Palette.orange]} />}
          contentContainerStyle={styles.content}>
          <View style={styles.header}>
            <View style={styles.headerPatternOne} />
            <View style={styles.headerPatternTwo} />
            <View style={styles.headerTop}>
              <View>
                <Text style={styles.eyebrow}>REKOR TANGKAPAN NILA</Text>
                <Text style={styles.title}>Papan juara.</Text>
              </View>
              <View style={styles.trophyButton}>
                <SymbolView
                  name={{ ios: 'trophy.fill', android: 'emoji_events', web: 'emoji_events' }}
                  tintColor={Palette.ink}
                  size={27}
                />
              </View>
            </View>
            <Text style={styles.headerSubtitle}>Peringkat berdasarkan satu ekor ikan nila paling berat yang telah diverifikasi operator.</Text>

            <View style={styles.periodRow}>
              {periods.map((period) => {
                const active = period === activePeriod;
                return (
                  <Pressable
                    key={period}
                    onPress={() => setActivePeriod(period)}
                    style={[styles.periodChip, active && styles.periodChipActive]}>
                    <Text style={[styles.periodText, active && styles.periodTextActive]}>{period}</Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          {activePeriod === 'Per Event' ? <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ padding: 16, gap: 8 }}>
            {[['all', 'Semua event'], ...eventOptions].map(([id, title]) => <Pressable key={id} onPress={() => setSelectedEvent(id)} style={[styles.periodChip, { paddingHorizontal: 16, minHeight: 44 }, selectedEvent === id && styles.periodChipActive]}><Text style={[styles.periodText, selectedEvent === id && styles.periodTextActive]}>{title}</Text></Pressable>)}
          </ScrollView> : null}
          {!isSupabaseConfigured ? <Text style={styles.dataNote}>Mode contoh. Hubungkan Supabase untuk peringkat asli.</Text> : updatedAt ? <Text style={styles.dataNote}>Diperbarui {new Date(updatedAt).toLocaleTimeString('id-ID')} · Tarik untuk menyegarkan</Text> : null}
          {loadError ? <View style={styles.syncNotice}><Text style={styles.syncNoticeTitle}>Peringkat belum tersinkron</Text><Text style={styles.syncNoticeText}>{loadError}</Text></View> : null}
          {!refreshing && rankings.length === 0 ? <View style={styles.emptyCard}><Text style={styles.emptyTitle}>Belum ada peringkat aktif</Text><Text style={styles.emptyText}>Data hasil penimbangan yang diaktifkan admin akan tampil di sini.</Text></View> : null}

          {champion ? (
            <View style={styles.championCard}>
              <MediaImage source={champion.image} contentFit="cover" transition={300} style={styles.championImage} fallbackLabel="Foto tangkapan belum dapat dimuat" onError={() => setFailedPhoto(photoIdentity)} />
              <View style={styles.championShade} />
              <View style={styles.crownBadge}>
                <Text style={styles.crownBadgeText}>#1 REKOR TERBERAT</Text>
              </View>
              <View style={styles.championCopy}>
                <Text style={styles.championWeight}>{champion.biggestKg.toFixed(2)} KG</Text>
                <Text style={styles.championName}>{champion.name}</Text>
                <Text style={styles.championMeta}>{champion.event} · {champion.caughtAt}</Text>
              </View>
            </View>
          ) : null}
          {missingPhoto ? <View style={styles.syncNotice}><Text style={styles.syncNoticeTitle}>Foto tangkapan belum tersedia</Text><Text style={styles.syncNoticeText}>Data penimbangan tetap tersimpan. Pengelola perlu memilih ulang foto asli jika file unggahan sebelumnya rusak.</Text>{isStaff ? <Pressable onPress={() => router.push('/admin-community' as Href)} style={{ minHeight: 44, justifyContent: 'center' }}><Text style={{ color: Palette.orangeDark, fontSize: 14, fontWeight: '800' }}>Buka pengelolaan foto</Text></Pressable> : null}</View> : null}

          <View style={styles.summaryRow}>
            <View style={[styles.summaryCard, styles.summaryGold]}>
              <Text style={styles.summaryValue}>{rankings.length}</Text>
              <Text style={styles.summaryLabel}>PEMANCING MASUK PERINGKAT</Text>
            </View>
            <View style={[styles.summaryCard, styles.summaryMint]}>
              <Text style={styles.summaryValue}>{rankings.reduce((total, item) => total + item.fishCount, 0)}</Text>
              <Text style={styles.summaryLabel}>TOTAL IKAN TERCATAT</Text>
            </View>
          </View>

          <View style={styles.sectionHeading}>
            <View>
              <Text style={styles.sectionEyebrow}>KLASEMEN {activePeriod.toUpperCase()}</Text>
              <Text style={styles.sectionTitle}>Rekor nila terbesar</Text>
            </View>
            <View style={styles.verifiedBadge}>
              <SymbolView
                name={{ ios: 'checkmark.seal.fill', android: 'verified', web: 'verified' }}
                tintColor={Palette.success}
                size={16}
              />
              <Text style={styles.verifiedText}>VALID</Text>
            </View>
          </View>

          <View style={styles.rankingList}>
            {rankings.map((entry, index) => (
              <View key={entry.id} style={[styles.rankingCard, index === 0 && styles.rankingCardTop]}>
                <View style={[styles.rankNumber, index === 0 && styles.rankNumberTop]}>
                  <Text style={[styles.rankNumberText, index === 0 && styles.rankNumberTextTop]}>{index + 1}</Text>
                </View>
                <MediaImage source={entry.image} contentFit="cover" style={styles.avatar} accessibilityLabel={`Foto tangkapan ${entry.name}`} />
                <View style={styles.rankingCopy}>
                  <Text style={styles.rankingName}>{entry.name}</Text>
                  <Text numberOfLines={1} style={styles.rankingEvent}>{entry.event}</Text>
                  <View style={styles.catchMetaRow}>
                    <Text style={styles.catchMeta}>{entry.fishCount} ekor</Text>
                    <View style={styles.metaDot} />
                    <Text style={styles.catchMeta}>{entry.totalKg.toFixed(1)} kg total</Text>
                  </View>
                </View>
                <View style={styles.weightBlock}>
                  <Text style={styles.weightValue}>{entry.biggestKg.toFixed(2)}</Text>
                  <Text style={styles.weightUnit}>KG</Text>
                </View>
              </View>
            ))}
          </View>

          <View style={styles.verificationNote}>
            <View style={styles.scaleIcon}>
              <SymbolView
                name={{ ios: 'scalemass.fill', android: 'scale', web: 'scale' }}
                tintColor={Palette.white}
                size={22}
              />
            </View>
            <View style={styles.verificationCopy}>
              <Text style={styles.verificationTitle}>Penimbangan transparan</Text>
              <Text style={styles.verificationText}>Berat dicatat setelah ditimbang di area operator. Foto tangkapan menjadi bukti verifikasi.</Text>
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  dataNote: { color: Palette.muted, fontSize: 12, paddingHorizontal: 18, paddingVertical: 16 },
  screen: { flex: 1, backgroundColor: Palette.paper, alignItems: 'center' },
  safeArea: { flex: 1, width: '100%', maxWidth: MaxContentWidth },
  content: { paddingBottom: BottomTabInset + 28 },
  syncNotice: { marginHorizontal: 16, marginTop: 14, borderRadius: 14, backgroundColor: '#FFF0EB', borderWidth: 1, borderColor: '#F3B9A8', padding: 12 },
  syncNoticeTitle: { color: Palette.orangeDark, fontFamily: Fonts?.rounded, fontSize: 15, fontWeight: '900' },
  syncNoticeText: { color: Palette.inkSoft, fontFamily: Fonts?.sans, fontSize: 13, lineHeight: 20, marginTop: 4 },
  emptyCard: { marginHorizontal: 16, marginTop: 18, borderRadius: Radius.large, backgroundColor: Palette.surface, padding: 22, alignItems: 'center', borderWidth: 1, borderColor: '#E5DED1' },
  emptyTitle: { color: Palette.ink, fontFamily: Fonts?.display, fontSize: 21, fontWeight: '900' },
  emptyText: { color: Palette.muted, fontFamily: Fonts?.sans, fontSize: 14, lineHeight: 21, textAlign: 'center', marginTop: 6 },
  header: { backgroundColor: Palette.ink, paddingHorizontal: 20, paddingTop: 16, paddingBottom: 36, overflow: 'hidden' },
  headerPatternOne: { position: 'absolute', width: 170, height: 170, borderRadius: 85, borderWidth: 34, borderColor: 'rgba(203,230,216,0.08)', right: -60, top: -65 },
  headerPatternTwo: { position: 'absolute', width: 90, height: 90, borderRadius: 45, borderWidth: 20, borderColor: 'rgba(242,193,78,0.08)', right: 45, top: 70 },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  eyebrow: { color: Palette.gold, fontFamily: Fonts?.rounded, fontSize: 10, fontWeight: '900', letterSpacing: 1.5 },
  title: { color: Palette.white, fontFamily: Fonts?.display, fontSize: 31, fontWeight: '900', letterSpacing: -0.8, marginTop: 4 },
  trophyButton: { width: 50, height: 50, borderRadius: 17, backgroundColor: Palette.gold, alignItems: 'center', justifyContent: 'center', transform: [{ rotate: '4deg' }] },
  headerSubtitle: { color: '#B9CFCC', fontFamily: Fonts?.sans, fontSize: 14, lineHeight: 21, marginTop: 7, maxWidth: 400 },
  periodRow: { flexDirection: 'row', gap: 8, marginTop: 20 },
  periodChip: { flex: 1, minHeight: 44, borderRadius: Radius.pill, backgroundColor: Palette.inkSoft, borderWidth: 1, borderColor: '#2D5C5E', alignItems: 'center', justifyContent: 'center' },
  periodChipActive: { backgroundColor: Palette.surface, borderColor: Palette.surface },
  periodText: { color: '#B9CFCC', fontFamily: Fonts?.rounded, fontSize: 12, fontWeight: '800' },
  periodTextActive: { color: Palette.ink, fontWeight: '900' },
  championCard: { height: 300, marginHorizontal: 16, borderRadius: Radius.large, overflow: 'hidden', backgroundColor: Palette.inkSoft, shadowColor: Palette.ink, shadowOffset: { width: 0, height: 12 }, shadowOpacity: 0.22, shadowRadius: 24, elevation: 7 },
  championImage: { width: '100%', height: '100%' },
  championShade: { position: 'absolute', inset: 0, backgroundColor: 'rgba(4,34,36,0.28)' },
  crownBadge: { position: 'absolute', top: 16, left: 16, backgroundColor: Palette.gold, paddingHorizontal: 12, paddingVertical: 7, borderRadius: Radius.pill },
  crownBadgeText: { color: Palette.ink, fontFamily: Fonts?.rounded, fontSize: 9, fontWeight: '900', letterSpacing: 0.8 },
  championCopy: { position: 'absolute', left: 18, right: 18, bottom: 18 },
  championWeight: { color: Palette.gold, fontFamily: Fonts?.display, fontSize: 42, lineHeight: 46, fontWeight: '900', letterSpacing: -1.2 },
  championName: { color: Palette.white, fontFamily: Fonts?.display, fontSize: 22, fontWeight: '900' },
  championMeta: { color: '#DCECE7', fontFamily: Fonts?.sans, fontSize: 13, marginTop: 4 },
  summaryRow: { flexDirection: 'row', paddingHorizontal: 16, gap: 10, marginTop: 14 },
  summaryCard: { flex: 1, minHeight: 91, borderRadius: Radius.medium, padding: 14, justifyContent: 'space-between' },
  summaryGold: { backgroundColor: Palette.gold },
  summaryMint: { backgroundColor: Palette.mint },
  summaryValue: { color: Palette.ink, fontFamily: Fonts?.display, fontSize: 28, fontWeight: '900' },
  summaryLabel: { color: Palette.inkSoft, fontFamily: Fonts?.rounded, fontSize: 11, lineHeight: 16, fontWeight: '900', letterSpacing: 0.7 },
  sectionHeading: { paddingHorizontal: 18, marginTop: 27, marginBottom: 12, flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' },
  sectionEyebrow: { color: Palette.orange, fontFamily: Fonts?.rounded, fontSize: 9, fontWeight: '900', letterSpacing: 1.2 },
  sectionTitle: { color: Palette.ink, fontFamily: Fonts?.display, fontSize: 24, fontWeight: '900', marginTop: 2 },
  verifiedBadge: { flexDirection: 'row', gap: 5, alignItems: 'center', backgroundColor: '#E4F1E9', borderRadius: Radius.pill, paddingHorizontal: 9, paddingVertical: 6 },
  verifiedText: { color: Palette.success, fontFamily: Fonts?.rounded, fontSize: 8, fontWeight: '900', letterSpacing: 0.8 },
  rankingList: { paddingHorizontal: 16, gap: 9 },
  rankingCard: { minHeight: 82, borderRadius: 19, backgroundColor: Palette.surface, borderWidth: 1, borderColor: '#E7E1D5', padding: 10, flexDirection: 'row', alignItems: 'center' },
  rankingCardTop: { borderColor: '#E5B630', backgroundColor: '#FFF9E8' },
  rankNumber: { width: 27, height: 27, borderRadius: 10, backgroundColor: '#E9EDE7', alignItems: 'center', justifyContent: 'center', marginRight: 8 },
  rankNumberTop: { backgroundColor: Palette.gold },
  rankNumberText: { color: Palette.ink, fontFamily: Fonts?.rounded, fontSize: 11, fontWeight: '900' },
  rankNumberTextTop: { color: Palette.ink },
  avatar: { width: 56, height: 62, borderRadius: 14, backgroundColor: Palette.inkSoft },
  rankingCopy: { flex: 1, paddingHorizontal: 10 },
  rankingName: { color: Palette.ink, fontFamily: Fonts?.rounded, fontSize: 16, fontWeight: '900' },
  rankingEvent: { color: Palette.muted, fontFamily: Fonts?.sans, fontSize: 12, marginTop: 2 },
  catchMetaRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 5, marginTop: 7 },
  catchMeta: { color: Palette.inkSoft, fontFamily: Fonts?.rounded, fontSize: 11, fontWeight: '800' },
  metaDot: { width: 3, height: 3, borderRadius: 2, backgroundColor: Palette.orange },
  weightBlock: { minWidth: 51, alignItems: 'flex-end' },
  weightValue: { color: Palette.orange, fontFamily: Fonts?.display, fontSize: 22, fontWeight: '900' },
  weightUnit: { color: Palette.muted, fontFamily: Fonts?.rounded, fontSize: 8, fontWeight: '900', letterSpacing: 1 },
  verificationNote: { marginHorizontal: 16, marginTop: 18, padding: 15, borderRadius: Radius.medium, backgroundColor: Palette.ink, flexDirection: 'row', alignItems: 'center', gap: 12 },
  scaleIcon: { width: 43, height: 43, borderRadius: 14, backgroundColor: Palette.orange, alignItems: 'center', justifyContent: 'center' },
  verificationCopy: { flex: 1 },
  verificationTitle: { color: Palette.white, fontFamily: Fonts?.rounded, fontSize: 12, fontWeight: '900' },
  verificationText: { color: '#B9CFCC', fontFamily: Fonts?.sans, fontSize: 13, lineHeight: 20, marginTop: 3 },
});
