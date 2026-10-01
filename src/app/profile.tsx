import { MediaImage as Image } from '@/components/media-image';
import { Href, useRouter } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useState } from 'react';
import { ActivityIndicator, Alert, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BottomTabInset, Fonts, MaxContentWidth, Palette, Radius } from '@/constants/theme';
import { useAuth } from '@/context/auth-context';
import { useVenue } from '@/context/venue-context';
import { formatRupiah } from '@/data/events';
import { publicMediaUrl } from '@/services/media-service';
import { useUserBookings } from '@/hooks/use-user-bookings';
import { isSold } from '@/lib/domain';

const menuIcons = {
  ticket: { ios: 'ticket.fill', android: 'confirmation_number', web: 'confirmation_number' },
  history: { ios: 'clock.arrow.circlepath', android: 'history', web: 'history' },
  identity: { ios: 'person.text.rectangle', android: 'badge', web: 'badge' },
  notification: { ios: 'bell.fill', android: 'notifications', web: 'notifications' },
  help: { ios: 'questionmark.circle.fill', android: 'help', web: 'help' },
  rules: { ios: 'leaf.fill', android: 'eco', web: 'eco' },
} as const;

type ProfileSection = keyof typeof menuIcons;

type ProfileMenuRowProps = {
  icon: ProfileSection;
  title: string;
  subtitle: string;
  active: boolean;
  onPress: () => void;
};

function ProfileMenuRow({ icon, title, subtitle, active, onPress }: ProfileMenuRowProps) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.menuRow, active && styles.menuRowActive, pressed && styles.pressed]}>
      <View style={[styles.menuIcon, active && styles.menuIconActive]}>
        <SymbolView name={menuIcons[icon]} tintColor={active ? Palette.white : Palette.ink} size={20} />
      </View>
      <View style={styles.menuCopy}>
        <Text style={styles.menuTitle}>{title}</Text>
        <Text style={styles.menuSubtitle}>{subtitle}</Text>
      </View>
      <Text style={[styles.menuArrow, active && styles.menuArrowActive]}>{active ? '−' : '›'}</Text>
    </Pressable>
  );
}

export default function ProfileScreen() {
  const router = useRouter();
  const { data: bookings, refreshing, error: bookingError, refresh, updatedAt } = useUserBookings();
  const { venue } = useVenue();
  const { loading, profile, requestAccountDeletion, session, signOut } = useAuth();
  const [openSection, setOpenSection] = useState<ProfileSection | null>('ticket');
  const paidBookings = bookings.filter((item) => isSold(item.status));
  const activeTickets = paidBookings.filter((item) => item.events && new Date(item.events.ends_at).getTime() > (updatedAt ?? 0));
  const activeTicket = activeTickets[0];
  const activeEvent = activeTicket?.events;
  const hasActiveTicket = Boolean(activeTicket);
  const eventCount = new Set(paidBookings.map((item) => item.event_id)).size;
  const pendingCount = bookings.filter((item) => item.status === 'awaiting_payment').length;
  const shortDate = activeEvent ? new Intl.DateTimeFormat('id-ID', { day: '2-digit', month: 'short', timeZone: 'Asia/Jakarta' }).format(new Date(activeEvent.starts_at)).toUpperCase().split(' ') : ['-', '-'];
  const displayName = profile?.full_name || session?.user.email?.split('@')[0] || 'Pemancing';
  const displayPhone = profile?.phone ? `+62 ${profile.phone.replace(/^0|^62/, '')}` : session?.user.email || '';
  const initials = displayName.split(/\s+/).slice(0, 2).map((part) => part[0]?.toUpperCase()).join('');
  const isStaff = profile?.role === 'admin' || profile?.role === 'operator';
  const avatarUrl = publicMediaUrl('avatars', profile?.avatar_path ?? null);

  const toggleSection = (section: ProfileSection) => {
    setOpenSection((current) => (current === section ? null : section));
  };

  const openTicket = () => {
    if (activeTicket) {
      router.push({ pathname: '/booking/[eventId]/ticket', params: { eventId: activeTicket.event_id, bookingId: activeTicket.id, code: activeTicket.booking_code } });
      return;
    }
    router.push('/agenda');
  };

  const openBookings = () => router.push('/bookings' as Href);

  const logout = () => {
    Alert.alert('Keluar dari akun?', 'Anda tetap dapat melihat jadwal dan galeri sebagai tamu.', [
      { text: 'Batal', style: 'cancel' },
      {
        text: 'Keluar',
        style: 'destructive',
        onPress: () => signOut().catch((error) => Alert.alert('Gagal keluar', error.message)),
      },
    ]);
  };

  const askForAccountDeletion = () => {
    Alert.alert(
      'Ajukan penghapusan akun?',
      'Permintaan akan ditinjau pengelola. Akun tidak langsung dihapus dan Anda tetap dapat masuk sampai proses selesai.',
      [
        { text: 'Batal', style: 'cancel' },
        {
          text: 'Ajukan',
          style: 'destructive',
          onPress: () => requestAccountDeletion()
            .then(() => Alert.alert('Permintaan diterima', 'Pengelola akan memproses permintaan dan menghubungi Anda bila diperlukan.'))
            .catch((error) => Alert.alert('Permintaan belum terkirim', error.message)),
        },
      ],
    );
  };

  if (loading) {
    return <View style={styles.loadingScreen}><ActivityIndicator color={Palette.orange} size="large" /></View>;
  }

  if (!session) {
    return (
      <View style={styles.screen}>
        <SafeAreaView edges={['top']} style={styles.guestSafeArea}>
          <View style={styles.guestHero}>
            <Text style={styles.eyebrow}>MODE TAMU</Text>
            <Text style={styles.guestTitle}>Jelajahi dulu, masuk saat siap memesan.</Text>
            <Text style={styles.guestText}>Jadwal, berita, galeri, leaderboard, dan lokasi dapat dilihat tanpa akun. Login hanya diperlukan untuk booking dan mengirim foto.</Text>
            <Pressable onPress={() => router.push('/auth' as Href)} style={styles.guestLoginButton}>
              <Text style={styles.guestLoginText}>Masuk atau daftar</Text>
              <Text style={styles.guestLoginArrow}>→</Text>
            </Pressable>
          </View>
          <View style={styles.guestBenefits}>
            <Text style={styles.sectionEyebrow}>MANFAAT AKUN</Text>
            <Text style={styles.sectionTitle}>Semua tiket dalam satu tempat</Text>
            <View style={styles.guestBenefitCard}>
              <Text style={styles.guestBenefitTitle}>Booking lapak dengan aman</Text>
              <Text style={styles.guestBenefitText}>Pilihan lapak tersimpan online dan terlindung dari pemesanan ganda.</Text>
            </View>
            <View style={styles.guestBenefitCard}>
              <Text style={styles.guestBenefitTitle}>Riwayat dan tiket digital</Text>
              <Text style={styles.guestBenefitText}>Periksa status pembayaran dan tampilkan kode booking saat tiba.</Text>
            </View>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <SafeAreaView edges={['top']} style={styles.safeArea}>
        <ScrollView showsVerticalScrollIndicator={false} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={Palette.orange} />} contentContainerStyle={styles.content}>
          <View style={styles.hero}>
            <View style={styles.heroCircleOne} />
            <View style={styles.heroCircleTwo} />
            <View style={styles.topBar}>
              <View>
                <Text style={styles.eyebrow}>AKUN PEMANCING</Text>
                <Text style={styles.pageTitle}>Profil saya.</Text>
              </View>
              <Pressable onPress={() => router.push('/profile-edit' as Href)} style={styles.settingsButton}>
                <SymbolView
                  name={{ ios: 'gearshape.fill', android: 'settings', web: 'settings' }}
                  tintColor={Palette.gold}
                  size={23}
                />
              </Pressable>
            </View>

            <View style={styles.identityRow}>
              <View style={styles.avatarWrap}>
                <View style={styles.avatar}>
                  {avatarUrl ? <Image source={{ uri: avatarUrl }} contentFit="cover" style={styles.avatarImage} /> : <Text style={styles.avatarText}>{initials || 'PA'}</Text>}
                </View>
                <View style={styles.verifiedMark}>
                  <Text style={styles.verifiedCheck}>✓</Text>
                </View>
              </View>
              <View style={styles.identityCopy}>
                <Text style={styles.profileName}>{displayName}</Text>
                <Text style={styles.profilePhone}>{displayPhone}</Text>
                <View style={styles.locationPill}>
                  <SymbolView
                    name={{ ios: 'location.fill', android: 'location_on', web: 'location_on' }}
                    tintColor={Palette.gold}
                    size={12}
                  />
                  <Text style={styles.locationText}>Kediri, Jawa Timur</Text>
                </View>
              </View>
            </View>
          </View>

          <View style={styles.statsCard}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{activeTickets.length}</Text>
              <Text style={styles.statLabel}>TIKET AKTIF</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{eventCount}</Text>
              <Text style={styles.statLabel}>EVENT DIBAYAR</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{bookings.length}</Text>
              <Text style={styles.statLabel}>PESANAN</Text>
            </View>
          </View>

          {bookingError ? <Text style={{ color: Palette.orangeDark, fontSize: 14, lineHeight: 21, padding: 18 }}>Pesanan belum tersinkron: {bookingError}</Text> : null}
          {pendingCount ? <Pressable onPress={openBookings} style={styles.adminButton}><Text style={{ color: Palette.white, fontSize: 14 }}>{pendingCount} reservasi belum dibayar. Lihat status pesanan →</Text></Pressable> : null}
          <View style={styles.ticketSection}>
            <View style={styles.sectionHeading}>
              <View>
                <Text style={styles.sectionEyebrow}>AKSES CEPAT</Text>
                <Text style={styles.sectionTitle}>Tiket aktif</Text>
              </View>
              <Text style={styles.ticketCount}>{hasActiveTicket ? `${activeTickets.length} TIKET` : 'KOSONG'}</Text>
            </View>

            <Pressable onPress={openTicket} style={({ pressed }) => [styles.ticketCard, pressed && styles.pressed]}>
              <View style={styles.ticketAccent} />
              <View style={styles.ticketTop}>
                <View style={styles.ticketDateBlock}>
                  <Text style={styles.ticketDate}>{shortDate[0]}</Text>
                  <Text style={styles.ticketMonth}>{shortDate[1]}</Text>
                </View>
                <View style={styles.ticketCopy}>
                  <Text style={styles.ticketEyebrow}>{hasActiveTicket ? 'SIAP DIGUNAKAN' : 'BELUM ADA PEMESANAN'}</Text>
                  <Text numberOfLines={1} style={styles.ticketTitle}>{activeEvent?.title ?? 'Pesan tiket event pertamamu'}</Text>
                  <Text style={styles.ticketMeta}>
                    {hasActiveTicket ? `Lapak ${activeTicket.spot_number} · ${new Date(activeEvent!.starts_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Jakarta' })} WIB` : 'Pilih event dan lapak yang tersedia'}
                  </Text>
                </View>
                <View style={styles.ticketArrowButton}>
                  <Text style={styles.ticketArrow}>→</Text>
                </View>
              </View>
              <View style={styles.ticketTearLine}>
                <View style={styles.ticketHoleLeft} />
                <View style={styles.dashes} />
                <View style={styles.ticketHoleRight} />
              </View>
              <View style={styles.ticketBottom}>
                <Text style={styles.ticketCode}>{activeTicket?.booking_code ?? 'PILIH EVENT'}</Text>
                <Text style={styles.ticketPrice}>{activeTicket ? formatRupiah(activeTicket.amount) : 'Lihat agenda'}</Text>
              </View>
            </Pressable>
          </View>

          <View style={styles.accountSection}>
            <View style={styles.sectionHeading}>
              <View>
                <Text style={styles.sectionEyebrow}>PUSAT AKUN</Text>
                <Text style={styles.sectionTitle}>Informasi & bantuan</Text>
              </View>
            </View>

            <View style={styles.menuCard}>
              <ProfileMenuRow icon="ticket" title="Pesanan saya" subtitle="Tiket aktif dan status pembayaran" active={openSection === 'ticket'} onPress={() => toggleSection('ticket')} />
              {openSection === 'ticket' ? (
                <View style={styles.detailPanel}>
                  <Text style={styles.detailTitle}>{hasActiveTicket ? 'Pembayaran berhasil' : 'Belum ada tiket aktif'}</Text>
                  <Text style={styles.detailText}>{hasActiveTicket ? `${activeEvent?.title}, lapak ${activeTicket.spot_number}. Tunjukkan tiket digital kepada operator saat datang.` : 'Reservasi yang belum dibayar tidak termasuk tiket aktif. Periksa pesanan untuk melihat status terbaru.'}</Text>
                  <Pressable onPress={openTicket} style={styles.inlineButton}>
                    <Text style={styles.inlineButtonText}>{hasActiveTicket ? 'Buka tiket digital' : 'Lihat jadwal event'}</Text>
                  </Pressable>
                  <Pressable onPress={openBookings} style={styles.historyButton}>
                    <Text style={styles.historyButtonText}>Lihat semua pesanan</Text>
                  </Pressable>
                </View>
              ) : null}

              <ProfileMenuRow icon="history" title="Riwayat event" subtitle={`${eventCount} event dengan tiket dibayar`} active={openSection === 'history'} onPress={() => toggleSection('history')} />
              {openSection === 'history' ? (
                <View style={styles.detailPanel}>
                  <Text style={styles.detailTitle}>{paidBookings[0]?.events?.title ?? 'Belum ada event yang dibayar'}</Text>
                  <Text style={styles.detailText}>{paidBookings[0] ? `Lapak ${paidBookings[0].spot_number} · ${paidBookings[0].booking_code}` : 'Riwayat akan terisi otomatis dari pesanan akun ini.'}</Text>
                </View>
              ) : null}

              <ProfileMenuRow icon="identity" title="Data diri" subtitle="Nama, telepon, dan domisili" active={openSection === 'identity'} onPress={() => toggleSection('identity')} />
              {openSection === 'identity' ? (
                <View style={styles.detailPanel}>
                  <Text style={styles.detailTitle}>{displayName}</Text>
                  <Text style={styles.detailText}>{displayPhone} · Data ini digunakan pada tiket pemesanan.</Text>
                </View>
              ) : null}

              <ProfileMenuRow icon="notification" title="Notifikasi" subtitle="Pengingat event dan pembayaran" active={openSection === 'notification'} onPress={() => toggleSection('notification')} />
              {openSection === 'notification' ? (
                <View style={styles.detailPanel}>
                  <Text style={styles.detailTitle}>Pantau informasi terbaru</Text>
                  <Text style={styles.detailText}>Periksa halaman pesanan dan berita untuk batas pembayaran atau perubahan jadwal. Notifikasi otomatis HP belum diaktifkan.</Text>
                </View>
              ) : null}

              <ProfileMenuRow icon="help" title="Bantuan operator" subtitle="Pertanyaan tiket dan lokasi" active={openSection === 'help'} onPress={() => toggleSection('help')} />
              {openSection === 'help' ? (
                <View style={styles.detailPanel}>
                  <Text style={styles.detailTitle}>Operator pemancingan</Text>
                  <Text style={styles.detailText}>Hubungi operator di lokasi untuk perubahan nama peserta, konfirmasi pembayaran, atau kendala tiket.</Text>
                </View>
              ) : null}

              <ProfileMenuRow icon="rules" title="Aturan kolam" subtitle="Ketentuan umpan dan ketertiban" active={openSection === 'rules'} onPress={() => toggleSection('rules')} />
              {openSection === 'rules' ? (
                <View style={[styles.detailPanel, styles.rulePanel]}>
                  <Text style={styles.detailTitle}>Umpan wajib berbahan alami</Text>
                  <Text style={styles.detailText}>{venue.natural_bait_rule}</Text>
                </View>
              ) : null}
            </View>
          </View>

          {isStaff ? (
            <Pressable onPress={() => router.push('/admin' as Href)} style={styles.adminButton}>
              <View>
                <Text style={styles.adminKicker}>AKSES PENGELOLA</Text>
                <Text style={styles.adminTitle}>Kelola event dan konten</Text>
              </View>
              <Text style={styles.adminArrow}>→</Text>
            </Pressable>
          ) : null}

          <Pressable onPress={logout} style={styles.logoutButton}>
            <Text style={styles.logoutText}>Keluar dari akun</Text>
          </Pressable>

          <Pressable onPress={askForAccountDeletion} style={styles.deleteRequestButton}>
            <Text style={styles.deleteRequestText}>Ajukan penghapusan akun</Text>
          </Pressable>

          <Text style={styles.version}>PEMANCINGAN ADEM AYEM DLOPO · 1.1</Text>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  loadingScreen: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: Palette.paper },
  screen: { flex: 1, backgroundColor: Palette.paper, alignItems: 'center' },
  guestSafeArea: { flex: 1, width: '100%', maxWidth: MaxContentWidth },
  guestHero: { backgroundColor: Palette.ink, margin: 16, borderRadius: 30, padding: 24, overflow: 'hidden' },
  guestTitle: { color: Palette.white, fontFamily: Fonts?.display, fontSize: 32, lineHeight: 35, fontWeight: '900', marginTop: 7 },
  guestText: { color: '#B9CFCC', fontFamily: Fonts?.sans, fontSize: 11, lineHeight: 17, marginTop: 10 },
  guestLoginButton: { height: 54, borderRadius: 16, backgroundColor: Palette.orange, marginTop: 22, paddingHorizontal: 17, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  guestLoginText: { color: Palette.white, fontFamily: Fonts?.rounded, fontSize: 12, fontWeight: '900' },
  guestLoginArrow: { color: Palette.white, fontSize: 21 },
  guestBenefits: { paddingHorizontal: 18, gap: 10 },
  guestBenefitCard: { backgroundColor: Palette.surface, borderWidth: 1, borderColor: '#E5DED1', borderRadius: Radius.medium, padding: 15 },
  guestBenefitTitle: { color: Palette.ink, fontFamily: Fonts?.rounded, fontSize: 12, fontWeight: '900' },
  guestBenefitText: { color: Palette.muted, fontFamily: Fonts?.sans, fontSize: 9, lineHeight: 14, marginTop: 4 },
  safeArea: { flex: 1, width: '100%', maxWidth: MaxContentWidth },
  content: { paddingBottom: BottomTabInset + 28 },
  hero: { minHeight: 258, backgroundColor: Palette.ink, paddingHorizontal: 20, paddingTop: 16, paddingBottom: 43, overflow: 'hidden' },
  heroCircleOne: { position: 'absolute', width: 210, height: 210, borderRadius: 105, borderWidth: 38, borderColor: 'rgba(203,230,216,0.07)', right: -80, top: 8 },
  heroCircleTwo: { position: 'absolute', width: 95, height: 95, borderRadius: 48, backgroundColor: 'rgba(242,193,78,0.06)', left: -30, bottom: -20 },
  topBar: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  eyebrow: { color: Palette.gold, fontFamily: Fonts?.rounded, fontSize: 10, fontWeight: '900', letterSpacing: 1.5 },
  pageTitle: { color: Palette.white, fontFamily: Fonts?.display, fontSize: 31, fontWeight: '900', letterSpacing: -0.8, marginTop: 4 },
  settingsButton: { width: 47, height: 47, borderRadius: 16, backgroundColor: Palette.inkSoft, alignItems: 'center', justifyContent: 'center' },
  identityRow: { flexDirection: 'row', alignItems: 'center', marginTop: 24 },
  avatarWrap: { width: 88, height: 88 },
  avatar: { width: 82, height: 82, borderRadius: 28, backgroundColor: Palette.orange, borderWidth: 4, borderColor: Palette.surface, alignItems: 'center', justifyContent: 'center', transform: [{ rotate: '-3deg' }] },
  avatarImage: { width: '100%', height: '100%', borderRadius: 24, transform: [{ rotate: '3deg' }] },
  avatarText: { color: Palette.white, fontFamily: Fonts?.display, fontSize: 29, fontWeight: '900', transform: [{ rotate: '3deg' }] },
  verifiedMark: { position: 'absolute', right: 0, bottom: 2, width: 27, height: 27, borderRadius: 10, backgroundColor: Palette.gold, borderWidth: 3, borderColor: Palette.ink, alignItems: 'center', justifyContent: 'center' },
  verifiedCheck: { color: Palette.ink, fontSize: 13, fontWeight: '900' },
  identityCopy: { flex: 1, paddingLeft: 14 },
  profileName: { color: Palette.white, fontFamily: Fonts?.display, fontSize: 23, fontWeight: '900' },
  profilePhone: { color: '#B9CFCC', fontFamily: Fonts?.sans, fontSize: 11, marginTop: 3 },
  locationPill: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 9, backgroundColor: Palette.inkSoft, borderRadius: Radius.pill, paddingHorizontal: 9, paddingVertical: 5 },
  locationText: { color: '#DDECE8', fontFamily: Fonts?.rounded, fontSize: 8, fontWeight: '800' },
  statsCard: { minHeight: 86, marginHorizontal: 16, marginTop: -24, borderRadius: Radius.large, backgroundColor: Palette.surface, borderWidth: 1, borderColor: '#E8E1D5', paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', shadowColor: Palette.ink, shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.12, shadowRadius: 20, elevation: 5 },
  statItem: { flex: 1, alignItems: 'center' },
  statValue: { color: Palette.ink, fontFamily: Fonts?.display, fontSize: 23, fontWeight: '900' },
  statLabel: { color: Palette.muted, fontFamily: Fonts?.rounded, fontSize: 7, fontWeight: '900', letterSpacing: 0.65, marginTop: 2 },
  statDivider: { width: 1, height: 38, backgroundColor: Palette.line },
  ticketSection: { marginTop: 27 },
  sectionHeading: { paddingHorizontal: 18, marginBottom: 11, flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' },
  sectionEyebrow: { color: Palette.orange, fontFamily: Fonts?.rounded, fontSize: 9, fontWeight: '900', letterSpacing: 1.2 },
  sectionTitle: { color: Palette.ink, fontFamily: Fonts?.display, fontSize: 24, fontWeight: '900', marginTop: 2 },
  ticketCount: { color: Palette.success, backgroundColor: '#DCEDE3', borderRadius: Radius.pill, overflow: 'hidden', paddingHorizontal: 9, paddingVertical: 6, fontFamily: Fonts?.rounded, fontSize: 8, fontWeight: '900', letterSpacing: 0.8 },
  ticketCard: { marginHorizontal: 16, borderRadius: Radius.large, backgroundColor: Palette.surface, overflow: 'hidden', borderWidth: 1, borderColor: '#E4DDD0' },
  ticketAccent: { height: 7, backgroundColor: Palette.orange },
  ticketTop: { padding: 15, flexDirection: 'row', alignItems: 'center' },
  ticketDateBlock: { width: 51, height: 58, borderRadius: 14, backgroundColor: Palette.mint, alignItems: 'center', justifyContent: 'center' },
  ticketDate: { color: Palette.ink, fontFamily: Fonts?.display, fontSize: 22, lineHeight: 23, fontWeight: '900' },
  ticketMonth: { color: Palette.inkSoft, fontFamily: Fonts?.rounded, fontSize: 8, fontWeight: '900', letterSpacing: 0.8 },
  ticketCopy: { flex: 1, paddingHorizontal: 12 },
  ticketEyebrow: { color: Palette.orange, fontFamily: Fonts?.rounded, fontSize: 8, fontWeight: '900', letterSpacing: 0.8 },
  ticketTitle: { color: Palette.ink, fontFamily: Fonts?.rounded, fontSize: 14, fontWeight: '900', marginTop: 3 },
  ticketMeta: { color: Palette.muted, fontFamily: Fonts?.sans, fontSize: 9, marginTop: 3 },
  ticketArrowButton: { width: 38, height: 38, borderRadius: 13, backgroundColor: Palette.ink, alignItems: 'center', justifyContent: 'center' },
  ticketArrow: { color: Palette.white, fontSize: 19, marginTop: -2 },
  ticketTearLine: { height: 14, flexDirection: 'row', alignItems: 'center' },
  ticketHoleLeft: { width: 14, height: 14, marginLeft: -7, borderRadius: 7, backgroundColor: Palette.paper },
  dashes: { flex: 1, height: 1, borderTopWidth: 1, borderStyle: 'dashed', borderColor: '#C8CDC5' },
  ticketHoleRight: { width: 14, height: 14, marginRight: -7, borderRadius: 7, backgroundColor: Palette.paper },
  ticketBottom: { paddingHorizontal: 16, paddingTop: 7, paddingBottom: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  ticketCode: { color: Palette.ink, fontFamily: Fonts?.mono, fontSize: 10, fontWeight: '800' },
  ticketPrice: { color: Palette.orange, fontFamily: Fonts?.rounded, fontSize: 10, fontWeight: '900' },
  accountSection: { marginTop: 28 },
  menuCard: { marginHorizontal: 16, borderRadius: Radius.large, backgroundColor: Palette.surface, borderWidth: 1, borderColor: '#E5DED1', overflow: 'hidden' },
  menuRow: { minHeight: 70, paddingHorizontal: 13, paddingVertical: 10, flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#ECE8DE' },
  menuRowActive: { backgroundColor: '#F8F2E4' },
  menuIcon: { width: 42, height: 42, borderRadius: 14, backgroundColor: Palette.mint, alignItems: 'center', justifyContent: 'center' },
  menuIconActive: { backgroundColor: Palette.orange },
  menuCopy: { flex: 1, paddingHorizontal: 11 },
  menuTitle: { color: Palette.ink, fontFamily: Fonts?.rounded, fontSize: 12, fontWeight: '900' },
  menuSubtitle: { color: Palette.muted, fontFamily: Fonts?.sans, fontSize: 9, marginTop: 3 },
  menuArrow: { color: Palette.inkSoft, fontFamily: Fonts?.sans, fontSize: 25 },
  menuArrowActive: { color: Palette.orange },
  detailPanel: { marginHorizontal: 12, marginBottom: 11, borderRadius: 15, backgroundColor: '#EEF3EC', padding: 13 },
  rulePanel: { backgroundColor: '#E1F0E7' },
  detailTitle: { color: Palette.ink, fontFamily: Fonts?.rounded, fontSize: 11, fontWeight: '900' },
  detailText: { color: Palette.inkSoft, fontFamily: Fonts?.sans, fontSize: 9, lineHeight: 14, marginTop: 4 },
  inlineButton: { alignSelf: 'flex-start', marginTop: 10, backgroundColor: Palette.ink, borderRadius: 11, paddingHorizontal: 12, paddingVertical: 8 },
  inlineButtonText: { color: Palette.white, fontFamily: Fonts?.rounded, fontSize: 9, fontWeight: '900' },
  historyButton: { alignSelf: 'flex-start', marginTop: 8, borderRadius: 11, borderWidth: 1, borderColor: Palette.ink, paddingHorizontal: 12, paddingVertical: 7 },
  historyButtonText: { color: Palette.ink, fontFamily: Fonts?.rounded, fontSize: 8, fontWeight: '900' },
  pressed: { opacity: 0.8, transform: [{ scale: 0.985 }] },
  adminButton: { minHeight: 70, marginHorizontal: 16, marginTop: 18, borderRadius: Radius.medium, backgroundColor: Palette.gold, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  adminKicker: { color: Palette.orangeDark, fontFamily: Fonts?.rounded, fontSize: 8, fontWeight: '900', letterSpacing: 1 },
  adminTitle: { color: Palette.ink, fontFamily: Fonts?.display, fontSize: 19, fontWeight: '900', marginTop: 2 },
  adminArrow: { color: Palette.ink, fontSize: 24 },
  logoutButton: { height: 50, marginHorizontal: 16, marginTop: 18, borderRadius: 15, borderWidth: 1.5, borderColor: Palette.orange, alignItems: 'center', justifyContent: 'center' },
  logoutText: { color: Palette.orangeDark, fontFamily: Fonts?.rounded, fontSize: 10, fontWeight: '900' },
  deleteRequestButton: { height: 44, marginHorizontal: 16, marginTop: 9, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  deleteRequestText: { color: Palette.muted, fontFamily: Fonts?.rounded, fontSize: 9, fontWeight: '800', textDecorationLine: 'underline' },
  version: { color: '#8B9995', fontFamily: Fonts?.rounded, fontSize: 8, fontWeight: '800', letterSpacing: 1, textAlign: 'center', marginTop: 21 },
});
