import { Href, useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Alert, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Fonts, MaxContentWidth, Palette, Radius } from '@/constants/theme';
import { useAuth } from '@/context/auth-context';
import { useUserBookings } from '@/hooks/use-user-bookings';
import { bookingStatusLabels as statusLabels, cancelRemoteBooking, UserBooking } from '@/services/booking-service';


export default function BookingsScreen() {
  const router = useRouter();
  const { session } = useAuth();
  const { data: items, refreshing: loading, error, refresh } = useUserBookings();
  const [cancelling, setCancelling] = useState<string | null>(null);

  const cancel = (booking: UserBooking) => {
    if (booking.paymentSubmitted) return Alert.alert('Pembayaran perlu ditinjau', 'Bukti transfer sudah dikirim. Hubungi pengelola sebelum membatalkan atau mengubah pesanan.');
    Alert.alert('Batalkan booking?', `Lapak ${booking.spot_number} akan tersedia kembali untuk pengguna lain.`, [
      { text: 'Tidak', style: 'cancel' },
      {
        text: 'Batalkan', style: 'destructive', onPress: async () => {
          setCancelling(booking.id);
          try { await cancelRemoteBooking(booking.id); await refresh(); }
          catch (cause) { Alert.alert('Gagal membatalkan', cause instanceof Error ? cause.message : 'Silakan coba kembali.'); }
          finally { setCancelling(null); }
        },
      },
    ]);
  };

  if (!session) return <SafeAreaView style={styles.empty}><Text style={styles.emptyTitle}>Silakan masuk terlebih dahulu</Text></SafeAreaView>;

  return (
    <View style={styles.screen}>
      <View style={styles.page}>
        <SafeAreaView edges={['top']} style={styles.headerSafe}>
          <View style={styles.header}><Pressable onPress={() => router.back()} style={styles.backButton}><Text style={styles.backText}>‹</Text></Pressable><View style={styles.headerCopy}><Text style={styles.kicker}>AKUN PEMANCING</Text><Text style={styles.title}>Pesanan saya</Text></View></View>
        </SafeAreaView>
        <ScrollView refreshControl={<RefreshControl refreshing={loading} onRefresh={refresh} tintColor={Palette.orange} />} contentContainerStyle={styles.content}>
          {error ? <Text style={{ color: Palette.orangeDark, fontSize: 14, lineHeight: 21, marginBottom: 14 }}>{error}</Text> : null}
          {loading ? <ActivityIndicator color={Palette.orange} size="large" /> : null}
          {!loading && items.length === 0 ? <View style={styles.emptyCard}><Text style={styles.emptyTitle}>Belum ada booking</Text><Text style={styles.emptyText}>Pilih event dan lapak untuk membuat pesanan pertama Anda.</Text><Pressable onPress={() => router.replace('/agenda')} style={styles.primaryButton}><Text style={styles.primaryText}>Lihat agenda</Text></Pressable></View> : null}
          {items.map((booking) => (
            <View key={booking.id} style={styles.bookingCard}>
              <View style={styles.topRow}><Text style={styles.status}>{statusLabels[booking.status]}</Text><Text style={styles.code}>{booking.booking_code}</Text></View>
              <Text style={styles.eventTitle}>{booking.events?.title ?? 'Event Pemancingan Adem Ayem'}</Text>
              <Text style={styles.meta}>Lapak {booking.spot_number} · {booking.participant_name}</Text>
              <View style={styles.bottomRow}><Text style={styles.amount}>Rp{booking.amount.toLocaleString('id-ID')}</Text><Text style={styles.date}>{new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium' }).format(new Date(booking.created_at))}</Text></View>
              {booking.status === 'awaiting_payment' ? <View style={styles.actionRow}><Pressable onPress={() => router.push(`/booking/${booking.event_id}/payment-status?bookingId=${booking.id}&code=${booking.booking_code}` as Href)} style={styles.statusButton}><Text style={styles.statusButtonText}>{booking.paymentSubmitted ? 'Lihat pemeriksaan bukti' : 'Bayar / lihat status'}</Text></Pressable>{!booking.paymentSubmitted ? <Pressable disabled={Boolean(cancelling)} onPress={() => cancel(booking)} style={styles.cancelButton}><Text style={styles.cancelText}>{cancelling === booking.id ? 'Memproses...' : 'Batalkan'}</Text></Pressable> : null}</View> : null}
              {booking.status === 'paid' || booking.status === 'confirmed' ? <Pressable onPress={() => router.push({ pathname: '/booking/[eventId]/ticket', params: { eventId: booking.event_id, bookingId: booking.id, code: booking.booking_code } })} style={styles.ticketButton}><Text style={styles.ticketButtonText}>Buka tiket digital</Text></Pressable> : null}
            </View>
          ))}
        </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#D8D2C5', alignItems: 'center' }, page: { flex: 1, width: '100%', maxWidth: MaxContentWidth, backgroundColor: Palette.paper }, headerSafe: { backgroundColor: Palette.ink }, header: { height: 76, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center' }, backButton: { width: 44, height: 44, borderRadius: 15, backgroundColor: Palette.inkSoft, alignItems: 'center', justifyContent: 'center' }, backText: { color: Palette.white, fontSize: 32 }, headerCopy: { paddingLeft: 13 }, kicker: { color: Palette.gold, fontFamily: Fonts?.rounded, fontSize: 8, fontWeight: '900', letterSpacing: 1.2 }, title: { color: Palette.white, fontFamily: Fonts?.display, fontSize: 25, fontWeight: '900' },
  content: { padding: 15, paddingBottom: 40 }, bookingCard: { borderRadius: Radius.large, backgroundColor: Palette.surface, padding: 16, borderWidth: 1, borderColor: '#E5DED1', marginBottom: 10 }, topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }, status: { color: Palette.orange, fontFamily: Fonts?.rounded, fontSize: 8, fontWeight: '900', textTransform: 'uppercase' }, code: { color: Palette.muted, fontFamily: Fonts?.mono, fontSize: 8 }, eventTitle: { color: Palette.ink, fontFamily: Fonts?.display, fontSize: 21, fontWeight: '900', marginTop: 10 }, meta: { color: Palette.inkSoft, fontFamily: Fonts?.sans, fontSize: 10, marginTop: 3 }, bottomRow: { borderTopWidth: 1, borderTopColor: Palette.line, marginTop: 13, paddingTop: 11, flexDirection: 'row', justifyContent: 'space-between' }, amount: { color: Palette.ink, fontFamily: Fonts?.rounded, fontSize: 11, fontWeight: '900' }, date: { color: Palette.muted, fontFamily: Fonts?.sans, fontSize: 9 }, actionRow: { flexDirection: 'row', gap: 7, marginTop: 12 }, statusButton: { flex: 1, borderRadius: 12, backgroundColor: Palette.ink, alignItems: 'center', padding: 10 }, statusButtonText: { color: Palette.white, fontFamily: Fonts?.rounded, fontSize: 8, fontWeight: '900' }, cancelButton: { borderRadius: 12, backgroundColor: '#FFF0EB', alignItems: 'center', paddingHorizontal: 13, paddingVertical: 10 }, cancelText: { color: Palette.orangeDark, fontFamily: Fonts?.rounded, fontSize: 8, fontWeight: '900' }, ticketButton: { marginTop: 12, borderRadius: 12, backgroundColor: Palette.success, alignItems: 'center', padding: 11 }, ticketButtonText: { color: Palette.white, fontFamily: Fonts?.rounded, fontSize: 9, fontWeight: '900' },
  empty: { flex: 1, backgroundColor: Palette.paper, alignItems: 'center', justifyContent: 'center' }, emptyCard: { borderRadius: Radius.large, backgroundColor: Palette.surface, padding: 24, alignItems: 'center' }, emptyTitle: { color: Palette.ink, fontFamily: Fonts?.display, fontSize: 24, fontWeight: '900' }, emptyText: { color: Palette.muted, fontFamily: Fonts?.sans, fontSize: 10, textAlign: 'center', marginTop: 5 }, primaryButton: { backgroundColor: Palette.orange, borderRadius: 13, paddingHorizontal: 17, paddingVertical: 12, marginTop: 16 }, primaryText: { color: Palette.white, fontFamily: Fonts?.rounded, fontSize: 10, fontWeight: '900' },
});
