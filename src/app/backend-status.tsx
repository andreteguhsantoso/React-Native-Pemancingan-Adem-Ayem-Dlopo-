import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Fonts, MaxContentWidth, Palette, Radius } from '@/constants/theme';
import { useAuth } from '@/context/auth-context';
import { fetchPaymentSettings } from '@/services/payment-service';
import { getSupabaseConfigStatus, isSupabaseConfigured, requireSupabase } from '@/lib/supabase';

type CheckState = 'idle' | 'checking' | 'success' | 'failed';

export default function BackendStatusScreen() {
  const router = useRouter();
  const { session } = useAuth();
  const config = getSupabaseConfigStatus();
  const [database, setDatabase] = useState<CheckState>('idle');
  const [storage, setStorage] = useState<CheckState>('idle');
  const [payments, setPayments] = useState<CheckState>('idle');
  const [paymentDetail, setPaymentDetail] = useState('Masuk untuk memeriksa migrasi pembayaran dan rekening transfer.');
  const [message, setMessage] = useState('');

  const runChecks = async () => {
    if (database === 'checking' || storage === 'checking') return;
    if (!isSupabaseConfigured) {
      setMessage('Buat file .env dan isi URL serta publishable key Supabase, kemudian restart Expo.');
      return;
    }
    setMessage('');
    setDatabase('checking');
    setStorage('checking');
    const client = requireSupabase();
    try {
      const [databaseResult, storageResult] = await Promise.all([
        client.from('venue_settings').select('id').limit(1),
        client.storage.from('gallery').list('', { limit: 1 }),
      ]);
      setDatabase(databaseResult.error ? 'failed' : 'success');
      setStorage(storageResult.error ? 'failed' : 'success');
      const error = databaseResult.error ?? storageResult.error;
      setMessage(error ? 'Database atau storage belum dapat diperiksa. Periksa koneksi dan panduan migrasi.' : 'Database informasi dan storage dapat diakses. Pemeriksaan ini tidak melakukan booking atau transfer uang.');
      if (session) {
        setPayments('checking');
        try {
          const settings = await fetchPaymentSettings();
          const proofs = await client.from('manual_payment_submissions').select('id').limit(1);
          if (proofs.error) throw new Error('Tabel bukti transfer belum tersedia. Jalankan migrasi 202609290001 lalu 202609290002.');
          setPayments('success');
          setPaymentDetail(settings.transfer_enabled ? 'Tabel pembayaran tersedia; transfer bank manual diaktifkan. Gateway otomatis belum aktif.' : 'Tabel pembayaran tersedia, tetapi rekening transfer belum diaktifkan admin. Reservasi bukan tiket lunas.');
        } catch (cause) { setPayments('failed'); setPaymentDetail(cause instanceof Error ? cause.message : 'Jalankan migrasi pembayaran terbaru.'); }
      } else { setPayments('idle'); setPaymentDetail('Masuk untuk memeriksa migrasi pembayaran dan rekening transfer.'); }
    } catch { setDatabase('failed'); setStorage('failed'); setPayments('idle'); setMessage('Koneksi ke server terputus. Periksa jaringan lalu coba kembali.'); }
  };

  return <View style={styles.screen}><SafeAreaView style={styles.page}>
    <View style={styles.header}><Pressable onPress={() => router.back()} style={styles.back}><Text style={styles.backText}>‹</Text></Pressable><View><Text style={styles.kicker}>DIAGNOSTIK</Text><Text style={styles.headerTitle}>Status backend</Text></View></View>
    <ScrollView contentContainerStyle={styles.content}>
      <View style={styles.hero}><Text style={styles.heroLabel}>{isSupabaseConfigured ? 'KONFIGURASI DITEMUKAN' : 'BELUM TERHUBUNG'}</Text><Text style={styles.heroTitle}>{isSupabaseConfigured ? 'Periksa layanan online.' : 'Supabase belum aktif.'}</Text><Text style={styles.heroText}>Pemeriksaan ini tidak menampilkan atau menyimpan publishable key Anda.</Text></View>
      <StatusRow label="Project URL" detail={config.projectHost ?? 'EXPO_PUBLIC_SUPABASE_URL belum diisi'} state={config.hasUrl ? 'success' : 'failed'} />
      <StatusRow label="Publishable key" detail={config.hasPublishableKey ? 'Variabel ditemukan' : 'EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY belum diisi'} state={config.hasPublishableKey ? 'success' : 'failed'} />
      <StatusRow label="Database & migrasi" detail="Tabel venue_settings dapat dibaca" state={database} />
      <StatusRow label="Storage foto" detail="Bucket gallery dapat diakses" state={storage} />
      <StatusRow label="Booking & pembayaran" detail={paymentDetail} state={payments} />
      {message ? <View style={styles.message}><Text style={styles.messageText}>{message}</Text></View> : null}
      <Pressable disabled={database === 'checking' || storage === 'checking' || payments === 'checking'} onPress={runChecks} style={styles.button}>{database === 'checking' || storage === 'checking' || payments === 'checking' ? <ActivityIndicator color={Palette.white} /> : <Text style={styles.buttonText}>Jalankan pemeriksaan</Text>}</Pressable>
      <Text style={styles.note}>Jika `.env` baru dibuat, hentikan server Expo lalu jalankan kembali `npx expo start --clear`.</Text>
    </ScrollView>
  </SafeAreaView></View>;
}

function StatusRow({ label, detail, state }: { label: string; detail: string; state: CheckState }) {
  const marker = state === 'success' ? 'OK' : state === 'failed' ? '!' : state === 'checking' ? '...' : '-';
  return <View style={styles.statusRow}><View style={[styles.marker, state === 'success' && styles.markerOk, state === 'failed' && styles.markerFailed]}><Text style={styles.markerText}>{marker}</Text></View><View style={styles.statusCopy}><Text style={styles.statusLabel}>{label}</Text><Text style={styles.statusDetail}>{detail}</Text></View></View>;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#D8D2C5', alignItems: 'center' }, page: { flex: 1, width: '100%', maxWidth: MaxContentWidth, backgroundColor: Palette.paper }, header: { minHeight: 76, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: Palette.ink }, back: { width: 44, height: 44, borderRadius: 15, alignItems: 'center', justifyContent: 'center', backgroundColor: Palette.inkSoft }, backText: { color: Palette.white, fontSize: 32 }, kicker: { color: Palette.gold, fontFamily: Fonts?.rounded, fontSize: 8, fontWeight: '900', letterSpacing: 1.2 }, headerTitle: { color: Palette.white, fontFamily: Fonts?.display, fontSize: 24, fontWeight: '900' }, content: { padding: 16, paddingBottom: 40 }, hero: { borderRadius: Radius.large, backgroundColor: Palette.gold, padding: 18, marginBottom: 14 }, heroLabel: { color: Palette.orangeDark, fontFamily: Fonts?.rounded, fontSize: 8, fontWeight: '900', letterSpacing: 1 }, heroTitle: { color: Palette.ink, fontFamily: Fonts?.display, fontSize: 26, fontWeight: '900', marginTop: 4 }, heroText: { color: Palette.inkSoft, fontFamily: Fonts?.sans, fontSize: 9, lineHeight: 14, marginTop: 6 }, statusRow: { minHeight: 72, borderRadius: Radius.medium, backgroundColor: Palette.surface, padding: 12, marginBottom: 8, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#E5DED1' }, marker: { width: 40, height: 40, borderRadius: 13, backgroundColor: '#E8ECE8', alignItems: 'center', justifyContent: 'center' }, markerOk: { backgroundColor: Palette.mint }, markerFailed: { backgroundColor: '#FFE4DA' }, markerText: { color: Palette.ink, fontFamily: Fonts?.rounded, fontSize: 9, fontWeight: '900' }, statusCopy: { flex: 1, paddingLeft: 11 }, statusLabel: { color: Palette.ink, fontFamily: Fonts?.rounded, fontSize: 11, fontWeight: '900' }, statusDetail: { color: Palette.muted, fontFamily: Fonts?.sans, fontSize: 8, marginTop: 3 }, message: { borderRadius: 13, backgroundColor: '#EEF2EC', padding: 12, marginTop: 5 }, messageText: { color: Palette.inkSoft, fontFamily: Fonts?.sans, fontSize: 9, lineHeight: 14 }, button: { height: 52, borderRadius: 15, backgroundColor: Palette.orange, alignItems: 'center', justifyContent: 'center', marginTop: 14 }, buttonText: { color: Palette.white, fontFamily: Fonts?.rounded, fontSize: 11, fontWeight: '900' }, note: { color: Palette.muted, fontFamily: Fonts?.sans, fontSize: 8, lineHeight: 13, textAlign: 'center', marginTop: 12 },
});
