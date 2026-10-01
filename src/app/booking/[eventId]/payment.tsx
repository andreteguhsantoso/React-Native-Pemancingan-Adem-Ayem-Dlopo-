import { Href, useLocalSearchParams, useRouter } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useRef, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Fonts, MaxContentWidth, Palette, Radius } from '@/constants/theme';
import { useAuth } from '@/context/auth-context';
import { PaymentMethod, useBooking } from '@/context/booking-context';
import { useEvents } from '@/context/events-context';
import { formatRupiah } from '@/data/events';
import { createRemoteBooking } from '@/services/booking-service';
import { useFocusResource } from '@/hooks/use-focus-resource';
import { fetchPaymentSettings, PaymentSettings } from '@/services/payment-service';

const SERVICE_FEE = 0;

const paymentMethods: {
  id: PaymentMethod;
  short: string;
  title: string;
  description: string;
  badge?: string;
}[] = [
  { id: 'qris', short: 'QR', title: 'QRIS', description: 'Menunggu integrasi payment gateway' },
  { id: 'virtual_account', short: 'VA', title: 'Virtual Account', description: 'BCA, BRI, BNI, Mandiri, dan bank lain' },
  { id: 'ewallet', short: 'EW', title: 'E-Wallet', description: 'GoPay, OVO, DANA, dan ShopeePay' },
  { id: 'bank_transfer', short: 'TF', title: 'Transfer Bank', description: 'Verifikasi manual oleh pengelola' },
  { id: 'reserve_only', short: 'RS', title: 'Reservasi dahulu', description: 'Belum membayar; lapak hanya ditahan sementara' },
];

export default function PaymentScreen() {
  const router = useRouter();
  const { eventId } = useLocalSearchParams<{ eventId: string }>();
  const { draft, setPaymentMethod, completeBooking } = useBooking();
  const { events } = useEvents();
  const { configured, session } = useAuth();
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod>('bank_transfer');
  const [processing, setProcessing] = useState(false);
  const busy = useRef(false);
  const { data: settings, error: settingsError, refreshing: settingsLoading, refresh } = useFocusResource<PaymentSettings | null>(fetchPaymentSettings, null, configured && Boolean(session));
  const actualMethod = selectedMethod === 'bank_transfer' && settings?.transfer_enabled ? 'bank_transfer' : 'reserve_only';
  const event = events.find((item) => item.id === eventId);

  if (!event || draft.eventId !== eventId || !draft.spot || !draft.participantName) {
    return (
      <SafeAreaView style={styles.notFound}>
        <Text style={styles.notFoundTitle}>Data booking belum lengkap</Text>
        <Pressable onPress={() => router.replace('/agenda')} style={styles.backToAgenda}>
          <Text style={styles.backToAgendaText}>Mulai dari agenda</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  const total = event.price + SERVICE_FEE;

  const processPayment = async () => {
    if (busy.current) return;
    if (!session) {
      router.push(`/auth?redirect=${encodeURIComponent(`/booking/${event.id}/payment`)}` as Href);
      return;
    }
    if (!configured) {
      Alert.alert('Backend belum terhubung', 'Hubungkan proyek Supabase sebelum membuat booking sungguhan.');
      return;
    }
    if (!settings || settingsError) return Alert.alert('Pembayaran belum siap', settingsError || 'Tunggu pengaturan pembayaran berhasil dimuat.');
    busy.current = true;
    setProcessing(true);
    try {
      setPaymentMethod(actualMethod);
      const result = await createRemoteBooking({ ...draft, paymentMethod: actualMethod });
      completeBooking(result.booking_code);
      router.replace(`/booking/${event.id}/${actualMethod === 'bank_transfer' ? 'transfer' : 'payment-status'}?bookingId=${result.booking_id}&code=${result.booking_code}` as Href);
    } catch (error) {
      Alert.alert('Booking belum berhasil', error instanceof Error ? error.message : 'Silakan coba kembali.');
    } finally {
      busy.current = false;
      setProcessing(false);
    }
  };

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
              <Text style={styles.headerKicker}>BOOKING • LANGKAH 3</Text>
              <Text style={styles.headerTitle}>Pembayaran</Text>
            </View>
            <View style={styles.stepBadge}>
              <Text style={styles.stepBadgeText}>3/3</Text>
            </View>
          </View>
        </SafeAreaView>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
          <View style={styles.demoBanner}>
            <View style={styles.demoMark}>
              <Text style={styles.demoMarkText}>INFO</Text>
            </View>
            <View style={styles.demoCopy}>
              <Text style={styles.demoTitle}>Amankan lapak terlebih dahulu</Text>
              <Text style={styles.demoText}>{settings?.transfer_enabled ? 'Transfer ke rekening yang ditampilkan setelah reservasi, lalu kirim bukti. Admin harus memeriksa uang masuk sebelum tiket aktif.' : 'Transfer belum diaktifkan pengelola. Reservasi saja tidak berarti tiket sudah dibeli; jangan mengirim uang ke rekening lain.'}</Text>
            </View>
          </View>
          {settingsError ? <View style={styles.demoBanner}><View style={styles.demoCopy}><Text style={styles.demoTitle}>Database booking perlu diperbarui</Text><Text style={styles.demoText}>{settingsError}</Text><Pressable onPress={refresh} style={{ minHeight: 44, justifyContent: 'center' }}><Text style={{ color: Palette.orangeDark, fontWeight: '800' }}>Periksa kembali</Text></Pressable></View></View> : null}

          <View style={styles.sectionHeader}>
            <View>
              <Text style={styles.sectionKicker}>METODE PEMBAYARAN</Text>
              <Text style={styles.sectionTitle}>Pilih yang paling mudah</Text>
            </View>
            <Text style={styles.sectionIndex}>03</Text>
          </View>

          <View style={styles.methodList}>
            {paymentMethods.map((method) => {
              const available = method.id === 'reserve_only' || (method.id === 'bank_transfer' && Boolean(settings?.transfer_enabled));
              const selected = actualMethod === method.id;
              return (
                <Pressable
                  key={method.id}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: selected, disabled: !available || processing }}
                  disabled={!available || processing}
                  onPress={() => setSelectedMethod(method.id)}
                  style={[styles.methodCard, selected && styles.methodCardSelected, !available && { opacity: 0.55 }]}>
                  <View style={[styles.methodIcon, selected && styles.methodIconSelected]}>
                    <Text style={[styles.methodIconText, selected && styles.methodIconTextSelected]}>{method.short}</Text>
                  </View>
                  <View style={styles.methodCopy}>
                    <View style={styles.methodTitleRow}>
                      <Text style={styles.methodTitle}>{method.title}</Text>
                      {!available && <Text style={styles.recommendedBadge}>BELUM AKTIF</Text>}
                    </View>
                    <Text style={styles.methodDescription}>{method.description}</Text>
                  </View>
                  <View style={[styles.radio, selected && styles.radioSelected]}>
                    {selected && <View style={styles.radioInner} />}
                  </View>
                </Pressable>
              );
            })}
          </View>

          <View style={styles.sectionHeader}>
            <View>
              <Text style={styles.sectionKicker}>RINGKASAN PESANAN</Text>
              <Text style={styles.sectionTitle}>Periksa sekali lagi</Text>
            </View>
            <Text style={styles.sectionIndex}>04</Text>
          </View>

          <View style={styles.orderCard}>
            <View style={styles.eventRow}>
              <View style={styles.dateBlock}>
                <Text style={styles.dateDay}>{event.shortDate.split(' ')[0]}</Text>
                <Text style={styles.dateMonth}>{event.shortDate.split(' ')[1]}</Text>
              </View>
              <View style={styles.eventCopy}>
                <Text style={styles.eventTitle}>{event.title}</Text>
                <Text style={styles.eventMeta}>{event.time} • {event.fishKg} KG ikan nila</Text>
              </View>
            </View>

            <View style={styles.dataGrid}>
              <View style={styles.dataItem}>
                <Text style={styles.dataLabel}>PEMANCING</Text>
                <Text style={styles.dataValue}>{draft.participantName}</Text>
              </View>
              <View style={styles.dataItem}>
                <Text style={styles.dataLabel}>NOMOR LAPAK</Text>
                <Text style={styles.dataValue}>Lapak {draft.spot}</Text>
              </View>
            </View>

            <View style={styles.divider} />
            <View style={styles.priceRow}>
              <Text style={styles.priceRowLabel}>Tiket event × 1</Text>
              <Text style={styles.priceRowValue}>{formatRupiah(event.price)}</Text>
            </View>
            {SERVICE_FEE > 0 ? (
              <View style={styles.priceRow}>
                <Text style={styles.priceRowLabel}>Biaya layanan</Text>
                <Text style={styles.priceRowValue}>{formatRupiah(SERVICE_FEE)}</Text>
              </View>
            ) : null}
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Total pembayaran</Text>
              <Text style={styles.totalValue}>{formatRupiah(total)}</Text>
            </View>
          </View>

          <View style={styles.secureNote}>
            <Text style={styles.secureMark}>✓</Text>
            <Text style={styles.secureText}>{settings ? `Reservasi ditahan hingga ${settings.booking_hold_minutes} menit, atau sampai event dimulai. Mengirim bukti belum berarti pembayaran disetujui.` : 'Pengaturan reservasi sedang diperiksa.'}</Text>
          </View>
        </ScrollView>

        <SafeAreaView edges={['bottom']} style={styles.footerSafeArea}>
          <View style={styles.footer}>
            <View>
              <Text style={styles.footerLabel}>TOTAL BAYAR</Text>
              <Text style={styles.footerPrice}>{formatRupiah(total)}</Text>
            </View>
            <Pressable
              disabled={processing || (Boolean(session) && (!settings || Boolean(settingsError) || settingsLoading))}
              onPress={processPayment}
              style={({ pressed }) => [
                styles.payButton,
                (processing || (Boolean(session) && (!settings || Boolean(settingsError) || settingsLoading))) && styles.payButtonProcessing,
                pressed && !processing && styles.pressed,
              ]}>
              <Text style={styles.payButtonText}>{processing ? 'Menyimpan...' : settingsError ? 'Perbarui database' : actualMethod === 'bank_transfer' ? 'Lanjut transfer' : 'Buat reservasi'}</Text>
              {!processing && <Text style={styles.payButtonArrow}>→</Text>}
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
  content: { paddingHorizontal: 15, paddingBottom: 128 },
  demoBanner: { marginTop: 15, borderRadius: Radius.medium, backgroundColor: Palette.gold, padding: 13, flexDirection: 'row', alignItems: 'center' },
  demoMark: { width: 45, height: 38, borderRadius: 11, backgroundColor: Palette.orange, alignItems: 'center', justifyContent: 'center', marginRight: 11 },
  demoMarkText: { color: Palette.white, fontFamily: Fonts?.rounded, fontSize: 9, fontWeight: '900', letterSpacing: 0.7 },
  demoCopy: { flex: 1 },
  demoTitle: { color: Palette.ink, fontFamily: Fonts?.rounded, fontSize: 11, fontWeight: '900' },
  demoText: { color: Palette.inkSoft, fontFamily: Fonts?.sans, fontSize: 13, lineHeight: 20, marginTop: 4 },
  sectionHeader: { marginTop: 27, marginBottom: 13, paddingHorizontal: 2, flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' },
  sectionKicker: { color: Palette.orange, fontFamily: Fonts?.rounded, fontSize: 8, fontWeight: '900', letterSpacing: 1.3 },
  sectionTitle: { color: Palette.ink, fontFamily: Fonts?.display, fontSize: 25, fontWeight: '900', letterSpacing: -0.4, marginTop: 2 },
  sectionIndex: { color: '#D5DAD2', fontFamily: Fonts?.serif, fontStyle: 'italic', fontSize: 30, fontWeight: '900' },
  methodList: { gap: 9 },
  methodCard: { minHeight: 72, borderRadius: Radius.medium, backgroundColor: Palette.surface, borderWidth: 1.5, borderColor: '#E4E2D9', paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center' },
  methodCardSelected: { borderColor: Palette.orange, backgroundColor: '#FFF8F4' },
  methodIcon: { width: 44, height: 44, borderRadius: 13, backgroundColor: '#E8ECE5', alignItems: 'center', justifyContent: 'center' },
  methodIconSelected: { backgroundColor: Palette.orange },
  methodIconText: { color: Palette.ink, fontFamily: Fonts?.display, fontSize: 15, fontWeight: '900' },
  methodIconTextSelected: { color: Palette.white },
  methodCopy: { flex: 1, paddingHorizontal: 11 },
  methodTitleRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 7 },
  methodTitle: { color: Palette.ink, fontFamily: Fonts?.rounded, fontSize: 15, fontWeight: '900' },
  recommendedBadge: { color: Palette.ink, backgroundColor: Palette.gold, borderRadius: 5, overflow: 'hidden', paddingHorizontal: 6, paddingVertical: 3, fontFamily: Fonts?.rounded, fontSize: 9, fontWeight: '900', letterSpacing: 0.6 },
  methodDescription: { color: Palette.muted, fontFamily: Fonts?.sans, fontSize: 12, lineHeight: 18, marginTop: 3 },
  radio: { width: 21, height: 21, borderRadius: 12, borderWidth: 2, borderColor: '#AAB4AF', alignItems: 'center', justifyContent: 'center' },
  radioSelected: { borderColor: Palette.orange },
  radioInner: { width: 10, height: 10, borderRadius: 6, backgroundColor: Palette.orange },
  orderCard: { borderRadius: Radius.large, backgroundColor: Palette.surface, padding: 16, borderWidth: 1, borderColor: '#E4E2D9' },
  eventRow: { flexDirection: 'row', alignItems: 'center' },
  dateBlock: { width: 52, height: 55, borderRadius: 14, backgroundColor: Palette.ink, alignItems: 'center', justifyContent: 'center' },
  dateDay: { color: Palette.gold, fontFamily: Fonts?.display, fontSize: 21, lineHeight: 22, fontWeight: '900' },
  dateMonth: { color: Palette.white, fontFamily: Fonts?.rounded, fontSize: 7, fontWeight: '900', letterSpacing: 1 },
  eventCopy: { flex: 1, paddingLeft: 11 },
  eventTitle: { color: Palette.ink, fontFamily: Fonts?.display, fontSize: 18, fontWeight: '900' },
  eventMeta: { color: Palette.muted, fontFamily: Fonts?.sans, fontSize: 8, marginTop: 4 },
  dataGrid: { flexDirection: 'row', gap: 8, marginTop: 14 },
  dataItem: { flex: 1, backgroundColor: '#F0F2EC', borderRadius: 12, padding: 11 },
  dataLabel: { color: Palette.muted, fontFamily: Fonts?.rounded, fontSize: 7, fontWeight: '900', letterSpacing: 0.8 },
  dataValue: { color: Palette.ink, fontFamily: Fonts?.rounded, fontSize: 10, fontWeight: '900', marginTop: 4 },
  divider: { height: 1, backgroundColor: Palette.line, marginVertical: 15 },
  priceRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 9 },
  priceRowLabel: { color: Palette.muted, fontFamily: Fonts?.sans, fontSize: 10 },
  priceRowValue: { color: Palette.ink, fontFamily: Fonts?.rounded, fontSize: 10, fontWeight: '800' },
  totalRow: { marginTop: 5, paddingTop: 13, borderTopWidth: 1, borderTopColor: Palette.line, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  totalLabel: { color: Palette.ink, fontFamily: Fonts?.rounded, fontSize: 12, fontWeight: '900' },
  totalValue: { color: Palette.orange, fontFamily: Fonts?.display, fontSize: 23, fontWeight: '900' },
  secureNote: { marginTop: 13, paddingHorizontal: 8, flexDirection: 'row', alignItems: 'center', gap: 8 },
  secureMark: { width: 19, height: 19, borderRadius: 10, overflow: 'hidden', textAlign: 'center', color: Palette.white, backgroundColor: Palette.success, fontSize: 12, fontWeight: '900' },
  secureText: { flex: 1, color: Palette.muted, fontFamily: Fonts?.sans, fontSize: 12, lineHeight: 18 },
  footerSafeArea: { position: 'absolute', left: 0, right: 0, bottom: 0, backgroundColor: Palette.surface, borderTopWidth: 1, borderTopColor: Palette.line },
  footer: { minHeight: 83, paddingHorizontal: 15, paddingVertical: 11, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  footerLabel: { color: Palette.muted, fontFamily: Fonts?.rounded, fontSize: 7, fontWeight: '900', letterSpacing: 1 },
  footerPrice: { color: Palette.ink, fontFamily: Fonts?.display, fontSize: 21, fontWeight: '900', marginTop: 2 },
  payButton: { height: 52, minWidth: 190, borderRadius: 16, backgroundColor: Palette.orange, paddingHorizontal: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 17 },
  payButtonProcessing: { backgroundColor: Palette.inkSoft },
  payButtonText: { color: Palette.white, fontFamily: Fonts?.rounded, fontSize: 12, fontWeight: '900' },
  payButtonArrow: { color: Palette.white, fontSize: 19, marginTop: -2 },
  pressed: { opacity: 0.82, transform: [{ scale: 0.985 }] },
  notFound: { flex: 1, backgroundColor: Palette.paper, alignItems: 'center', justifyContent: 'center', padding: 24 },
  notFoundTitle: { color: Palette.ink, fontFamily: Fonts?.display, fontSize: 26, fontWeight: '900' },
  backToAgenda: { marginTop: 18, backgroundColor: Palette.orange, borderRadius: 14, paddingHorizontal: 18, paddingVertical: 13 },
  backToAgendaText: { color: Palette.white, fontFamily: Fonts?.rounded, fontWeight: '900' },
});
