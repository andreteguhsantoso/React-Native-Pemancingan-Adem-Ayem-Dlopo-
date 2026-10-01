import { Href, useLocalSearchParams, useRouter } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useCallback, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Fonts, MaxContentWidth, Palette, Radius } from '@/constants/theme';
import { useAuth } from '@/context/auth-context';
import { useBooking } from '@/context/booking-context';
import { useEvents } from '@/context/events-context';
import { formatRupiah } from '@/data/events';
import { fetchOccupiedSpots } from '@/services/booking-service';
import { useFocusResource } from '@/hooks/use-focus-resource';

const SPOT_SIZE = 44;
const MAP_HEIGHT = 1140;

function buildOccupiedSpots(totalSpots: number, count: number, seed: number) {
  return new Set(
    Array.from({ length: totalSpots }, (_, index) => index + 1)
      .sort((a, b) => ((a * 37 + seed * 11) % 83) - ((b * 37 + seed * 11) % 83))
      .slice(0, count),
  );
}

function getSpotPosition(spot: number, mapWidth: number) {
  const horizontalRange = mapWidth - 44 - SPOT_SIZE;
  const verticalRange = MAP_HEIGHT - 100 - SPOT_SIZE;

  if (spot <= 20) {
    return { left: 22 + ((spot - 1) / 19) * horizontalRange, top: 18 };
  }
  if (spot <= 41) {
    return { left: mapWidth - SPOT_SIZE - 17, top: 50 + ((spot - 21) / 20) * verticalRange };
  }
  if (spot <= 62) {
    return { left: mapWidth - SPOT_SIZE - 22 - ((spot - 42) / 20) * horizontalRange, top: MAP_HEIGHT - SPOT_SIZE - 18 };
  }
  return { left: 17, top: MAP_HEIGHT - SPOT_SIZE - 50 - ((spot - 63) / 19) * verticalRange };
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <View style={styles.legendItem}>
      <View style={[styles.legendDot, { backgroundColor: color }]} />
      <Text style={styles.legendText}>{label}</Text>
    </View>
  );
}

export default function SpotSelectionScreen() {
  const router = useRouter();
  const { eventId } = useLocalSearchParams<{ eventId: string }>();
  const { setSelection } = useBooking();
  const { events } = useEvents();
  const { configured, session } = useAuth();
  const { width } = useWindowDimensions();
  const [selectedSpot, setSelectedSpot] = useState<number | null>(null);
  const event = events.find((item) => item.id === eventId);
  const [mapMode, setMapMode] = useState(false);
  const load = useCallback(() => fetchOccupiedSpots(eventId), [eventId]);
  const { data: remoteSpots, refreshing, error, refresh, updatedAt } = useFocusResource(load, new Set<number>(), configured && Boolean(event), 15000);
  const occupiedSpots = configured ? remoteSpots : event ? buildOccupiedSpots(event.totalSpots, event.totalSpots - event.availableSpots, event.fishKg) : new Set<number>();

  if (!event) {
    return (
      <SafeAreaView style={styles.notFound}>
        <Text style={styles.notFoundTitle}>Data event tidak tersedia</Text>
        <Pressable onPress={() => router.replace('/agenda')} style={styles.backToAgenda}>
          <Text style={styles.backToAgendaText}>Lihat agenda</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  const mapWidth = 1056;
  const gridWidth = Math.min(width, MaxContentWidth) - 54;
  const gridColumns = Math.max(1, Math.floor((gridWidth + 8) / 52));
  const cellWidth = (gridWidth - (gridColumns - 1) * 8) / gridColumns;
  const availableSpots = event.totalSpots - occupiedSpots.size;
  const ready = !configured || Boolean(updatedAt && !error && !refreshing);
  const validSelection = ready && selectedSpot !== null && selectedSpot <= event.totalSpots && !occupiedSpots.has(selectedSpot);

  return (
    <View style={styles.screen}>
      <View style={styles.page}>
        <SafeAreaView edges={['top']} style={styles.headerSafeArea}>
          <View style={styles.header}>
            <Pressable onPress={() => router.back()} style={styles.backButton}>
              <SymbolView
                name={{ ios: 'chevron.left', android: 'arrow_back', web: 'arrow_back' }}
                tintColor={Palette.white}
                size={23}
              />
            </Pressable>
            <View style={styles.headerCopy}>
              <Text style={styles.headerKicker}>BOOKING • LANGKAH 1</Text>
              <Text style={styles.headerTitle}>Pilih lapak</Text>
            </View>
            <View style={styles.stepBadge}>
              <Text style={styles.stepBadgeText}>1/3</Text>
            </View>
          </View>
        </SafeAreaView>

        <ScrollView showsVerticalScrollIndicator={false} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={Palette.orange} />} contentContainerStyle={styles.content}>
          <View style={styles.eventSummary}>
            <View style={styles.eventDate}>
              <Text style={styles.eventDateDay}>{event.shortDate.split(' ')[0]}</Text>
              <Text style={styles.eventDateMonth}>{event.shortDate.split(' ')[1]}</Text>
            </View>
            <View style={styles.eventCopy}>
              <Text style={styles.eventTitle}>{event.title}</Text>
              <Text style={styles.eventMeta}>{event.time} • {event.fishKg} KG nila</Text>
            </View>
            <Text style={styles.eventPrice}>{formatRupiah(event.price)}</Text>
          </View>

          <View style={styles.instructionRow}>
            <View>
              <Text style={styles.instructionKicker}>DENAH KOLAM</Text>
              <Text style={styles.instructionTitle}>Ketuk nomor pilihanmu</Text>
            </View>
            <Text style={styles.availableCount}>{ready ? `${availableSpots} tersedia` : 'Memeriksa...'}</Text>
          </View>

          <View style={styles.legend}>
            <Legend color={Palette.mint} label="Tersedia" />
            <Legend color="#D9D8D2" label="Terisi" />
            <Legend color={Palette.orange} label="Dipilih" />
          </View>

          {error ? <View style={styles.helperCard}><Text style={{ color: Palette.orangeDark, fontSize: 14, lineHeight: 21 }}>Ketersediaan belum dapat dipastikan. {error} Tarik halaman untuk mencoba kembali. Pemesanan dinonaktifkan sampai data berhasil dimuat.</Text></View> : null}
          {!configured ? <Text style={{ fontSize: 13, color: Palette.orangeDark, paddingVertical: 14 }}>Mode contoh: posisi terisi bukan data pemesanan asli.</Text> : null}
          {selectedSpot && !occupiedSpots.has(selectedSpot) ? null : selectedSpot ? <Text style={{ color: Palette.orangeDark, fontSize: 14, padding: 12 }}>Lapak {selectedSpot} baru saja terisi. Silakan pilih nomor lain.</Text> : null}
          <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
            {[false, true].map((mode) => <Pressable key={String(mode)} onPress={() => setMapMode(mode)} style={{ minHeight: 44, paddingHorizontal: 16, justifyContent: 'center', borderRadius: 12, backgroundColor: mapMode === mode ? Palette.ink : Palette.mint }}><Text style={{ fontSize: 14, color: mapMode === mode ? Palette.white : Palette.ink }}>{mode ? 'Denah skematis' : 'Daftar lapak'}</Text></Pressable>)}
          </View>
          {!mapMode ? <View style={{ padding: 12, borderRadius: 20, backgroundColor: '#E8E7DE', flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {Array.from({ length: event.totalSpots }, (_, index) => index + 1).map((spot) => <Pressable key={spot} accessibilityRole="button" accessibilityLabel={`Lapak ${spot}, ${occupiedSpots.has(spot) ? 'terisi' : 'tersedia'}`} disabled={!ready || occupiedSpots.has(spot)} onPress={() => setSelectedSpot(spot)} style={[styles.spot, { position: 'relative', width: cellWidth, height: 48 }, occupiedSpots.has(spot) && styles.spotOccupied, selectedSpot === spot && styles.spotSelected]}><Text style={[styles.spotText, { fontSize: 14 }, selectedSpot === spot && styles.spotTextSelected]}>{spot}</Text></Pressable>)}
          </View> : <>
          <Text style={{ color: Palette.muted, fontSize: 12, lineHeight: 18, marginBottom: 10 }}>Geser ke samping untuk melihat denah. Ini ilustrasi penomoran, bukan peta lokasi berskala.</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator>
          <View style={[styles.map, { width: mapWidth }]}>
            <View style={styles.mapTextureOne} />
            <View style={styles.mapTextureTwo} />
            <View style={styles.pond}>
              <View style={styles.rippleLarge} />
              <View style={styles.rippleSmall} />
              <Text style={styles.pondFish}>≈</Text>
              <Text style={styles.pondTitle}>KOLAM NILA</Text>
              <Text style={styles.pondCaption}>{event.fishKg} KG DILEPAS</Text>
            </View>

            <View style={styles.entrance}>
              <Text style={styles.entranceText}>PINTU MASUK</Text>
              <Text style={styles.entranceArrow}>↑</Text>
            </View>

            {Array.from({ length: event.totalSpots }, (_, index) => index + 1).map((spot) => {
              const occupied = occupiedSpots.has(spot);
              const selected = selectedSpot === spot;
              return (
                <Pressable
                  key={spot}
                  disabled={occupied || !ready}
                  accessibilityLabel={`Lapak ${spot}${occupied ? ' terisi' : ' tersedia'}`}
                  onPress={() => setSelectedSpot(spot)}
                  style={[
                    styles.spot,
                    getSpotPosition(spot, mapWidth),
                    occupied && styles.spotOccupied,
                    selected && styles.spotSelected,
                  ]}>
                  <Text
                    style={[
                      styles.spotText,
                      occupied && styles.spotTextOccupied,
                      selected && styles.spotTextSelected,
                    ]}>
                    {spot}
                  </Text>
                </Pressable>
              );
            })}
          </View>
          </ScrollView></>}

          <View style={styles.helperCard}>
            <View style={styles.helperIcon}>
              <Text style={styles.helperIconText}>i</Text>
            </View>
            <View style={styles.helperCopy}>
              <Text style={styles.helperTitle}>Satu booking untuk satu lapak</Text>
              <Text style={styles.helperText}>Lapak terisi tidak dapat dipilih. Nomor pilihanmu akan ditahan saat proses pembayaran.</Text>
            </View>
          </View>
        </ScrollView>

        <SafeAreaView edges={['bottom']} style={styles.footerSafeArea}>
          <View style={styles.footer}>
            <View style={styles.selectionCopy}>
              <Text style={styles.selectionLabel}>{selectedSpot ? `LAPAK ${selectedSpot}` : 'BELUM MEMILIH'}</Text>
              <Text style={[styles.selectionPrice, !selectedSpot && styles.selectionPriceMuted]}>
                {selectedSpot ? formatRupiah(event.price) : 'Pilih satu lapak'}
              </Text>
            </View>
            <Pressable
              disabled={!validSelection}
              onPress={() => {
                if (!validSelection || !selectedSpot) return;
                setSelection(event.id, selectedSpot);
                const nextRoute = `/booking/${event.id}/details?spot=${selectedSpot}`;
                if (!session) {
                  router.push(`/auth?redirect=${encodeURIComponent(nextRoute)}` as Href);
                  return;
                }
                router.push(nextRoute as Href);
              }}
              style={({ pressed }) => [
                styles.continueButton,
                !validSelection && styles.continueButtonDisabled,
                pressed && selectedSpot !== null && styles.pressed,
              ]}>
              <Text style={styles.continueButtonText}>Lanjut isi data</Text>
              <Text style={styles.continueButtonArrow}>→</Text>
            </Pressable>
          </View>
        </SafeAreaView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#D8D2C5', alignItems: 'center' },
  page: { flex: 1, width: '100%', maxWidth: MaxContentWidth, backgroundColor: Palette.paper },
  headerSafeArea: { backgroundColor: Palette.ink },
  header: { height: 76, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center' },
  backButton: { width: 44, height: 44, borderRadius: 15, borderWidth: 1, borderColor: '#3B6567', alignItems: 'center', justifyContent: 'center' },
  headerCopy: { flex: 1, paddingHorizontal: 13 },
  headerKicker: { color: Palette.gold, fontFamily: Fonts?.rounded, fontSize: 8, fontWeight: '900', letterSpacing: 1.2 },
  headerTitle: { color: Palette.white, fontFamily: Fonts?.display, fontSize: 25, fontWeight: '900', marginTop: 1 },
  stepBadge: { width: 43, height: 30, borderRadius: 10, backgroundColor: Palette.orange, alignItems: 'center', justifyContent: 'center' },
  stepBadgeText: { color: Palette.white, fontFamily: Fonts?.rounded, fontSize: 10, fontWeight: '900' },
  content: { paddingHorizontal: 14, paddingBottom: 130 },
  eventSummary: { minHeight: 83, marginTop: 15, padding: 12, borderRadius: Radius.medium, backgroundColor: Palette.surface, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#E7E1D5' },
  eventDate: { width: 53, height: 56, borderRadius: 14, backgroundColor: Palette.gold, alignItems: 'center', justifyContent: 'center' },
  eventDateDay: { color: Palette.ink, fontFamily: Fonts?.display, fontSize: 22, lineHeight: 23, fontWeight: '900' },
  eventDateMonth: { color: Palette.inkSoft, fontFamily: Fonts?.rounded, fontSize: 8, fontWeight: '900', letterSpacing: 1 },
  eventCopy: { flex: 1, paddingHorizontal: 11 },
  eventTitle: { color: Palette.ink, fontFamily: Fonts?.display, fontSize: 17, fontWeight: '900' },
  eventMeta: { color: Palette.muted, fontFamily: Fonts?.sans, fontSize: 8, marginTop: 4 },
  eventPrice: { color: Palette.orange, fontFamily: Fonts?.display, fontSize: 17, fontWeight: '900' },
  instructionRow: { marginTop: 27, marginBottom: 12, paddingHorizontal: 2, flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' },
  instructionKicker: { color: Palette.orange, fontFamily: Fonts?.rounded, fontSize: 8, fontWeight: '900', letterSpacing: 1.3 },
  instructionTitle: { color: Palette.ink, fontFamily: Fonts?.display, fontSize: 24, fontWeight: '900', marginTop: 2 },
  availableCount: { color: Palette.success, fontFamily: Fonts?.rounded, fontSize: 10, fontWeight: '900', paddingBottom: 3 },
  legend: { minHeight: 43, backgroundColor: Palette.surface, borderRadius: 14, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 18, marginBottom: 10 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 11, height: 11, borderRadius: 4 },
  legendText: { color: Palette.inkSoft, fontFamily: Fonts?.rounded, fontSize: 8, fontWeight: '800' },
  map: { height: MAP_HEIGHT, alignSelf: 'center', borderRadius: Radius.large, backgroundColor: '#E8E7DE', overflow: 'hidden', borderWidth: 1, borderColor: '#D5D9CF' },
  mapTextureOne: { position: 'absolute', width: 220, height: 220, borderRadius: 120, backgroundColor: 'rgba(203,230,216,0.42)', left: -70, top: 70 },
  mapTextureTwo: { position: 'absolute', width: 250, height: 250, borderRadius: 140, backgroundColor: 'rgba(242,193,78,0.13)', right: -80, bottom: 40 },
  pond: { position: 'absolute', left: 60, right: 60, top: 70, bottom: 70, borderRadius: 180, backgroundColor: Palette.sky, borderWidth: 7, borderColor: '#FAF9F1', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  rippleLarge: { position: 'absolute', width: 180, height: 180, borderRadius: 100, borderWidth: 1, borderColor: 'rgba(255,255,255,0.52)' },
  rippleSmall: { position: 'absolute', width: 106, height: 106, borderRadius: 60, borderWidth: 1, borderColor: 'rgba(255,255,255,0.65)' },
  pondFish: { color: Palette.ink, fontFamily: Fonts?.serif, fontSize: 44, fontWeight: '900', transform: [{ rotate: '-8deg' }] },
  pondTitle: { color: Palette.ink, fontFamily: Fonts?.display, fontSize: 20, fontWeight: '900', letterSpacing: 1.3, marginTop: 8 },
  pondCaption: { color: Palette.inkSoft, fontFamily: Fonts?.rounded, fontSize: 8, fontWeight: '900', letterSpacing: 1.1, marginTop: 3 },
  entrance: { position: 'absolute', bottom: 55, alignSelf: 'center', backgroundColor: Palette.ink, borderRadius: 8, paddingHorizontal: 9, paddingVertical: 5, flexDirection: 'row', alignItems: 'center', gap: 5 },
  entranceText: { color: Palette.white, fontFamily: Fonts?.rounded, fontSize: 6, fontWeight: '900', letterSpacing: 0.8 },
  entranceArrow: { color: Palette.gold, fontSize: 10 },
  spot: { position: 'absolute', width: SPOT_SIZE, height: SPOT_SIZE, borderRadius: 9, backgroundColor: Palette.mint, borderWidth: 1.5, borderColor: Palette.white, alignItems: 'center', justifyContent: 'center', shadowColor: Palette.ink, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.12, shadowRadius: 3, elevation: 2 },
  spotOccupied: { backgroundColor: '#D9D8D2', borderColor: '#EBE9E3', shadowOpacity: 0 },
  spotSelected: { backgroundColor: Palette.orange, borderColor: Palette.white, transform: [{ scale: 1.18 }], zIndex: 4 },
  spotText: { color: Palette.ink, fontFamily: Fonts?.rounded, fontSize: 14, fontWeight: '900' },
  spotTextOccupied: { color: '#9A9D97' },
  spotTextSelected: { color: Palette.white, fontSize: 14 },
  helperCard: { marginTop: 12, borderRadius: Radius.medium, backgroundColor: Palette.gold, padding: 14, flexDirection: 'row' },
  helperIcon: { width: 37, height: 37, borderRadius: 12, backgroundColor: Palette.orange, alignItems: 'center', justifyContent: 'center', marginRight: 11 },
  helperIconText: { color: Palette.white, fontFamily: Fonts?.serif, fontStyle: 'italic', fontSize: 20, fontWeight: '900' },
  helperCopy: { flex: 1 },
  helperTitle: { color: Palette.ink, fontFamily: Fonts?.rounded, fontSize: 11, fontWeight: '900' },
  helperText: { color: Palette.inkSoft, fontFamily: Fonts?.sans, fontSize: 9, lineHeight: 14, marginTop: 3 },
  footerSafeArea: { position: 'absolute', left: 0, right: 0, bottom: 0, backgroundColor: Palette.surface, borderTopWidth: 1, borderTopColor: Palette.line },
  footer: { minHeight: 83, paddingHorizontal: 15, paddingVertical: 11, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  selectionCopy: { flex: 1 },
  selectionLabel: { color: Palette.orange, fontFamily: Fonts?.rounded, fontSize: 8, fontWeight: '900', letterSpacing: 1 },
  selectionPrice: { color: Palette.ink, fontFamily: Fonts?.display, fontSize: 21, fontWeight: '900', marginTop: 2 },
  selectionPriceMuted: { color: Palette.muted, fontSize: 16 },
  continueButton: { height: 52, minWidth: 185, borderRadius: 16, backgroundColor: Palette.orange, paddingHorizontal: 17, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 16 },
  continueButtonDisabled: { backgroundColor: '#B9C0BA' },
  continueButtonText: { color: Palette.white, fontFamily: Fonts?.rounded, fontSize: 12, fontWeight: '900' },
  continueButtonArrow: { color: Palette.white, fontSize: 19, marginTop: -2 },
  pressed: { opacity: 0.82, transform: [{ scale: 0.985 }] },
  notFound: { flex: 1, backgroundColor: Palette.paper, alignItems: 'center', justifyContent: 'center', padding: 24 },
  notFoundTitle: { color: Palette.ink, fontFamily: Fonts?.display, fontSize: 26, fontWeight: '900' },
  backToAgenda: { marginTop: 18, backgroundColor: Palette.orange, borderRadius: 14, paddingHorizontal: 18, paddingVertical: 13 },
  backToAgendaText: { color: Palette.white, fontFamily: Fonts?.rounded, fontWeight: '900' },
});
