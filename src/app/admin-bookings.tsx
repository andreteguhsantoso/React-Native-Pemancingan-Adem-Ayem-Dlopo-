import { useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Fonts, MaxContentWidth, Palette, Radius } from '@/constants/theme';
import { useAuth } from '@/context/auth-context';
import type { BookingStatus } from '@/lib/database.types';
import { requireSupabase } from '@/lib/supabase';
import { useFocusResource } from '@/hooks/use-focus-resource';
import { effectiveBookingStatus } from '@/lib/domain';

type EventOption = {
  id: string;
  title: string;
  starts_at: string;
  total_spots: number;
};

type BuyerProfile = {
  username: string | null;
  full_name: string;
  phone: string | null;
};

type AdminBooking = {
  id: string;
  booking_code: string;
  user_id: string;
  spot_number: number;
  participant_name: string;
  participant_phone: string;
  amount: number;
  status: BookingStatus;
  expires_at: string | null;
  created_at: string;
  profiles: BuyerProfile | null;
};

const statusLabels: Record<BookingStatus, string> = {
  awaiting_payment: 'Ditahan, menunggu pembayaran',
  paid: 'Sudah dibayar',
  confirmed: 'Terkonfirmasi',
  cancelled: 'Dibatalkan',
  expired: 'Kedaluwarsa',
};

function isHeld(booking: AdminBooking) {
  return booking.status === 'awaiting_payment' && Boolean(booking.expires_at);
}

function isSold(booking: AdminBooking) {
  return booking.status === 'paid' || booking.status === 'confirmed';
}

function formatEventDate(value: string) {
  return new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium', timeZone: 'Asia/Jakarta' }).format(new Date(value));
}

export default function AdminBookingsScreen() {
  const router = useRouter();
  const { profile } = useAuth();
  const isStaff = profile?.role === 'admin' || profile?.role === 'operator';
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [selectedBookingId, setSelectedBookingId] = useState<string | null>(null);
  const [selectedSpot, setSelectedSpot] = useState<number | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('active');

  const loadInventory = useCallback(async () => {
    const client = requireSupabase();
    const expiration = await client.rpc('refresh_booking_expirations');
    if (expiration.error && expiration.error.code !== 'PGRST202') throw new Error(expiration.error.message);
    const { data: eventData, error: eventError } = await client
      .from('events')
      .select('id,title,starts_at,total_spots')
      .order('starts_at', { ascending: true });
    if (eventError) throw new Error(eventError.message);
    const nextEvents = (eventData ?? []) as EventOption[];
    const eventId = selectedEventId && nextEvents.some((item) => item.id === selectedEventId)
      ? selectedEventId
      : (nextEvents.find((item) => new Date(item.starts_at).getTime() >= Date.now()) ?? nextEvents.at(-1))?.id ?? null;
    if (!eventId) {
      return { events: nextEvents, bookings: [] as AdminBooking[], eventId: null };
    }
    const { data, error: bookingError } = await client
      .from('bookings')
      .select('id,booking_code,user_id,spot_number,participant_name,participant_phone,amount,status,expires_at,created_at,profiles!bookings_user_id_fkey(username,full_name,phone)')
      .eq('event_id', eventId)
      .order('created_at', { ascending: false });
    if (bookingError) throw new Error(bookingError.message);
    const nextBookings = ((data ?? []) as unknown as AdminBooking[]).map((item) => ({ ...item, status: effectiveBookingStatus(item.status, item.expires_at) as BookingStatus }));
    return { events: nextEvents, bookings: nextBookings, eventId };
  }, [selectedEventId]);
  const { data: inventory, refreshing: loading, error, refresh, updatedAt } = useFocusResource(loadInventory, { events: [] as EventOption[], bookings: [] as AdminBooking[], eventId: null as string | null }, isStaff, 15000);
  const events = inventory.events;
  const switching = Boolean(selectedEventId && inventory.eventId !== selectedEventId);
  const bookings = switching ? [] : inventory.bookings;
  const selectedBooking = bookings.find((item) => item.id === selectedBookingId) ?? null;

  const chooseEvent = (eventId: string) => {
    setSelectedEventId(eventId);
    setSelectedBookingId(null); setSelectedSpot(null);
  };

  if (!isStaff) {
    return <SafeAreaView style={styles.denied}><Text style={styles.deniedTitle}>Akses khusus pengelola</Text><Pressable onPress={() => router.replace('/profile')} style={styles.primaryButton}><Text style={styles.primaryText}>Kembali ke profil</Text></Pressable></SafeAreaView>;
  }

  const selectedEvent = switching ? null : events.find((item) => item.id === inventory.eventId) ?? null;
  const activeBookings = bookings.filter((booking) => isHeld(booking) || isSold(booking));
  const spotBookings = new Map<number, AdminBooking>();
  activeBookings.forEach((booking) => {
    if (!spotBookings.has(booking.spot_number)) spotBookings.set(booking.spot_number, booking);
  });
  const heldCount = [...spotBookings.values()].filter(isHeld).length;
  const soldCount = [...spotBookings.values()].filter(isSold).length;
  const totalSpots = selectedEvent?.total_spots ?? 0;
  const availableCount = Math.max(0, totalSpots - heldCount - soldCount);
  const visibleBookings = bookings.filter((item) => {
    const statusMatch = statusFilter === 'all' || (statusFilter === 'active' ? isHeld(item) || isSold(item) : item.status === statusFilter);
    return statusMatch && `${item.spot_number} ${item.booking_code} ${item.participant_name} ${item.profiles?.username ?? ''}`.toLowerCase().includes(search.trim().toLowerCase());
  });

  return <View style={styles.screen}><View style={styles.page}>
    <SafeAreaView edges={['top']} style={styles.headerSafe}><View style={styles.header}>
      <Pressable onPress={() => router.back()} style={styles.backButton}><Text style={styles.backText}>‹</Text></Pressable>
      <View style={styles.headerCopy}><Text style={styles.kicker}>KONTROL PENJUALAN</Text><Text style={styles.headerTitle}>Inventaris lapak</Text></View>
      <View style={styles.liveBadge}><Text style={styles.liveText}>15 DETIK</Text></View>
    </View></SafeAreaView>

    <ScrollView
      refreshControl={<RefreshControl refreshing={loading} onRefresh={refresh} tintColor={Palette.orange} colors={[Palette.orange]} />}
      contentContainerStyle={styles.content}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.eventRow}>
        {events.map((event) => <Pressable key={event.id} onPress={() => chooseEvent(event.id)} style={[styles.eventChip, inventory.eventId === event.id && styles.eventChipActive]}><Text style={[styles.eventChipTitle, inventory.eventId === event.id && styles.eventChipTitleActive]}>{event.title}</Text><Text style={[styles.eventChipDate, inventory.eventId === event.id && styles.eventChipDateActive]}>{formatEventDate(event.starts_at)} · {event.total_spots} lapak</Text></Pressable>)}
      </ScrollView>
      {loading ? <ActivityIndicator color={Palette.orange} /> : null}
      {updatedAt ? <Text style={{ fontSize: 12, color: Palette.muted, paddingHorizontal: 16, paddingBottom: 12 }}>Diperbarui {new Date(updatedAt).toLocaleTimeString('id-ID')} · Otomatis setiap 15 detik saat halaman dibuka</Text> : null}

      {error ? <View style={styles.errorCard}><Text style={styles.errorTitle}>Inventaris belum tersinkron</Text><Text style={styles.errorText}>{error}</Text></View> : null}
      {!loading && events.length === 0 ? <View style={styles.emptyCard}><Text style={styles.emptyTitle}>Belum ada event</Text><Text style={styles.emptyText}>Buat event terlebih dahulu sebelum memantau lapak.</Text></View> : null}

      {selectedEvent ? <>
        <View style={styles.summaryRow}>
          <Summary value={availableCount} label="KOSONG" color={Palette.mint} />
          <Summary value={heldCount} label="DITAHAN" color={Palette.gold} />
          <Summary value={soldCount} label="TERJUAL" color={Palette.sky} />
        </View>
        <View style={styles.sectionHeading}><View><Text style={styles.sectionKicker}>PETA KETERSEDIAAN</Text><Text style={styles.sectionTitle}>{selectedEvent.title}</Text></View><Text style={styles.capacity}>{totalSpots} LAPAK</Text></View>
        <View style={styles.legend}><Legend color={Palette.mint} label="Kosong" /><Legend color={Palette.gold} label="Ditahan" /><Legend color={Palette.ink} label="Terjual" /></View>
        <View style={styles.spotGrid}>
          {Array.from({ length: totalSpots }, (_, index) => index + 1).map((spot) => {
            const booking = spotBookings.get(spot);
            const sold = booking ? isSold(booking) : false;
            const held = booking ? isHeld(booking) : false;
            const selected = selectedSpot === spot;
            return <Pressable accessibilityLabel={`Lapak ${spot}, ${sold ? 'terjual' : held ? 'ditahan' : 'kosong'}`} key={spot} onPress={() => { setSelectedSpot(spot); setSelectedBookingId(booking?.id ?? null); }} style={[styles.spot, held && styles.spotHeld, sold && styles.spotSold, selected && styles.spotSelected]}><Text style={[styles.spotText, sold && styles.spotTextSold]}>{spot}</Text></Pressable>;
          })}
        </View>

        {selectedBooking ? <View style={styles.detailCard}>
          <View style={styles.detailTop}><View><Text style={styles.detailKicker}>LAPAK {selectedBooking.spot_number} · {statusLabels[selectedBooking.status].toUpperCase()}</Text><Text style={styles.detailName}>{selectedBooking.participant_name}</Text></View><Text style={styles.detailAmount}>Rp{selectedBooking.amount.toLocaleString('id-ID')}</Text></View>
          <Detail label="AKUN" value={selectedBooking.profiles?.username ? `@${selectedBooking.profiles.username}` : selectedBooking.profiles?.full_name || 'Akun pengguna'} />
          <Detail label="WHATSAPP" value={selectedBooking.participant_phone || selectedBooking.profiles?.phone || '-'} />
          <Detail label="KODE BOOKING" value={selectedBooking.booking_code} />
          <Detail label="DIPESAN" value={new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(selectedBooking.created_at))} />
        </View> : <View style={styles.hintCard}><Text style={styles.hintTitle}>{selectedSpot ? `Lapak ${selectedSpot} masih kosong` : 'Ketuk lapak untuk melihat status dan pembeli'}</Text><Text style={styles.hintText}>Lapak hijau tersedia. Data pembeli hanya terlihat oleh pengelola.</Text></View>}
        <View style={{ padding: 16, gap: 12 }}>
          <Text style={styles.sectionTitle}>Cari pemesan & riwayat</Text>
          <TextInput accessibilityLabel="Cari nama, username, nomor lapak, atau kode booking" value={search} onChangeText={setSearch} placeholder="Nama, @username, lapak, kode booking" style={{ minHeight: 50, padding: 14, borderRadius: 14, backgroundColor: Palette.surface, color: Palette.ink, fontSize: 14 }} />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>{[['active', 'Aktif'], ['paid', 'Lunas'], ['confirmed', 'Dikonfirmasi'], ['awaiting_payment', 'Ditahan'], ['expired', 'Kedaluwarsa'], ['cancelled', 'Batal'], ['all', 'Semua']].map(([key, label]) => <Pressable key={key} onPress={() => setStatusFilter(key)} style={{ minHeight: 44, padding: 12, borderRadius: 12, backgroundColor: statusFilter === key ? Palette.ink : Palette.mint }}><Text style={{ fontSize: 13, color: statusFilter === key ? Palette.white : Palette.ink }}>{label}</Text></Pressable>)}</ScrollView>
          <Text style={{ color: Palette.muted, fontSize: 13 }}>{visibleBookings.length} pesanan ditemukan</Text>
          {visibleBookings.map((item) => <Pressable key={item.id} onPress={() => { setSelectedBookingId(item.id); setSelectedSpot(item.spot_number); }} style={{ padding: 14, borderRadius: 16, backgroundColor: Palette.surface, gap: 5 }}><Text style={{ fontSize: 16, color: Palette.ink, fontWeight: '800' }}>Lapak {item.spot_number} · {item.participant_name}</Text><Text style={{ fontSize: 13, color: Palette.inkSoft }}>{item.profiles?.username ? `@${item.profiles.username} · ` : ''}{item.booking_code}</Text><Text style={{ fontSize: 12, color: Palette.orangeDark }}>{statusLabels[item.status]}</Text></Pressable>)}
        </View>
      </> : null}
    </ScrollView>
  </View></View>;
}

function Summary({ value, label, color }: { value: number; label: string; color: string }) {
  return <View style={[styles.summaryCard, { backgroundColor: color }]}><Text style={styles.summaryValue}>{value}</Text><Text style={styles.summaryLabel}>{label}</Text></View>;
}

function Legend({ color, label }: { color: string; label: string }) {
  return <View style={styles.legendItem}><View style={[styles.legendDot, { backgroundColor: color }]} /><Text style={styles.legendText}>{label}</Text></View>;
}

function Detail({ label, value }: { label: string; value: string }) {
  return <View style={styles.detailRow}><Text style={styles.detailLabel}>{label}</Text><Text selectable style={styles.detailValue}>{value}</Text></View>;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#D8D2C5', alignItems: 'center' },
  page: { flex: 1, width: '100%', maxWidth: MaxContentWidth, backgroundColor: Palette.paper },
  headerSafe: { backgroundColor: Palette.ink },
  header: { height: 78, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center' },
  backButton: { width: 44, height: 44, borderRadius: 15, backgroundColor: Palette.inkSoft, alignItems: 'center', justifyContent: 'center' },
  backText: { color: Palette.white, fontSize: 32 },
  headerCopy: { flex: 1, paddingHorizontal: 13 },
  kicker: { color: Palette.gold, fontFamily: Fonts?.rounded, fontSize: 8, fontWeight: '900', letterSpacing: 1.2 },
  headerTitle: { color: Palette.white, fontFamily: Fonts?.display, fontSize: 25, fontWeight: '900' },
  liveBadge: { borderRadius: 9, backgroundColor: Palette.orange, paddingHorizontal: 9, paddingVertical: 6 },
  liveText: { color: Palette.white, fontFamily: Fonts?.rounded, fontSize: 7, fontWeight: '900', letterSpacing: 1 },
  content: { paddingBottom: 50 },
  eventRow: { padding: 15, gap: 8 },
  eventChip: { width: 190, borderRadius: 16, backgroundColor: Palette.surface, borderWidth: 1, borderColor: '#E5DED1', padding: 12 },
  eventChipActive: { backgroundColor: Palette.ink, borderColor: Palette.ink },
  eventChipTitle: { color: Palette.ink, fontFamily: Fonts?.rounded, fontSize: 10, fontWeight: '900' },
  eventChipTitleActive: { color: Palette.white },
  eventChipDate: { color: Palette.muted, fontFamily: Fonts?.sans, fontSize: 8, marginTop: 4 },
  eventChipDateActive: { color: '#B9CFCC' },
  errorCard: { marginHorizontal: 15, borderRadius: 14, backgroundColor: '#FFF0EB', borderWidth: 1, borderColor: '#F3B9A8', padding: 13 },
  errorTitle: { color: Palette.orangeDark, fontFamily: Fonts?.rounded, fontSize: 10, fontWeight: '900' },
  errorText: { color: Palette.inkSoft, fontFamily: Fonts?.sans, fontSize: 8, marginTop: 3 },
  emptyCard: { margin: 15, borderRadius: Radius.large, backgroundColor: Palette.surface, padding: 24, alignItems: 'center' },
  emptyTitle: { color: Palette.ink, fontFamily: Fonts?.display, fontSize: 23, fontWeight: '900' },
  emptyText: { color: Palette.muted, fontFamily: Fonts?.sans, fontSize: 9, marginTop: 4 },
  summaryRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 15, marginTop: 2 },
  summaryCard: { flex: 1, minHeight: 82, borderRadius: 18, padding: 13, justifyContent: 'space-between' },
  summaryValue: { color: Palette.ink, fontFamily: Fonts?.display, fontSize: 28, fontWeight: '900' },
  summaryLabel: { color: Palette.inkSoft, fontFamily: Fonts?.rounded, fontSize: 7, fontWeight: '900', letterSpacing: 0.8 },
  sectionHeading: { paddingHorizontal: 17, marginTop: 24, marginBottom: 11, flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' },
  sectionKicker: { color: Palette.orange, fontFamily: Fonts?.rounded, fontSize: 8, fontWeight: '900', letterSpacing: 1.1 },
  sectionTitle: { color: Palette.ink, fontFamily: Fonts?.display, fontSize: 22, fontWeight: '900', marginTop: 2, maxWidth: 290 },
  capacity: { color: Palette.muted, fontFamily: Fonts?.rounded, fontSize: 8, fontWeight: '900' },
  legend: { marginHorizontal: 15, borderRadius: 13, backgroundColor: Palette.surface, padding: 11, flexDirection: 'row', justifyContent: 'center', gap: 18 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  legendDot: { width: 10, height: 10, borderRadius: 4 },
  legendText: { color: Palette.inkSoft, fontFamily: Fonts?.rounded, fontSize: 7, fontWeight: '800' },
  spotGrid: { margin: 15, marginTop: 10, borderRadius: Radius.large, backgroundColor: '#E8E7DE', padding: 13, flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
  spot: { width: 44, height: 44, borderRadius: 12, backgroundColor: Palette.mint, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: Palette.white },
  spotHeld: { backgroundColor: Palette.gold },
  spotSold: { backgroundColor: Palette.ink, borderColor: Palette.inkSoft },
  spotSelected: { borderColor: Palette.orange, borderWidth: 3, transform: [{ scale: 1.08 }] },
  spotText: { color: Palette.ink, fontFamily: Fonts?.rounded, fontSize: 8, fontWeight: '900' },
  spotTextSold: { color: Palette.white },
  detailCard: { marginHorizontal: 15, borderRadius: Radius.large, backgroundColor: Palette.surface, borderWidth: 1, borderColor: '#E5DED1', padding: 16 },
  detailTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', paddingBottom: 13, borderBottomWidth: 1, borderBottomColor: Palette.line },
  detailKicker: { color: Palette.orange, fontFamily: Fonts?.rounded, fontSize: 7, fontWeight: '900' },
  detailName: { color: Palette.ink, fontFamily: Fonts?.display, fontSize: 22, fontWeight: '900', marginTop: 3 },
  detailAmount: { color: Palette.ink, fontFamily: Fonts?.rounded, fontSize: 11, fontWeight: '900' },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 12, marginTop: 12 },
  detailLabel: { color: Palette.muted, fontFamily: Fonts?.rounded, fontSize: 7, fontWeight: '900' },
  detailValue: { flex: 1, color: Palette.ink, fontFamily: Fonts?.sans, fontSize: 9, textAlign: 'right' },
  hintCard: { marginHorizontal: 15, borderRadius: Radius.medium, backgroundColor: Palette.gold, padding: 15 },
  hintTitle: { color: Palette.ink, fontFamily: Fonts?.rounded, fontSize: 10, fontWeight: '900' },
  hintText: { color: Palette.inkSoft, fontFamily: Fonts?.sans, fontSize: 8, marginTop: 3 },
  denied: { flex: 1, backgroundColor: Palette.paper, alignItems: 'center', justifyContent: 'center', padding: 24 },
  deniedTitle: { color: Palette.ink, fontFamily: Fonts?.display, fontSize: 25, fontWeight: '900' },
  primaryButton: { marginTop: 15, backgroundColor: Palette.orange, borderRadius: 13, paddingHorizontal: 16, paddingVertical: 12 },
  primaryText: { color: Palette.white, fontFamily: Fonts?.rounded, fontSize: 9, fontWeight: '900' },
});
