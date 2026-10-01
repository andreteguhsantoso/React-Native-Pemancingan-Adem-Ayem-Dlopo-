import { useRouter } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { ActivityIndicator, Alert, KeyboardAvoidingView, Platform, Pressable, RefreshControl, ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PaymentProofPreview } from '@/components/payment-proof-preview';
import { Fonts, MaxContentWidth, Palette, Radius } from '@/constants/theme';
import { useAuth } from '@/context/auth-context';
import { useFocusResource } from '@/hooks/use-focus-resource';
import { friendlyBookingError } from '@/lib/booking-errors';
import { requireSupabase } from '@/lib/supabase';
import { fetchPaymentReviews, fetchPaymentSettings, formatPaymentAmount, formatPaymentDeadline, PaymentReviewItem, PaymentSettings, reviewPayment, signedPaymentProof } from '@/services/payment-service';

type AdminPaymentData = { settings: PaymentSettings; items: PaymentReviewItem[] };
const proofStatus = { pending: 'Perlu diperiksa', approved: 'Disetujui', rejected: 'Perlu perbaikan' } as const;

export default function AdminPaymentsScreen() {
  const router = useRouter();
  const { profile, session, loading: authLoading } = useAuth();
  const isStaff = profile?.status === 'active' && (profile.role === 'admin' || profile.role === 'operator');
  const [tab, setTab] = useState<'proofs' | 'settings'>('proofs');
  const [filter, setFilter] = useState<'pending' | 'approved' | 'rejected'>('pending');
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const load = useCallback(async () => ({ settings: await fetchPaymentSettings(), items: await fetchPaymentReviews() }), []);
  const { data, error, refreshing, refresh } = useFocusResource<AdminPaymentData | null>(load, null, Boolean(isStaff && session), 15000);
  if (authLoading) return <SafeAreaView style={styles.center}><ActivityIndicator color={Palette.orange} /></SafeAreaView>;
  if (!isStaff || !session) return <SafeAreaView style={styles.center}><Text style={styles.title}>Akses khusus pengelola</Text><Text style={styles.body}>Pemeriksaan pembayaran hanya dapat dilakukan admin atau operator aktif.</Text><Pressable onPress={() => router.replace('/profile')} style={styles.button}><Text style={styles.buttonText}>Kembali ke profil</Text></Pressable></SafeAreaView>;

  const items = data?.items ?? [];
  const matching = items.filter((item) => item.status === filter && `${item.bookings.booking_code} ${item.bookings.participant_name} ${item.bookings.profiles?.username ?? ''} ${item.bookings.spot_number} ${item.bookings.events?.title ?? ''}`.toLowerCase().includes(search.toLowerCase().trim()));
  const selected = items.find((item) => item.id === selectedId);
  const settingsKey = data ? JSON.stringify(data.settings) : '';

  return <View style={styles.screen}><KeyboardAvoidingView style={styles.page} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
    <SafeAreaView edges={['top']} style={styles.headerSafe}><View style={styles.header}><Pressable accessibilityLabel="Kembali ke panel admin" onPress={() => router.replace('/admin')} style={styles.back}><Text style={styles.backText}>{'<'}</Text></Pressable><View style={styles.flex}><Text style={styles.kicker}>KONTROL PEMBAYARAN</Text><Text style={styles.headerTitle}>Verifikasi transfer</Text></View></View></SafeAreaView>
    <View style={styles.tabs}>{(['proofs', 'settings'] as const).map((value) => <Pressable key={value} onPress={() => setTab(value)} style={[styles.tab, tab === value && styles.tabActive]}><Text style={[styles.tabText, tab === value && styles.tabTextActive]}>{value === 'proofs' ? 'Bukti transfer' : 'Pengaturan'}</Text></Pressable>)}</View>
    <ScrollView keyboardShouldPersistTaps="handled" refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />} contentContainerStyle={styles.content}>
      {error ? <View style={styles.warning}><Text style={styles.sectionTitle}>Data belum dapat diperiksa</Text><Text style={styles.body}>{error}</Text><Pressable style={styles.outline} onPress={refresh}><Text style={styles.outlineText}>Muat ulang</Text></Pressable></View> : null}
      {!data && refreshing ? <ActivityIndicator color={Palette.orange} /> : null}
      {tab === 'settings' && data ? <PaymentSettingsEditor key={settingsKey} settings={data.settings} admin={profile.role === 'admin'} userId={session.user.id} onSaved={refresh} /> : null}
      {tab === 'proofs' && data ? <>
        <View style={styles.summary}><View style={styles.flex}><Text style={styles.kickerDark}>MENUNGGU PEMERIKSAAN</Text><Text style={styles.summaryNumber}>{items.filter((item) => item.status === 'pending').length}</Text></View><View style={styles.flex}><Text style={styles.kickerDark}>SUDAH DISETUJUI</Text><Text style={styles.summaryNumber}>{items.filter((item) => item.status === 'approved').length}</Text></View></View>
        <View style={styles.notice}><Text style={styles.sectionTitle}>Foto bukan bukti dana masuk</Text><Text style={styles.body}>Periksa mutasi rekening dan jumlah transfer terlebih dahulu. Persetujuan akan mengubah pesanan menjadi lunas dan menerbitkan tiket digital.</Text></View>
        <TextInput value={search} onChangeText={setSearch} style={styles.input} placeholder="Cari kode, pemancing, akun, event, atau lapak" placeholderTextColor={Palette.muted} maxLength={100} />
        <View style={styles.filters}>{(['pending', 'approved', 'rejected'] as const).map((value) => <Pressable onPress={() => setFilter(value)} key={value} style={[styles.filter, filter === value && styles.filterActive]}><Text style={[styles.filterText, filter === value && styles.filterTextActive]}>{proofStatus[value]}</Text></Pressable>)}</View>
        {selected ? <PaymentReviewCard key={`${selected.id}-${selected.submitted_at}-${selected.status}`} item={selected} disabled={Boolean(error)} onReviewed={refresh} onClose={() => setSelectedId(null)} /> : null}
        {matching.length === 0 ? <View style={styles.card}><Text style={styles.sectionTitle}>Belum ada bukti pada daftar ini</Text><Text style={styles.body}>Bukti yang dikirim pengguna akan muncul di sini. Tarik halaman untuk memperbarui.</Text></View> : matching.map((item) => <Pressable key={item.id} onPress={() => setSelectedId(item.id)} style={[styles.card, item.id === selectedId && styles.selectedCard]}><Text style={styles.status}>{proofStatus[item.status].toUpperCase()}</Text><Text style={styles.sectionTitle}>{item.bookings.participant_name}</Text><Text style={styles.body}>@{item.bookings.profiles?.username || '-'} / Lapak {item.bookings.spot_number}</Text><Text style={styles.body}>{item.bookings.events?.title || 'Event pemancingan'}</Text><Text style={styles.code}>{item.bookings.booking_code}</Text><View style={styles.row}><Text style={styles.amount}>{formatPaymentAmount(item.bookings.amount)}</Text><Text style={styles.openText}>Lihat bukti</Text></View></Pressable>)}
        <Text style={styles.help}>Menampilkan maksimal 300 kiriman terbaru. Status lapak dan pemiliknya juga tersedia di menu Ketersediaan & data pemesan.</Text>
      </> : null}
    </ScrollView>
  </KeyboardAvoidingView></View>;
}

function PaymentSettingsEditor({ settings, admin, userId, onSaved }: { settings: PaymentSettings; admin: boolean; userId: string; onSaved: () => Promise<void> }) {
  const [bank, setBank] = useState(settings.bank_name);
  const [account, setAccount] = useState(settings.account_number);
  const [holder, setHolder] = useState(settings.account_holder);
  const [hold, setHold] = useState(String(settings.booking_hold_minutes));
  const [reviewHold, setReviewHold] = useState(String(settings.review_hold_minutes));
  const [enabled, setEnabled] = useState(settings.transfer_enabled);
  const [saving, setSaving] = useState(false);
  const busy = useRef(false);
  const save = async () => {
    if (!admin || busy.current) return;
    if (enabled && (bank.trim().length < 2 || bank.trim().length > 60 || !/^[0-9]{5,30}$/.test(account.trim()) || holder.trim().length < 3 || holder.trim().length > 100)) return Alert.alert('Rekening belum lengkap', 'Isi bank, nomor rekening asli tanpa spasi, dan nama pemilik rekening. Jangan masukkan rekening contoh.');
    if (!Number.isInteger(Number(hold)) || Number(hold) < 15 || Number(hold) > 120 || !Number.isInteger(Number(reviewHold)) || Number(reviewHold) < 15 || Number(reviewHold) > 360) return Alert.alert('Durasi tidak valid', 'Reservasi antara 15-120 menit dan pemeriksaan antara 15-360 menit.');
    busy.current = true;
    setSaving(true);
    try {
      const { error } = await requireSupabase().from('payment_settings').update({ transfer_enabled: enabled, bank_name: bank.trim(), account_number: account.trim(), account_holder: holder.trim(), booking_hold_minutes: Number(hold), review_hold_minutes: Number(reviewHold), updated_by: userId }).eq('id', true).select('id').single();
      if (error) throw new Error(friendlyBookingError(error));
      await onSaved();
      Alert.alert('Pengaturan tersimpan', enabled ? 'Transfer manual sudah tersedia untuk pengguna. QRIS, VA, dan e-wallet otomatis tetap belum aktif.' : 'Transfer baru dinonaktifkan. Instruksi rekening pesanan lama tetap menggunakan rekening yang sudah tercatat.');
    } catch (cause) { Alert.alert('Pengaturan belum tersimpan', cause instanceof Error ? cause.message : 'Silakan coba kembali.'); }
    finally { busy.current = false; setSaving(false); }
  };
  return <View style={styles.card}><Text style={styles.sectionTitle}>Rekening resmi pemancingan</Text><Text style={styles.body}>{admin ? 'Masukkan rekening asli milik pemancingan. Pengguna belum bisa transfer sampai menu ini diaktifkan.' : 'Hanya admin yang dapat mengubah rekening. Operator tetap dapat memeriksa bukti transfer.'}</Text><Text style={styles.label}>BANK</Text><TextInput value={bank} onChangeText={setBank} editable={admin && !saving} maxLength={60} placeholder="Nama bank asli" placeholderTextColor={Palette.muted} style={styles.input} /><Text style={styles.label}>NOMOR REKENING</Text><TextInput value={account} onChangeText={(text) => setAccount(text.replace(/\D/g, ''))} editable={admin && !saving} maxLength={30} keyboardType="number-pad" placeholder="Nomor rekening asli" placeholderTextColor={Palette.muted} style={styles.input} /><Text style={styles.label}>ATAS NAMA</Text><TextInput value={holder} onChangeText={setHolder} editable={admin && !saving} maxLength={100} placeholder="Nama pemilik rekening" placeholderTextColor={Palette.muted} style={styles.input} /><Text style={styles.label}>BATAS RESERVASI (MENIT, 15-120)</Text><TextInput value={hold} onChangeText={setHold} editable={admin && !saving} maxLength={3} keyboardType="number-pad" style={styles.input} /><Text style={styles.label}>WAKTU PEMERIKSAAN BUKTI (MENIT, 15-360)</Text><TextInput value={reviewHold} onChangeText={setReviewHold} editable={admin && !saving} maxLength={3} keyboardType="number-pad" style={styles.input} /><View style={styles.row}><Text style={[styles.body, styles.flex]}>Aktifkan transfer bank manual</Text><Switch value={enabled} onValueChange={setEnabled} disabled={!admin || saving} trackColor={{ true: Palette.success }} /></View><Text style={styles.help}>Saat bukti pertama dikirim, reservasi diperpanjang satu kali untuk pemeriksaan, paling lama sampai event dimulai. Pengiriman ulang tidak memperpanjang batas waktu lagi.</Text><Text style={styles.help}>Perubahan rekening hanya berlaku pada instruksi baru. Jangan tutup rekening lama sebelum seluruh pesanan yang menggunakannya selesai.</Text>{admin ? <Pressable onPress={save} disabled={saving} style={[styles.button, saving && styles.disabled]}>{saving ? <ActivityIndicator color={Palette.white} /> : <Text style={styles.buttonText}>Simpan pengaturan pembayaran</Text>}</Pressable> : null}</View>;
}

function PaymentReviewCard({ item, disabled, onReviewed, onClose }: { item: PaymentReviewItem; disabled: boolean; onReviewed: () => Promise<void>; onClose: () => void }) {
  const [note, setNote] = useState('');
  const [fundsChecked, setFundsChecked] = useState(false);
  const [saving, setSaving] = useState(false);
  const busy = useRef(false);
  const load = useCallback(() => signedPaymentProof(item.proof_path), [item.proof_path]);
  const proof = useFocusResource<string | null>(load, null, true, 300000);
  const pending = item.status === 'pending';
  const active = item.bookings.status === 'awaiting_payment';
  const review = async (approved: boolean) => {
    if (busy.current || disabled || !pending) return;
    if (!approved && note.trim().length < 5) return Alert.alert('Alasan belum lengkap', 'Masukkan alasan penolakan minimal 5 karakter agar pengguna dapat memperbaiki bukti.');
    busy.current = true;
    setSaving(true);
    try { await reviewPayment(item, approved, note); await onReviewed(); setFundsChecked(false); Alert.alert('Pemeriksaan tersimpan', approved ? 'Dana dikonfirmasi. Tiket digital pengguna kini tersedia.' : 'Alasan perbaikan sudah dikirim ke pengguna.'); }
    catch (cause) { Alert.alert('Pemeriksaan belum tersimpan', cause instanceof Error ? cause.message : 'Silakan coba kembali.'); }
    finally { busy.current = false; setSaving(false); }
  };
  const confirmApproval = () => {
    if (!fundsChecked || !active || disabled || saving) return;
    Alert.alert('Konfirmasi dana masuk', `Pastikan ${formatPaymentAmount(item.bookings.amount)} dari ${item.payer_name} benar-benar diterima untuk ${item.bookings.booking_code}. Tiket akan langsung menjadi lunas.`, [{ text: 'Periksa lagi', style: 'cancel' }, { text: 'Dana sudah masuk', onPress: () => void review(true) }]);
  };
  return <View style={[styles.card, styles.reviewCard]}>
    <View style={styles.row}><Text style={[styles.sectionTitle, styles.flex]}>Periksa bukti transfer</Text><Pressable onPress={onClose} style={styles.close}><Text style={styles.outlineText}>Tutup</Text></Pressable></View>
    <Text style={styles.code}>{item.bookings.booking_code}</Text>
    <Text style={styles.amount}>{formatPaymentAmount(item.bookings.amount)}</Text>
    <Text style={styles.body}>Pemancing: {item.bookings.participant_name} / Lapak {item.bookings.spot_number}</Text>
    <Text style={styles.body}>Pengirim dana: {item.payer_name}</Text>
    <Text style={styles.help}>Dikirim: {formatPaymentDeadline(item.submitted_at)}</Text>
    <Text style={styles.help}>Batas pemeriksaan: {formatPaymentDeadline(item.bookings.expires_at)}</Text>
    {item.bookings.bank_instructions ? <Text style={styles.body}>Tujuan: {item.bookings.bank_instructions.bank_name} {item.bookings.bank_instructions.account_number} / {item.bookings.bank_instructions.account_holder}</Text> : null}
    {proof.data ? <PaymentProofPreview uri={proof.data} /> : <Text style={styles.body}>{proof.error || 'Memuat bukti privat...'}</Text>}
    <Pressable style={styles.outline} onPress={proof.refresh}><Text style={styles.outlineText}>Muat ulang foto bukti</Text></Pressable>
    {item.review_note ? <Text style={styles.body}>Catatan pemeriksaan: {item.review_note}</Text> : null}
    {pending ? <>
      <Text style={styles.label}>CATATAN / ALASAN PERBAIKAN</Text>
      <TextInput value={note} onChangeText={setNote} editable={!saving && !disabled} multiline maxLength={500} placeholder="Wajib jika bukti ditolak. Jangan menuliskan informasi rahasia bank." placeholderTextColor={Palette.muted} style={[styles.input, styles.multiline]} />
      {active ? <Pressable accessibilityRole="checkbox" accessibilityState={{ checked: fundsChecked }} onPress={() => setFundsChecked(!fundsChecked)} disabled={saving || disabled} style={styles.check}><Text style={styles.checkMark}>{fundsChecked ? '[X]' : '[ ]'}</Text><Text style={[styles.body, styles.flex]}>Saya telah memeriksa mutasi rekening dan dana benar-benar masuk sesuai total pesanan.</Text></Pressable> : <View style={styles.warning}><Text style={styles.body}>Reservasi sudah tidak aktif. Jangan menerbitkan tiket pada lapak ini. Jika dana telanjur masuk, selesaikan pengembalian atau pengaturan ulang dengan pemancing secara langsung.</Text></View>}
      <Pressable disabled={saving || disabled || !active || !fundsChecked} onPress={confirmApproval} style={[styles.button, (saving || disabled || !active || !fundsChecked) && styles.disabled]}><Text style={styles.buttonText}>{saving ? 'Menyimpan...' : 'Setujui & terbitkan tiket'}</Text></Pressable>
      <Pressable disabled={saving || disabled} onPress={() => void review(false)} style={styles.outline}><Text style={styles.outlineText}>Minta perbaikan bukti</Text></Pressable>
    </> : <Text style={styles.status}>{proofStatus[item.status]}</Text>}
  </View>;
}

const styles = StyleSheet.create({
  screen: { flex: 1, alignItems: 'center', backgroundColor: '#D8D2C5' }, page: { flex: 1, width: '100%', maxWidth: MaxContentWidth, backgroundColor: Palette.paper }, center: { flex: 1, backgroundColor: Palette.paper, padding: 24, justifyContent: 'center', gap: 15 }, flex: { flex: 1 }, headerSafe: { backgroundColor: Palette.ink }, header: { padding: 18, gap: 14, flexDirection: 'row', alignItems: 'center' }, back: { height: 44, width: 44, backgroundColor: Palette.inkSoft, borderRadius: 16, alignItems: 'center', justifyContent: 'center' }, backText: { fontSize: 22, color: Palette.white }, kicker: { color: Palette.gold, fontSize: 11, letterSpacing: 1.2, fontWeight: '800', fontFamily: Fonts?.rounded }, kickerDark: { color: Palette.inkSoft, fontSize: 10, fontWeight: '800', letterSpacing: 0.7 }, headerTitle: { color: Palette.white, fontFamily: Fonts?.display, fontSize: 27, fontWeight: '900', marginTop: 5 }, title: { fontFamily: Fonts?.display, color: Palette.ink, fontWeight: '800', fontSize: 28 }, tabs: { padding: 12, flexDirection: 'row', backgroundColor: Palette.surface, gap: 8 }, tab: { flex: 1, borderRadius: 14, padding: 14, alignItems: 'center' }, tabActive: { backgroundColor: Palette.ink }, tabText: { fontFamily: Fonts?.rounded, fontSize: 14, color: Palette.ink, fontWeight: '800' }, tabTextActive: { color: Palette.white }, content: { padding: 18, paddingBottom: 40, gap: 16 }, card: { backgroundColor: Palette.surface, borderRadius: Radius.large, padding: 20, gap: 12, borderWidth: 1, borderColor: Palette.line }, selectedCard: { borderColor: Palette.orange }, reviewCard: { borderColor: Palette.ink, borderWidth: 2 }, sectionTitle: { fontFamily: Fonts?.display, fontSize: 22, color: Palette.ink, fontWeight: '800' }, body: { fontFamily: Fonts?.sans, color: Palette.inkSoft, fontSize: 14, lineHeight: 22 }, help: { fontFamily: Fonts?.sans, color: Palette.muted, fontSize: 12, lineHeight: 19 }, label: { color: Palette.inkSoft, fontFamily: Fonts?.rounded, fontSize: 11, fontWeight: '800', letterSpacing: 0.5 }, input: { minHeight: 52, borderRadius: 14, backgroundColor: '#EDF2EB', padding: 14, fontFamily: Fonts?.sans, fontSize: 15, color: Palette.ink }, multiline: { minHeight: 110, textAlignVertical: 'top' }, summary: { backgroundColor: Palette.mint, padding: 20, borderRadius: Radius.large, flexDirection: 'row', gap: 14 }, summaryNumber: { color: Palette.ink, fontFamily: Fonts?.display, fontSize: 42, fontWeight: '900' }, notice: { backgroundColor: Palette.gold, padding: 18, borderRadius: Radius.medium, gap: 8 }, warning: { backgroundColor: '#FBE3D8', padding: 18, borderRadius: Radius.medium, gap: 10 }, filters: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 }, filter: { borderRadius: 12, backgroundColor: Palette.surface, borderWidth: 1, borderColor: Palette.line, padding: 10, minHeight: 44, justifyContent: 'center' }, filterActive: { backgroundColor: Palette.ink }, filterText: { color: Palette.ink, fontSize: 12, fontFamily: Fonts?.rounded, fontWeight: '700' }, filterTextActive: { color: Palette.white }, status: { color: Palette.orangeDark, fontSize: 11, fontWeight: '800', letterSpacing: 0.6 }, code: { fontFamily: Fonts?.mono, fontSize: 13, color: Palette.muted }, row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 }, amount: { color: Palette.orangeDark, fontSize: 24, fontWeight: '900', fontFamily: Fonts?.display }, openText: { color: Palette.ink, fontSize: 13, fontWeight: '800' }, proofImage: { width: '100%', height: 360, borderRadius: 14 }, button: { minHeight: 54, backgroundColor: Palette.orange, borderRadius: 16, padding: 14, alignItems: 'center', justifyContent: 'center' }, buttonText: { color: Palette.white, fontFamily: Fonts?.rounded, fontWeight: '800', fontSize: 14 }, outline: { minHeight: 48, borderWidth: 1, borderColor: Palette.ink, borderRadius: 16, padding: 12, alignItems: 'center', justifyContent: 'center' }, outlineText: { color: Palette.ink, fontSize: 13, fontFamily: Fonts?.rounded, fontWeight: '800' }, disabled: { opacity: 0.5 }, check: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: 14, backgroundColor: Palette.mint }, checkMark: { fontFamily: Fonts?.mono, color: Palette.ink, fontSize: 20 }, close: { minHeight: 44, justifyContent: 'center', padding: 10 },
});
