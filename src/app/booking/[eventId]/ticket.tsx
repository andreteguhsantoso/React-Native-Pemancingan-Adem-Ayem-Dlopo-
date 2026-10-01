import { useLocalSearchParams, useRouter } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useCallback } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import QRCode from 'react-native-qrcode-svg';

import { Fonts, MaxContentWidth, Palette, Radius } from '@/constants/theme';
import { useAuth } from '@/context/auth-context';
import { useBooking } from '@/context/booking-context';
import { useEvents } from '@/context/events-context';
import type { BookingStatus, RemoteEvent } from '@/lib/database.types';
import { requireSupabase } from '@/lib/supabase';
import { useFocusResource } from '@/hooks/use-focus-resource';

type TicketBooking = { id: string; booking_code: string; event_id: string; spot_number: number; participant_name: string; status: BookingStatus; events: RemoteEvent | null };

function ticketEvent(event: RemoteEvent) {
  const time = new Intl.DateTimeFormat('id-ID', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'Asia/Jakarta' });
  return { title: event.title, label: event.label, fishKg: Number(event.fish_kg), date: new Intl.DateTimeFormat('id-ID', { dateStyle: 'full', timeZone: 'Asia/Jakarta' }).format(new Date(event.starts_at)), time: `${time.format(new Date(event.starts_at))} - ${time.format(new Date(event.ends_at))} WIB` };
}

function TicketQr({ value }: { value: string }) {
  return (
    <View style={styles.qrFrame}>
      <QRCode value={value} size={112} quietZone={8} color={Palette.ink} backgroundColor="#FFFFFF" ecl="M" />
      <Text style={styles.qrDemoLabel}>QR KODE BOOKING</Text>
    </View>
  );
}

export default function DigitalTicketScreen() {
  const router = useRouter();
  const { eventId, bookingId, code } = useLocalSearchParams<{ eventId: string; bookingId?: string; code?: string }>();
  const { resetBooking } = useBooking();
  const { events } = useEvents();
  const { session } = useAuth();
  const loadBooking = useCallback(async () => {
    if (!session || (!bookingId && !code)) throw new Error('Buka tiket dari halaman pesanan akun Anda.');
    let query = requireSupabase().from('bookings').select('id,booking_code,event_id,spot_number,participant_name,status,events(*)').eq('event_id', eventId).eq('user_id', session.user.id);
    query = bookingId ? query.eq('id', bookingId) : query.eq('booking_code', code as string);
    const { data, error } = await query.single();
    if (error) throw new Error(error.message);
    return data as unknown as TicketBooking;
  }, [bookingId, code, eventId, session]);
  const { data: booking, refreshing: loading, error: loadError, refresh } = useFocusResource<TicketBooking | null>(loadBooking, null, Boolean(session), 15000);
  const event = booking?.events ? ticketEvent(booking.events) : events.find((item) => item.id === eventId);
  const bookingCode = booking?.booking_code;
  if (loading && !booking) return <View style={styles.loading}><ActivityIndicator color={Palette.orange} size="large" /><Text style={styles.loadingText}>Memvalidasi tiket...</Text></View>;

  if (!session || loadError || !event || !bookingCode || !booking || !['paid', 'confirmed'].includes(booking.status) || booking.events?.status === 'cancelled') {
    return (
      <SafeAreaView style={styles.notFound}>
        <Text style={styles.notFoundTitle}>Tiket belum tersedia</Text>
        <Text style={styles.notFoundText}>{loadError || (booking?.events?.status === 'cancelled' ? 'Event dibatalkan. Hubungi pengelola untuk tindak lanjut pesanan.' : 'Pembayaran belum diverifikasi atau detail event belum dapat dimuat.')}</Text>
        {session ? <Pressable onPress={refresh} style={styles.backToAgenda}><Text style={styles.backToAgendaText}>Periksa lagi</Text></Pressable> : null}
        <Pressable onPress={() => router.replace('/bookings')} style={styles.backToAgenda}>
          <Text style={styles.backToAgendaText}>Lihat status pesanan</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  const finish = () => {
    resetBooking();
    router.replace('/');
  };

  return (
    <View style={styles.screen}>
      <View style={styles.page}>
        <SafeAreaView edges={['top']} style={styles.headerSafeArea}>
          <View style={styles.header}>
            <View style={styles.successIcon}>
              <Text style={styles.successIconText}>✓</Text>
            </View>
            <View style={styles.headerCopy}>
              <Text style={styles.headerKicker}>PEMBAYARAN BERHASIL</Text>
              <Text style={styles.headerTitle}>Tiketmu sudah siap!</Text>
              <Text style={styles.headerText}>Simpan kode booking dan tunjukkan kepada operator saat datang.</Text>
            </View>
          </View>
        </SafeAreaView>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
          <View style={styles.ticketCard}>
            <View style={styles.ticketTop}>
              <View style={styles.brandRow}>
                <View style={styles.brandMark}>
                  <Text style={styles.brandMarkText}>AA</Text>
                </View>
                <View>
                  <Text style={styles.brandName}>ADEM AYEM DLOPO</Text>
                  <Text style={styles.brandCaption}>TIKET EVENT RESMI</Text>
                </View>
              </View>
              <View style={styles.paidBadge}>
                <Text style={styles.paidBadgeText}>LUNAS</Text>
              </View>
            </View>

            <View style={styles.heroInfo}>
              <Text style={styles.eventLabel}>{event.label}</Text>
              <Text style={styles.eventTitle}>{event.title}</Text>
              <Text style={styles.eventMeta}>{event.date} • {event.time}</Text>
            </View>

            <View style={styles.ticketStats}>
              <View style={styles.ticketStat}>
                <Text style={styles.ticketStatLabel}>LAPAK</Text>
                <Text style={styles.ticketStatValue}>{booking.spot_number}</Text>
              </View>
              <View style={styles.ticketDivider} />
              <View style={styles.ticketStat}>
                <Text style={styles.ticketStatLabel}>IKAN DILEPAS</Text>
                <Text style={styles.ticketStatValue}>{event.fishKg} KG</Text>
              </View>
              <View style={styles.ticketDivider} />
              <View style={styles.ticketStat}>
                <Text style={styles.ticketStatLabel}>PESERTA</Text>
                <Text style={[styles.ticketStatValue, styles.participantValue]} numberOfLines={1}>{booking.participant_name}</Text>
              </View>
            </View>

            <View style={styles.cutLine}>
              {Array.from({ length: 24 }, (_, index) => <View key={index} style={styles.cutDash} />)}
            </View>
            <View style={styles.leftNotch} />
            <View style={styles.rightNotch} />

            <View style={styles.codeSection}>
              <TicketQr value={bookingCode} />
              <View style={styles.codeCopy}>
                <Text style={styles.codeLabel}>KODE BOOKING</Text>
                <Text style={styles.bookingCode}>{bookingCode}</Text>
                <Text style={styles.codeHint}>Operator memvalidasi status tiket menggunakan kode booking pada database.</Text>
                <View style={styles.methodPill}>
                  <Text style={styles.methodPillText}>
                    Pembayaran terverifikasi server
                  </Text>
                </View>
              </View>
            </View>
          </View>

          <View style={styles.instructionsCard}>
            <Text style={styles.instructionsKicker}>SAAT TIBA DI LOKASI</Text>
            <Text style={styles.instructionsTitle}>Cara menggunakan tiket</Text>
            <View style={styles.instructionRow}>
              <Text style={styles.instructionNumber}>1</Text>
              <Text style={styles.instructionText}>Datang minimal 30 menit sebelum event dimulai.</Text>
            </View>
            <View style={styles.instructionRow}>
              <Text style={styles.instructionNumber}>2</Text>
              <Text style={styles.instructionText}>Tunjukkan kode booking kepada operator di pintu masuk.</Text>
            </View>
            <View style={styles.instructionRow}>
              <Text style={styles.instructionNumber}>3</Text>
              <Text style={styles.instructionText}>Tempati lapak nomor {booking.spot_number} dan patuhi aturan umpan alami.</Text>
            </View>
          </View>

          <View style={styles.helpCard}>
            <SymbolView
              name={{ ios: 'message.fill', android: 'chat', web: 'chat' }}
              tintColor={Palette.ink}
              size={22}
            />
            <View style={styles.helpCopy}>
              <Text style={styles.helpTitle}>Butuh bantuan?</Text>
              <Text style={styles.helpText}>Hubungi pengelola dan sebutkan kode {bookingCode}.</Text>
            </View>
          </View>
        </ScrollView>

        <SafeAreaView edges={['bottom']} style={styles.footerSafeArea}>
          <View style={styles.footer}>
            <Pressable onPress={finish} style={({ pressed }) => [styles.homeButton, pressed && styles.pressed]}>
              <Text style={styles.homeButtonText}>Kembali ke Beranda</Text>
              <Text style={styles.homeButtonArrow}>→</Text>
            </Pressable>
          </View>
        </SafeAreaView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#C9C4B8', alignItems: 'center' },
  page: { flex: 1, width: '100%', maxWidth: MaxContentWidth, backgroundColor: Palette.paper },
  headerSafeArea: { backgroundColor: Palette.ink },
  header: { minHeight: 137, paddingHorizontal: 18, paddingVertical: 19, flexDirection: 'row', alignItems: 'center' },
  successIcon: { width: 56, height: 56, borderRadius: 19, backgroundColor: Palette.gold, alignItems: 'center', justifyContent: 'center', marginRight: 14, transform: [{ rotate: '-4deg' }] },
  successIconText: { color: Palette.ink, fontSize: 28, fontWeight: '900' },
  headerCopy: { flex: 1 },
  headerKicker: { color: Palette.gold, fontFamily: Fonts?.rounded, fontSize: 8, fontWeight: '900', letterSpacing: 1.2 },
  headerTitle: { color: Palette.white, fontFamily: Fonts?.display, fontSize: 26, fontWeight: '900', marginTop: 3 },
  headerText: { color: '#BED0CC', fontFamily: Fonts?.sans, fontSize: 9, lineHeight: 13, marginTop: 4, maxWidth: 330 },
  content: { paddingHorizontal: 15, paddingTop: 17, paddingBottom: 112 },
  ticketCard: { borderRadius: Radius.large, backgroundColor: Palette.surface, overflow: 'hidden', borderWidth: 1, borderColor: '#E2DED3', shadowColor: Palette.ink, shadowOffset: { width: 0, height: 14 }, shadowOpacity: 0.13, shadowRadius: 24, elevation: 6 },
  ticketTop: { paddingHorizontal: 17, paddingTop: 17, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  brandMark: { width: 36, height: 36, borderRadius: 12, backgroundColor: Palette.gold, alignItems: 'center', justifyContent: 'center', transform: [{ rotate: '-5deg' }] },
  brandMarkText: { color: Palette.ink, fontFamily: Fonts?.serif, fontStyle: 'italic', fontSize: 21, fontWeight: '900' },
  brandName: { color: Palette.ink, fontFamily: Fonts?.display, fontSize: 14, fontWeight: '900', letterSpacing: 1 },
  brandCaption: { color: Palette.muted, fontFamily: Fonts?.rounded, fontSize: 6, fontWeight: '900', letterSpacing: 1, marginTop: 2 },
  paidBadge: { borderRadius: 8, backgroundColor: Palette.mint, paddingHorizontal: 10, paddingVertical: 7 },
  paidBadgeText: { color: Palette.success, fontFamily: Fonts?.rounded, fontSize: 8, fontWeight: '900', letterSpacing: 1 },
  heroInfo: { paddingHorizontal: 17, paddingTop: 23 },
  eventLabel: { color: Palette.orange, fontFamily: Fonts?.rounded, fontSize: 8, fontWeight: '900', letterSpacing: 1.3 },
  eventTitle: { color: Palette.ink, fontFamily: Fonts?.display, fontSize: 30, lineHeight: 32, fontWeight: '900', letterSpacing: -0.5, marginTop: 4 },
  eventMeta: { color: Palette.muted, fontFamily: Fonts?.sans, fontSize: 9, marginTop: 6 },
  ticketStats: { margin: 17, minHeight: 77, borderRadius: Radius.medium, backgroundColor: Palette.ink, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 7 },
  ticketStat: { flex: 1, alignItems: 'center', paddingHorizontal: 4 },
  ticketStatLabel: { color: '#AFC5C1', fontFamily: Fonts?.rounded, fontSize: 6, fontWeight: '900', letterSpacing: 0.8 },
  ticketStatValue: { color: Palette.white, fontFamily: Fonts?.display, fontSize: 20, fontWeight: '900', marginTop: 4 },
  participantValue: { fontSize: 13, maxWidth: 105 },
  ticketDivider: { width: 1, height: 34, backgroundColor: '#3B6365' },
  cutLine: { height: 1, marginVertical: 5, flexDirection: 'row', justifyContent: 'space-between', overflow: 'hidden' },
  cutDash: { width: 10, height: 1, backgroundColor: '#D2D3CC' },
  leftNotch: { position: 'absolute', left: -13, top: 329, width: 26, height: 26, borderRadius: 14, backgroundColor: Palette.paper },
  rightNotch: { position: 'absolute', right: -13, top: 329, width: 26, height: 26, borderRadius: 14, backgroundColor: Palette.paper },
  codeSection: { paddingHorizontal: 17, paddingTop: 18, paddingBottom: 21, flexDirection: 'row', alignItems: 'center' },
  qrFrame: { width: 145, height: 166, borderRadius: 16, backgroundColor: Palette.white, borderWidth: 1, borderColor: Palette.line, alignItems: 'center', justifyContent: 'center' },
  qrGrid: { width: 114, height: 114, flexDirection: 'row', flexWrap: 'wrap' },
  qrModule: { width: 6, height: 6, backgroundColor: Palette.white },
  qrModuleActive: { backgroundColor: Palette.ink },
  qrDemoLabel: { color: Palette.orange, fontFamily: Fonts?.rounded, fontSize: 7, fontWeight: '900', letterSpacing: 1, marginTop: 7 },
  codeCopy: { flex: 1, paddingLeft: 16 },
  codeLabel: { color: Palette.muted, fontFamily: Fonts?.rounded, fontSize: 7, fontWeight: '900', letterSpacing: 1 },
  bookingCode: { color: Palette.ink, fontFamily: Fonts?.display, fontSize: 18, lineHeight: 21, fontWeight: '900', marginTop: 4 },
  codeHint: { color: Palette.muted, fontFamily: Fonts?.sans, fontSize: 8, lineHeight: 12, marginTop: 7 },
  methodPill: { alignSelf: 'flex-start', marginTop: 9, borderRadius: 7, backgroundColor: Palette.gold, paddingHorizontal: 8, paddingVertical: 5 },
  methodPillText: { color: Palette.ink, fontFamily: Fonts?.rounded, fontSize: 7, fontWeight: '900' },
  instructionsCard: { marginTop: 14, borderRadius: Radius.large, backgroundColor: Palette.surface, padding: 17, borderWidth: 1, borderColor: '#E2DED3' },
  instructionsKicker: { color: Palette.orange, fontFamily: Fonts?.rounded, fontSize: 8, fontWeight: '900', letterSpacing: 1.2 },
  instructionsTitle: { color: Palette.ink, fontFamily: Fonts?.display, fontSize: 23, fontWeight: '900', marginTop: 3, marginBottom: 12 },
  instructionRow: { flexDirection: 'row', alignItems: 'center', marginTop: 8 },
  instructionNumber: { width: 28, height: 28, borderRadius: 9, overflow: 'hidden', textAlign: 'center', textAlignVertical: 'center', color: Palette.white, backgroundColor: Palette.orange, fontFamily: Fonts?.display, fontSize: 15, fontWeight: '900', marginRight: 10 },
  instructionText: { flex: 1, color: Palette.inkSoft, fontFamily: Fonts?.sans, fontSize: 9, lineHeight: 14 },
  helpCard: { marginTop: 12, borderRadius: Radius.medium, backgroundColor: Palette.gold, padding: 14, flexDirection: 'row', alignItems: 'center' },
  helpCopy: { flex: 1, marginLeft: 11 },
  helpTitle: { color: Palette.ink, fontFamily: Fonts?.rounded, fontSize: 11, fontWeight: '900' },
  helpText: { color: Palette.inkSoft, fontFamily: Fonts?.sans, fontSize: 8, marginTop: 3 },
  footerSafeArea: { position: 'absolute', left: 0, right: 0, bottom: 0, backgroundColor: Palette.surface, borderTopWidth: 1, borderTopColor: Palette.line },
  footer: { minHeight: 78, paddingHorizontal: 15, paddingVertical: 11 },
  homeButton: { height: 52, borderRadius: 16, backgroundColor: Palette.orange, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 18 },
  homeButtonText: { color: Palette.white, fontFamily: Fonts?.rounded, fontSize: 12, fontWeight: '900' },
  homeButtonArrow: { color: Palette.white, fontSize: 19, marginTop: -2 },
  pressed: { opacity: 0.82, transform: [{ scale: 0.99 }] },
  notFound: { flex: 1, backgroundColor: Palette.paper, alignItems: 'center', justifyContent: 'center', padding: 24 },
  notFoundTitle: { color: Palette.ink, fontFamily: Fonts?.display, fontSize: 26, fontWeight: '900' },
  notFoundText: { color: Palette.muted, fontFamily: Fonts?.sans, fontSize: 10, lineHeight: 15, textAlign: 'center', marginTop: 7 },
  backToAgenda: { marginTop: 18, backgroundColor: Palette.orange, borderRadius: 14, paddingHorizontal: 18, paddingVertical: 13 },
  backToAgendaText: { color: Palette.white, fontFamily: Fonts?.rounded, fontWeight: '900' },
  loading: { flex: 1, backgroundColor: Palette.paper, alignItems: 'center', justifyContent: 'center' },
  loadingText: { color: Palette.muted, fontFamily: Fonts?.sans, fontSize: 10, marginTop: 9 },
});
