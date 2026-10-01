import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { ActivityIndicator, Alert, KeyboardAvoidingView, Platform, Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { MediaImage } from '@/components/media-image';
import { PaymentProofPreview } from '@/components/payment-proof-preview';
import { Fonts, MaxContentWidth, Palette, Radius } from '@/constants/theme';
import { useAuth } from '@/context/auth-context';
import { useFocusResource } from '@/hooks/use-focus-resource';
import { pickImage, PickedImage, uploadUserImage } from '@/services/media-service';
import { fetchPaymentOverview, formatPaymentAmount, formatPaymentDeadline, PaymentOverview, prepareManualTransfer, signedPaymentProof, submitPaymentProof } from '@/services/payment-service';

export default function TransferScreen() {
  const router = useRouter();
  const { eventId, bookingId, code } = useLocalSearchParams<{ eventId: string; bookingId?: string; code?: string }>();
  const { session, profile, loading: authLoading } = useAuth();
  const [photo, setPhoto] = useState<PickedImage | null>(null);
  const [payerName, setPayerName] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const busy = useRef(false);
  const load = useCallback(async () => {
    if (!session) throw new Error('Masuk untuk membuka pembayaran milik Anda.');
    const overview = await fetchPaymentOverview(session.user.id, eventId, bookingId, code);
    if (overview.booking.status === 'awaiting_payment' && !overview.paymentError) {
      overview.booking.bank_instructions = await prepareManualTransfer(overview.booking.id);
    }
    return overview;
  }, [session, eventId, bookingId, code]);
  const { data, error, refreshing, refresh } = useFocusResource<PaymentOverview | null>(load, null, Boolean(session), 15000);
  const proofPath = data?.submission?.proof_path;
  const loadProof = useCallback(() => proofPath ? signedPaymentProof(proofPath) : Promise.resolve(null), [proofPath]);
  const proof = useFocusResource<string | null>(loadProof, null, Boolean(session && proofPath), 300000);

  const selectPhoto = async () => {
    try { const selected = await pickImage([3, 4], false); if (selected) setPhoto(selected); }
    catch (cause) { Alert.alert('Foto belum dipilih', cause instanceof Error ? cause.message : 'Buka kembali galeri perangkat.'); }
  };
  const submit = async () => {
    if (busy.current || !session || !data || refreshing || error || data.paymentError) return;
    const name = (payerName ?? (profile?.full_name || data.booking.participant_name)).trim();
    if (name.length < 3 || name.length > 100) return Alert.alert('Nama pengirim belum lengkap', 'Masukkan nama pemilik rekening atau pengirim transfer, minimal 3 karakter.');
    if (!photo) return Alert.alert('Bukti belum dipilih', 'Pilih foto bukti transfer. Jangan unggah PIN, password, atau kode OTP.');
    busy.current = true;
    setSaving(true);
    try {
      const path = await uploadUserImage('payment-proofs', session.user.id, photo);
      await submitPaymentProof(data.booking.id, path, name);
      setPhoto(null);
      await refresh();
      Alert.alert('Bukti terkirim', 'Menunggu pemeriksaan dana masuk oleh pengelola. Tiket belum lunas sampai disetujui.');
    } catch (cause) { Alert.alert('Bukti belum dapat dikirim', cause instanceof Error ? cause.message : 'Periksa status pesanan sebelum mencoba kembali.'); }
    finally { busy.current = false; setSaving(false); }
  };

  const matches = Boolean(data && data.userId === session?.user.id && data.booking.event_id === eventId && (bookingId ? data.booking.id === bookingId : data.booking.booking_code === code));
  if (authLoading || (refreshing && !matches)) return <SafeAreaView style={styles.center}><ActivityIndicator color={Palette.orange} /><Text style={styles.body}>Memuat instruksi transfer...</Text></SafeAreaView>;
  if (!session || !data || !matches) return <SafeAreaView style={styles.center}><Text style={styles.title}>Pembayaran belum tersedia</Text><Text style={styles.body}>{error || 'Masuk dan buka pesanan dari halaman Profil.'}</Text>{session ? <Pressable style={styles.button} onPress={refresh}><Text style={styles.buttonText}>Coba lagi</Text></Pressable> : null}<Pressable style={styles.outline} onPress={() => router.replace('/profile')}><Text style={styles.outlineText}>Kembali ke profil</Text></Pressable></SafeAreaView>;

  const { booking, submission, paymentError } = data;
  const isPaid = booking.status === 'paid' || booking.status === 'confirmed';
  const active = booking.status === 'awaiting_payment';
  const pending = submission?.status === 'pending';
  const bank = booking.bank_instructions;
  const canSubmit = active && !pending && !paymentError && Boolean(bank);

  return <View style={styles.screen}><KeyboardAvoidingView style={styles.page} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
    <SafeAreaView edges={['top']} style={styles.headerSafe}><View style={styles.header}><Pressable accessibilityLabel="Kembali" onPress={() => router.back()} style={styles.back}><Text style={styles.backText}>{'<'}</Text></Pressable><View style={styles.flex}><Text style={styles.kicker}>TRANSFER BANK MANUAL</Text><Text style={styles.headerTitle}>Bayar & kirim bukti</Text></View></View></SafeAreaView>
    <ScrollView keyboardShouldPersistTaps="handled" refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />} contentContainerStyle={styles.content}>
      {error || paymentError ? <View style={styles.warning}><Text style={styles.warningTitle}>Pemeriksaan belum berhasil</Text><Text style={styles.body}>{error || paymentError}</Text><Pressable onPress={refresh} style={styles.outline}><Text style={styles.outlineText}>Periksa kembali</Text></Pressable></View> : null}
      <View style={styles.amountCard}><Text style={styles.kicker}>TOTAL SESUAI PESANAN</Text><Text style={styles.amount}>{formatPaymentAmount(booking.amount)}</Text><Text style={styles.light}>{booking.booking_code}</Text><Text style={styles.light}>Lapak {booking.spot_number} / {booking.participant_name}</Text></View>
      <View style={[styles.notice, isPaid && styles.paidNotice]}><Text style={styles.noticeTitle}>{isPaid ? 'Pembayaran sudah disetujui' : !active ? 'Jangan lanjutkan transfer' : pending ? 'Bukti sedang diperiksa' : submission?.status === 'rejected' ? 'Bukti perlu diperbaiki' : 'Transfer sebelum batas waktu'}</Text><Text style={styles.body}>{isPaid ? 'Tiket digital Anda sudah tersedia.' : !active ? 'Reservasi sudah berakhir atau dibatalkan. Jika telanjur transfer, hubungi pengelola untuk penyelesaian. Jangan membayar pesanan ini lagi.' : pending ? 'Pengelola memeriksa dana masuk ke rekening. Foto bukti bukan konfirmasi pembayaran otomatis.' : submission?.status === 'rejected' ? submission.review_note : 'Buka aplikasi bank Anda dan transfer sejumlah total pesanan ke rekening di bawah. Jangan transfer jika batas waktu sudah habis.'}</Text>{active ? <Text style={styles.deadline}>Batas waktu: {formatPaymentDeadline(booking.expires_at)}</Text> : null}</View>
      {active && bank ? <View style={styles.card}><Text style={styles.sectionTitle}>Rekening tujuan</Text><Text style={styles.label}>{bank.bank_name}</Text><Text selectable style={styles.account}>{bank.account_number}</Text><Text style={styles.body}>Atas nama {bank.account_holder}</Text><Text style={styles.help}>Rekening ini dicatat untuk pesanan Anda. Periksa nama penerima sebelum mengirim dana. Sertakan kode booking pada berita transfer bila memungkinkan.</Text></View> : null}
      {submission ? <View style={styles.card}><Text style={styles.sectionTitle}>Bukti yang dikirim</Text><Text style={styles.body}>Pengirim: {submission.payer_name}</Text>{proof.data ? <PaymentProofPreview uri={proof.data} /> : <Text style={styles.help}>{proof.error || 'Memuat bukti privat...'}</Text>}<Pressable onPress={proof.refresh} style={styles.outline}><Text style={styles.outlineText}>Muat ulang bukti</Text></Pressable></View> : null}
      {canSubmit ? <View style={styles.card}>
        <Text style={styles.sectionTitle}>{submission ? 'Kirim ulang bukti' : 'Konfirmasi transfer Anda'}</Text>
        <Text style={styles.label}>NAMA PENGIRIM / PEMILIK REKENING</Text>
        <TextInput value={payerName ?? (profile?.full_name || booking.participant_name)} onChangeText={setPayerName} maxLength={100} editable={!saving} placeholder="Nama yang tercantum pada bukti" placeholderTextColor={Palette.muted} style={styles.input} autoComplete="name" />
        <Text style={styles.help}>Gunakan foto bukti yang jelas dan lengkap. Jangan sertakan PIN, password, OTP, atau informasi pribadi lain yang tidak diperlukan.</Text>
        {photo ? <MediaImage source={{ uri: photo.uri }} style={styles.proofImage} contentFit="contain" cachePolicy="none" /> : null}
        <Pressable disabled={saving} onPress={selectPhoto} style={styles.outline}><Text style={styles.outlineText}>{photo ? 'Ganti foto bukti' : 'Pilih foto bukti transfer'}</Text></Pressable>
        <Pressable disabled={saving || !photo || refreshing || Boolean(error)} onPress={submit} style={[styles.button, (saving || !photo || refreshing || Boolean(error)) && styles.disabled]}>{saving ? <ActivityIndicator color={Palette.white} /> : <Text style={styles.buttonText}>Kirim bukti ke pengelola</Text>}</Pressable>
        <Text style={styles.help}>Bukti disimpan privat untuk Anda dan pengelola. Upload tidak langsung mengubah pesanan menjadi lunas.</Text>
      </View> : null}
      {isPaid ? <Pressable style={styles.button} onPress={() => router.replace({ pathname: '/booking/[eventId]/ticket', params: { eventId, bookingId: booking.id, code: booking.booking_code } })}><Text style={styles.buttonText}>Buka tiket digital</Text></Pressable> : null}
      <Pressable style={styles.outline} onPress={() => router.replace('/bookings')}><Text style={styles.outlineText}>Lihat semua pesanan</Text></Pressable>
    </ScrollView>
  </KeyboardAvoidingView></View>;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#D8D2C5', alignItems: 'center' }, page: { flex: 1, width: '100%', maxWidth: MaxContentWidth, backgroundColor: Palette.paper }, center: { flex: 1, backgroundColor: Palette.paper, padding: 24, justifyContent: 'center', gap: 12 }, flex: { flex: 1 }, headerSafe: { backgroundColor: Palette.ink }, header: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 18 }, back: { width: 44, height: 44, borderRadius: 16, backgroundColor: Palette.inkSoft, alignItems: 'center', justifyContent: 'center' }, backText: { color: Palette.white, fontSize: 22 }, kicker: { color: Palette.gold, fontSize: 11, letterSpacing: 1.3, fontFamily: Fonts?.rounded, fontWeight: '800' }, headerTitle: { fontFamily: Fonts?.display, fontSize: 27, fontWeight: '900', color: Palette.white, marginTop: 4 }, content: { padding: 18, paddingBottom: 40, gap: 16 }, amountCard: { backgroundColor: Palette.inkSoft, borderRadius: Radius.large, padding: 22, gap: 9 }, amount: { color: Palette.white, fontSize: 36, fontWeight: '900', fontFamily: Fonts?.display }, light: { color: '#D5E4E1', fontSize: 13 }, card: { backgroundColor: Palette.surface, borderRadius: Radius.large, borderWidth: 1, borderColor: Palette.line, padding: 20, gap: 12 }, sectionTitle: { fontFamily: Fonts?.display, fontSize: 22, fontWeight: '800', color: Palette.ink }, notice: { backgroundColor: Palette.gold, borderRadius: Radius.medium, padding: 18, gap: 8 }, paidNotice: { backgroundColor: Palette.mint }, noticeTitle: { color: Palette.ink, fontFamily: Fonts?.rounded, fontSize: 18, fontWeight: '800' }, warning: { backgroundColor: '#FBE3D8', padding: 18, borderRadius: Radius.medium, gap: 8 }, warningTitle: { color: Palette.orangeDark, fontWeight: '800', fontSize: 17 }, body: { fontFamily: Fonts?.sans, fontSize: 14, color: Palette.inkSoft, lineHeight: 22 }, help: { fontFamily: Fonts?.sans, fontSize: 12, lineHeight: 19, color: Palette.muted }, label: { color: Palette.inkSoft, fontFamily: Fonts?.rounded, fontWeight: '800', fontSize: 12, letterSpacing: 0.5 }, account: { fontFamily: Fonts?.mono, fontSize: 28, color: Palette.ink, fontWeight: '800' }, deadline: { fontWeight: '800', fontSize: 13, color: Palette.ink }, input: { minHeight: 52, borderRadius: 15, backgroundColor: '#EDF2EB', paddingHorizontal: 14, color: Palette.ink, fontFamily: Fonts?.sans, fontSize: 16 }, proofImage: { height: 320, width: '100%', borderRadius: 15 }, button: { minHeight: 54, borderRadius: 16, backgroundColor: Palette.orange, alignItems: 'center', justifyContent: 'center', padding: 14 }, buttonText: { fontFamily: Fonts?.rounded, color: Palette.white, fontSize: 15, fontWeight: '800' }, outline: { minHeight: 48, borderRadius: 16, borderWidth: 1, borderColor: Palette.ink, alignItems: 'center', justifyContent: 'center', padding: 12 }, outlineText: { fontFamily: Fonts?.rounded, color: Palette.ink, fontSize: 14, fontWeight: '800' }, disabled: { opacity: 0.5 }, title: { fontSize: 27, fontWeight: '800', color: Palette.ink, fontFamily: Fonts?.display },
});
