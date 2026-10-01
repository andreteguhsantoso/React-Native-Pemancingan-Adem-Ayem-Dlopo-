import { MediaImage as Image } from '@/components/media-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { Alert, Pressable, ScrollView, Share, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Fonts, MaxContentWidth, Palette, Radius } from '@/constants/theme';
import { useEvents } from '@/context/events-context';
import { useVenue } from '@/context/venue-context';
import { formatRupiah } from '@/data/events';

function InfoItem({ value, label }: { value: string; label: string }) {
  return (
    <View style={styles.infoItem}>
      <Text style={styles.infoValue}>{value}</Text>
      <Text style={styles.infoLabel}>{label}</Text>
    </View>
  );
}

export default function EventDetailScreen() {
  const router = useRouter();
  const { events } = useEvents();
  const { venue } = useVenue();
  const { id } = useLocalSearchParams<{ id: string }>();
  const event = events.find((item) => item.id === id);

  if (!event) {
    return (
      <SafeAreaView style={styles.notFound}>
        <Text style={styles.notFoundTitle}>Event tidak ditemukan</Text>
        <Pressable onPress={() => router.replace('/agenda')} style={styles.backToAgenda}>
          <Text style={styles.backToAgendaText}>Kembali ke agenda</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  const occupiedSpots = event.totalSpots - event.availableSpots;
  const occupiedPercent = (occupiedSpots / event.totalSpots) * 100;

  return (
    <View style={styles.screen}>
      <View style={styles.page}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
          <View style={styles.hero}>
            <Image source={event.image} contentFit="cover" style={StyleSheet.absoluteFill} />
            <View style={styles.heroShade} />
            <SafeAreaView edges={['top']} style={styles.heroSafeArea}>
              <View style={styles.heroNav}>
                <Pressable onPress={() => router.back()} style={styles.circleButton}>
                  <SymbolView
                    name={{ ios: 'chevron.left', android: 'arrow_back', web: 'arrow_back' }}
                    tintColor={Palette.ink}
                    size={22}
                  />
                </Pressable>
                <Pressable accessibilityLabel="Bagikan informasi event" onPress={() => Share.share({ message: `${event.title}\n${event.date}\n${event.time}\n${event.fishKg} kg ikan nila - Tiket ${formatRupiah(event.price)}\nPemancingan Adem Ayem Dlopo\n${venue.map_url}` }).catch(() => Alert.alert('Belum dapat dibagikan', 'Silakan coba kembali.'))} style={styles.circleButton}>
                  <SymbolView
                    name={{ ios: 'square.and.arrow.up', android: 'share', web: 'share' }}
                    tintColor={Palette.ink}
                    size={20}
                  />
                </Pressable>
              </View>

              <View style={styles.heroCopy}>
                <View style={styles.eventLabel}>
                  <Text style={styles.eventLabelText}>{event.label}</Text>
                </View>
                <Text style={styles.heroTitle}>{event.title}</Text>
                <Text numberOfLines={3} style={styles.heroSubtitle}>{event.description || 'Keseruan mancing nila untuk komunitas dan keluarga.'}</Text>
              </View>
            </SafeAreaView>
          </View>

          <View style={styles.pricePanel}>
            <View>
              <Text style={styles.priceLabel}>HARGA TIKET / LAPAK</Text>
              <Text style={styles.price}>{formatRupiah(event.price)}</Text>
            </View>
            <View style={styles.ticketNote}>
              <Text style={styles.ticketNoteValue}>1</Text>
              <Text style={styles.ticketNoteText}>tiket{`\n`}1 lapak</Text>
            </View>
          </View>

          <View style={styles.body}>
            {event.description ? <View style={{ padding: 18, borderRadius: 18, backgroundColor: Palette.surface, marginBottom: 16 }}><Text style={{ fontSize: 17, fontWeight: '800', color: Palette.ink, marginBottom: 8 }}>Tentang event</Text><Text style={{ fontSize: 15, lineHeight: 23, color: Palette.inkSoft }}>{event.description}</Text></View> : null}
            <View style={styles.scheduleCard}>
              <View style={styles.dateBlock}>
                <Text style={styles.dateDay}>{event.shortDate.split(' ')[0]}</Text>
                <Text style={styles.dateMonth}>{event.shortDate.split(' ')[1]}</Text>
              </View>
              <View style={styles.scheduleCopy}>
                <Text style={styles.scheduleTitle}>{event.date}</Text>
                <Text style={styles.scheduleTime}>{event.time}</Text>
              </View>
              <View style={styles.calendarIcon}>
                <SymbolView
                  name={{ ios: 'calendar', android: 'calendar_month', web: 'calendar_month' }}
                  tintColor={Palette.ink}
                  size={20}
                />
              </View>
            </View>

            <View style={styles.sectionHeader}>
              <View>
                <Text style={styles.sectionKicker}>DETAIL EVENT</Text>
                <Text style={styles.sectionTitle}>Yang perlu kamu tahu</Text>
              </View>
              <Text style={styles.sectionIndex}>01</Text>
            </View>

            <View style={styles.infoGrid}>
              <InfoItem value={`${event.fishKg} KG`} label="IKAN NILA DILEPAS" />
              <InfoItem value={`${event.totalSpots}`} label="TOTAL LAPAK" />
              <InfoItem value={`${event.availableSpots}`} label="LAPAK TERSEDIA" />
              <InfoItem value="1 ORANG" label="PER LAPAK" />
            </View>

            <View style={styles.capacityCard}>
              <View style={styles.capacityHeader}>
                <View>
                  <Text style={styles.capacityTitle}>Lapak mulai terisi</Text>
                  <Text style={styles.capacityText}>{occupiedSpots} dari {event.totalSpots} lapak sudah dipesan</Text>
                </View>
                <Text style={styles.capacityPercent}>{Math.round(occupiedPercent)}%</Text>
              </View>
              <View style={styles.capacityTrack}>
                <View style={[styles.capacityFill, { width: `${occupiedPercent}%` }]} />
              </View>
            </View>

            <View style={styles.sectionHeader}>
              <View>
                <Text style={styles.sectionKicker}>FASILITAS</Text>
                <Text style={styles.sectionTitle}>Sudah termasuk</Text>
              </View>
              <Text style={styles.sectionIndex}>02</Text>
            </View>

            <View style={styles.facilitiesRow}>
              <View style={styles.facilityCard}>
                <Text style={styles.facilitySymbol}>P</Text>
                <Text style={styles.facilityTitle}>Parkir</Text>
                <Text style={styles.facilityText}>Area kendaraan</Text>
              </View>
              <View style={styles.facilityCard}>
                <Text style={styles.facilitySymbol}>M</Text>
                <Text style={styles.facilityTitle}>Mushola</Text>
                <Text style={styles.facilityText}>Ibadah nyaman</Text>
              </View>
              <View style={styles.facilityCard}>
                <Text style={styles.facilitySymbol}>K</Text>
                <Text style={styles.facilityTitle}>Kantin</Text>
                <Text style={styles.facilityText}>Makan & minum</Text>
              </View>
            </View>

            <View style={styles.ruleCard}>
              <View style={styles.ruleNumber}>
                <Text style={styles.ruleNumberText}>!</Text>
              </View>
              <View style={styles.ruleCopy}>
                <Text style={styles.ruleKicker}>PERATURAN UMPAN</Text>
                <Text style={styles.ruleTitle}>Gunakan umpan dari bahan alami</Text>
                <Text style={styles.ruleText}>{venue.natural_bait_rule}</Text>
              </View>
            </View>
          </View>
        </ScrollView>

        <SafeAreaView edges={['bottom']} style={styles.footerSafeArea}>
          <View style={styles.footer}>
            <View>
              <Text style={styles.footerLabel}>TIKET / LAPAK</Text>
              <Text style={styles.footerPrice}>{formatRupiah(event.price)}</Text>
            </View>
            <Pressable
              onPress={() => router.push({ pathname: '/booking/[eventId]/spots', params: { eventId: event.id } })}
              style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed]}>
              <Text style={styles.primaryButtonText}>Pilih lapak</Text>
              <Text style={styles.primaryButtonArrow}>→</Text>
            </Pressable>
          </View>
        </SafeAreaView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#DDD7C9', alignItems: 'center' },
  page: { flex: 1, width: '100%', maxWidth: MaxContentWidth, backgroundColor: Palette.paper },
  content: { paddingBottom: 124 },
  hero: { height: 390, backgroundColor: Palette.ink, overflow: 'hidden' },
  heroShade: { position: 'absolute', inset: 0, backgroundColor: 'rgba(4,31,33,0.46)' },
  heroSafeArea: { flex: 1, justifyContent: 'space-between' },
  heroNav: { paddingHorizontal: 17, paddingTop: 8, flexDirection: 'row', justifyContent: 'space-between' },
  circleButton: { width: 44, height: 44, borderRadius: 15, backgroundColor: Palette.surface, alignItems: 'center', justifyContent: 'center' },
  heroCopy: { paddingHorizontal: 20, paddingBottom: 38 },
  eventLabel: { alignSelf: 'flex-start', backgroundColor: Palette.gold, borderRadius: 8, paddingHorizontal: 11, paddingVertical: 7 },
  eventLabelText: { color: Palette.ink, fontFamily: Fonts?.rounded, fontSize: 9, fontWeight: '900', letterSpacing: 1.2 },
  heroTitle: { color: Palette.white, fontFamily: Fonts?.display, fontSize: 42, lineHeight: 44, fontWeight: '900', letterSpacing: -1, marginTop: 12 },
  heroSubtitle: { color: '#D9E4E1', fontFamily: Fonts?.sans, fontSize: 11, lineHeight: 17, maxWidth: 310, marginTop: 8 },
  pricePanel: { marginHorizontal: 16, marginTop: -22, minHeight: 91, borderRadius: Radius.large, backgroundColor: Palette.surface, paddingHorizontal: 19, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', shadowColor: Palette.ink, shadowOffset: { width: 0, height: 12 }, shadowOpacity: 0.13, shadowRadius: 22, elevation: 6 },
  priceLabel: { color: Palette.muted, fontFamily: Fonts?.rounded, fontSize: 8, fontWeight: '900', letterSpacing: 1.2 },
  price: { color: Palette.orange, fontFamily: Fonts?.display, fontSize: 27, fontWeight: '900', marginTop: 2 },
  ticketNote: { width: 80, height: 55, borderRadius: 15, backgroundColor: Palette.mint, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7 },
  ticketNoteValue: { color: Palette.ink, fontFamily: Fonts?.display, fontSize: 28, fontWeight: '900' },
  ticketNoteText: { color: Palette.inkSoft, fontFamily: Fonts?.rounded, fontSize: 8, lineHeight: 11, fontWeight: '800' },
  body: { paddingHorizontal: 16 },
  scheduleCard: { minHeight: 84, marginTop: 19, borderRadius: Radius.medium, backgroundColor: Palette.ink, flexDirection: 'row', alignItems: 'center', padding: 13 },
  dateBlock: { width: 56, height: 57, borderRadius: 14, backgroundColor: Palette.orange, alignItems: 'center', justifyContent: 'center' },
  dateDay: { color: Palette.white, fontFamily: Fonts?.display, fontSize: 23, lineHeight: 24, fontWeight: '900' },
  dateMonth: { color: Palette.white, fontFamily: Fonts?.rounded, fontSize: 8, fontWeight: '900', letterSpacing: 1 },
  scheduleCopy: { flex: 1, paddingHorizontal: 12 },
  scheduleTitle: { color: Palette.white, fontFamily: Fonts?.rounded, fontSize: 11, fontWeight: '800' },
  scheduleTime: { color: '#B9CECA', fontFamily: Fonts?.sans, fontSize: 10, marginTop: 4 },
  calendarIcon: { width: 39, height: 39, borderRadius: 12, backgroundColor: Palette.gold, alignItems: 'center', justifyContent: 'center' },
  sectionHeader: { marginTop: 31, marginBottom: 14, flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' },
  sectionKicker: { color: Palette.orange, fontFamily: Fonts?.rounded, fontSize: 8, fontWeight: '900', letterSpacing: 1.4 },
  sectionTitle: { color: Palette.ink, fontFamily: Fonts?.display, fontSize: 25, fontWeight: '900', letterSpacing: -0.4, marginTop: 2 },
  sectionIndex: { color: '#D5DAD2', fontFamily: Fonts?.serif, fontStyle: 'italic', fontSize: 30, fontWeight: '900' },
  infoGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 9 },
  infoItem: { width: '48.8%', minHeight: 76, borderRadius: Radius.medium, backgroundColor: Palette.surface, padding: 14, borderWidth: 1, borderColor: '#E8E3D7' },
  infoValue: { color: Palette.ink, fontFamily: Fonts?.display, fontSize: 21, fontWeight: '900' },
  infoLabel: { color: Palette.muted, fontFamily: Fonts?.rounded, fontSize: 7, fontWeight: '800', letterSpacing: 0.8, marginTop: 4 },
  capacityCard: { marginTop: 11, borderRadius: Radius.medium, backgroundColor: Palette.mint, padding: 15 },
  capacityHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  capacityTitle: { color: Palette.ink, fontFamily: Fonts?.rounded, fontSize: 12, fontWeight: '900' },
  capacityText: { color: Palette.inkSoft, fontFamily: Fonts?.sans, fontSize: 9, marginTop: 3 },
  capacityPercent: { color: Palette.ink, fontFamily: Fonts?.display, fontSize: 24, fontWeight: '900' },
  capacityTrack: { height: 6, borderRadius: 6, backgroundColor: 'rgba(8,47,51,0.14)', overflow: 'hidden', marginTop: 13 },
  capacityFill: { height: '100%', borderRadius: 6, backgroundColor: Palette.orange },
  facilitiesRow: { flexDirection: 'row', gap: 9 },
  facilityCard: { flex: 1, minHeight: 108, borderRadius: Radius.medium, backgroundColor: Palette.surface, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#E8E3D7' },
  facilitySymbol: { color: Palette.orange, fontFamily: Fonts?.serif, fontStyle: 'italic', fontSize: 25, fontWeight: '900' },
  facilityTitle: { color: Palette.ink, fontFamily: Fonts?.rounded, fontSize: 11, fontWeight: '900', marginTop: 5 },
  facilityText: { color: Palette.muted, fontFamily: Fonts?.sans, fontSize: 8, marginTop: 2 },
  ruleCard: { marginTop: 18, borderRadius: Radius.large, backgroundColor: Palette.gold, padding: 17, flexDirection: 'row', overflow: 'hidden' },
  ruleNumber: { width: 43, height: 43, borderRadius: 14, backgroundColor: Palette.orange, alignItems: 'center', justifyContent: 'center', marginRight: 13 },
  ruleNumberText: { color: Palette.white, fontFamily: Fonts?.display, fontSize: 25, fontWeight: '900' },
  ruleCopy: { flex: 1 },
  ruleKicker: { color: Palette.orangeDark, fontFamily: Fonts?.rounded, fontSize: 8, fontWeight: '900', letterSpacing: 1.2 },
  ruleTitle: { color: Palette.ink, fontFamily: Fonts?.display, fontSize: 19, fontWeight: '900', marginTop: 4 },
  ruleText: { color: Palette.inkSoft, fontFamily: Fonts?.sans, fontSize: 10, lineHeight: 15, marginTop: 6 },
  footerSafeArea: { position: 'absolute', left: 0, right: 0, bottom: 0, backgroundColor: Palette.surface, borderTopWidth: 1, borderTopColor: Palette.line },
  footer: { minHeight: 82, paddingHorizontal: 17, paddingVertical: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  footerLabel: { color: Palette.muted, fontFamily: Fonts?.rounded, fontSize: 7, fontWeight: '900', letterSpacing: 1 },
  footerPrice: { color: Palette.ink, fontFamily: Fonts?.display, fontSize: 22, fontWeight: '900', marginTop: 2 },
  primaryButton: { height: 52, minWidth: 180, borderRadius: 16, backgroundColor: Palette.orange, paddingHorizontal: 19, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 22 },
  primaryButtonText: { color: Palette.white, fontFamily: Fonts?.rounded, fontSize: 13, fontWeight: '900' },
  primaryButtonArrow: { color: Palette.white, fontSize: 20, marginTop: -2 },
  pressed: { opacity: 0.8, transform: [{ scale: 0.985 }] },
  notFound: { flex: 1, backgroundColor: Palette.paper, alignItems: 'center', justifyContent: 'center', padding: 24 },
  notFoundTitle: { color: Palette.ink, fontFamily: Fonts?.display, fontSize: 27, fontWeight: '900' },
  backToAgenda: { marginTop: 18, borderRadius: 14, backgroundColor: Palette.orange, paddingHorizontal: 18, paddingVertical: 13 },
  backToAgendaText: { color: Palette.white, fontFamily: Fonts?.rounded, fontWeight: '900' },
});
