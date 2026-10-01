import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Fonts, MaxContentWidth, Palette, Radius } from '@/constants/theme';
import { useAuth } from '@/context/auth-context';
import { useFocusResource } from '@/hooks/use-focus-resource';
import type { BookingStatus } from '@/lib/database.types';
import { bookingStatusLabels } from '@/services/booking-service';
import { fetchPaymentOverview, formatPaymentAmount, formatPaymentDeadline, PaymentOverview } from '@/services/payment-service';

const statusCopy: Record<BookingStatus, { title: string; text: string }> = {
  awaiting_payment: { title: 'Reservasi tersimpan', text: 'Lapak ditahan sementara. Selesaikan transfer dan kirim bukti jika pembayaran telah diaktifkan pengelola.' },
  paid: { title: 'Pembayaran diterima', text: 'Dana sudah dikonfirmasi pengelola. Tiket digital Anda dapat digunakan.' },
  confirmed: { title: 'Booking dikonfirmasi', text: 'Tiket digital Anda sudah dikonfirmasi pengelola.' },
  cancelled: { title: 'Booking dibatalkan', text: 'Lapak telah dilepas. Jika telanjur transfer, hubungi pengelola untuk penyelesaian.' },
  expired: { title: 'Waktu pembayaran habis', text: 'Jangan transfer ke pesanan ini. Jika sudah membayar, hubungi pengelola sebelum membuat pesanan lain.' },
};

export default function PaymentStatusScreen() {
  const router = useRouter();
  const { eventId, bookingId, code } = useLocalSearchParams<{ eventId: string; bookingId?: string; code?: string }>();
  const { session, loading: authLoading } = useAuth();
  const load = useCallback(() => {
    if (!session) throw new Error('Masuk untuk memeriksa booking.');
    return fetchPaymentOverview(session.user.id, eventId, bookingId, code);
  }, [bookingId, code, eventId, session]);
  const { data, refreshing, error, refresh } = useFocusResource<PaymentOverview | null>(load, null, Boolean(session), 15000);
  const matches = Boolean(data && data.userId === session?.user.id && data.booking.event_id === eventId && (bookingId ? data.booking.id === bookingId : data.booking.booking_code === code));
  if (authLoading || (refreshing && !matches)) return <SafeAreaView style={styles.center}><ActivityIndicator color={Palette.orange} size="large" /><Text style={styles.text}>Memeriksa status pembayaran...</Text></SafeAreaView>;
  if (!session || !data || !matches) return <SafeAreaView style={styles.center}><Text style={styles.title}>Status tidak tersedia</Text><Text style={styles.text}>{error || 'Silakan masuk kembali untuk memeriksa booking.'}</Text>{session ? <Pressable onPress={refresh} style={styles.primary}><Text style={styles.primaryText}>Coba lagi</Text></Pressable> : null}<Pressable onPress={() => router.replace('/profile')} style={styles.secondary}><Text style={styles.secondaryText}>Kembali ke profil</Text></Pressable></SafeAreaView>;

  const { booking, submission, settings, paymentError } = data;
  const isPaid = booking.status === 'paid' || booking.status === 'confirmed';
  const active = booking.status === 'awaiting_payment';
  const pending = submission?.status === 'pending';
  const copy = statusCopy[booking.status];
  const transferAvailable = Boolean(settings?.transfer_enabled || booking.bank_instructions) && !paymentError;

  return <View style={styles.screen}><View style={styles.page}>
    <SafeAreaView edges={['top']} style={[styles.hero, isPaid && styles.heroPaid]}><Text style={styles.kicker}>STATUS BOOKING</Text><Text style={styles.heroTitle}>{active && pending ? 'Bukti sedang diperiksa' : copy.title}</Text><Text style={styles.heroText}>{active && pending ? 'Bukti transfer sudah diterima. Menunggu pengelola memeriksa dana masuk ke rekening.' : copy.text}</Text></SafeAreaView>
    <ScrollView refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />} contentContainerStyle={styles.content}>
      {error || paymentError ? <View style={styles.notice}><Text style={styles.noticeTitle}>Data belum dapat diperbarui</Text><Text style={styles.text}>{error || paymentError}</Text><Text style={styles.text}>Jangan melakukan pembayaran berdasarkan informasi yang belum berhasil diperiksa.</Text></View> : null}
      <View style={styles.card}><Text style={styles.codeLabel}>KODE BOOKING</Text><Text selectable style={styles.code}>{booking.booking_code}</Text><Text style={styles.amount}>{formatPaymentAmount(booking.amount)}</Text><View style={styles.divider} /><View style={styles.row}><Text style={styles.meta}>NOMOR LAPAK</Text><Text style={styles.value}>{booking.spot_number}</Text></View><View style={styles.row}><Text style={styles.meta}>STATUS</Text><Text style={styles.value}>{bookingStatusLabels[booking.status]}</Text></View>{active ? <Text style={styles.expiry}>Batas waktu: {formatPaymentDeadline(booking.expires_at)}</Text> : null}</View>
      {active && submission?.status === 'rejected' ? <View style={styles.notice}><Text style={styles.noticeTitle}>Bukti perlu diperbaiki</Text><Text style={styles.text}>{submission.review_note}</Text><Text style={styles.text}>Anda dapat mengirim ulang bukti sebelum batas waktu. Jangan melakukan transfer ulang tanpa memastikan transaksi sebelumnya.</Text></View> : null}
      {active && !transferAvailable && !paymentError ? <View style={styles.notice}><Text style={styles.noticeTitle}>Pembayaran belum diaktifkan pengelola</Text><Text style={styles.text}>Ini baru reservasi, bukan tiket lunas. Pengelola perlu mengisi dan mengaktifkan rekening transfer di panel pembayaran. QRIS, VA, dan e-wallet otomatis belum tersedia.</Text></View> : null}
      {isPaid ? <Pressable onPress={() => router.replace({ pathname: '/booking/[eventId]/ticket', params: { eventId, bookingId: booking.id, code: booking.booking_code } })} style={styles.primary}><Text style={styles.primaryText}>Buka tiket digital</Text></Pressable> : active && transferAvailable ? <Pressable disabled={Boolean(error)} onPress={() => router.push({ pathname: '/booking/[eventId]/transfer', params: { eventId, bookingId: booking.id, code: booking.booking_code } })} style={[styles.primary, error && styles.disabled]}><Text style={styles.primaryText}>{pending ? 'Lihat bukti & pemeriksaan' : 'Instruksi transfer & kirim bukti'}</Text></Pressable> : null}
      <Pressable disabled={refreshing} onPress={refresh} style={styles.secondary}><Text style={styles.secondaryText}>{refreshing ? 'Memeriksa...' : 'Periksa status lagi'}</Text></Pressable>
      <Pressable onPress={() => router.replace('/bookings')} style={styles.secondary}><Text style={styles.secondaryText}>Lihat semua pesanan</Text></Pressable>
    </ScrollView>
  </View></View>;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#D8D2C5', alignItems: 'center' }, page: { flex: 1, width: '100%', maxWidth: MaxContentWidth, backgroundColor: Palette.paper }, center: { flex: 1, backgroundColor: Palette.paper, alignItems: 'center', justifyContent: 'center', padding: 24 }, hero: { backgroundColor: Palette.ink, paddingHorizontal: 22, paddingBottom: 30, paddingTop: 18 }, heroPaid: { backgroundColor: Palette.success }, kicker: { color: Palette.gold, fontFamily: Fonts?.rounded, fontSize: 11, fontWeight: '900', letterSpacing: 1.2 }, heroTitle: { color: Palette.white, fontFamily: Fonts?.display, fontSize: 32, fontWeight: '900', marginTop: 8 }, heroText: { color: '#D5E4E1', fontFamily: Fonts?.sans, fontSize: 14, lineHeight: 22, marginTop: 10 }, content: { padding: 18, paddingBottom: 40, gap: 14 }, card: { borderRadius: Radius.large, backgroundColor: Palette.surface, borderWidth: 1, borderColor: '#E5DED1', padding: 20 }, codeLabel: { color: Palette.orange, fontFamily: Fonts?.rounded, fontSize: 11, fontWeight: '900', letterSpacing: 1 }, code: { color: Palette.ink, fontFamily: Fonts?.display, fontSize: 23, fontWeight: '900', marginTop: 7 }, amount: { fontFamily: Fonts?.display, color: Palette.orange, fontSize: 32, marginTop: 8, fontWeight: '800' }, divider: { height: 1, backgroundColor: Palette.line, marginVertical: 18 }, row: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, justifyContent: 'space-between', marginBottom: 12 }, meta: { color: Palette.muted, fontFamily: Fonts?.rounded, fontSize: 11, fontWeight: '900' }, value: { color: Palette.ink, fontFamily: Fonts?.rounded, fontSize: 13, fontWeight: '900' }, expiry: { color: Palette.orangeDark, fontFamily: Fonts?.sans, fontSize: 13, lineHeight: 20, marginTop: 7 }, notice: { borderRadius: Radius.medium, backgroundColor: Palette.gold, padding: 18 }, noticeTitle: { color: Palette.ink, fontFamily: Fonts?.rounded, fontSize: 17, fontWeight: '900' }, primary: { minHeight: 54, borderRadius: 16, backgroundColor: Palette.orange, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 18 }, primaryText: { color: Palette.white, fontFamily: Fonts?.rounded, fontSize: 14, fontWeight: '900' }, secondary: { minHeight: 48, borderRadius: 16, borderWidth: 1, borderColor: Palette.ink, alignItems: 'center', justifyContent: 'center', padding: 12 }, secondaryText: { color: Palette.ink, fontFamily: Fonts?.rounded, fontSize: 14, fontWeight: '900' }, title: { color: Palette.ink, fontFamily: Fonts?.display, fontSize: 27, fontWeight: '900' }, text: { color: Palette.inkSoft, fontFamily: Fonts?.sans, fontSize: 14, lineHeight: 22, marginTop: 8 }, disabled: { opacity: 0.5 },
});
