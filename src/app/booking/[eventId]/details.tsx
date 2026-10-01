import { Href, useLocalSearchParams, useRouter } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Fonts, MaxContentWidth, Palette, Radius } from '@/constants/theme';
import { useBooking } from '@/context/booking-context';
import { useEvents } from '@/context/events-context';
import { formatRupiah } from '@/data/events';

type FormErrors = {
  name?: string;
  phone?: string;
  rules?: string;
};

export default function ParticipantDetailsScreen() {
  const router = useRouter();
  const { eventId, spot } = useLocalSearchParams<{ eventId: string; spot?: string }>();
  const { draft, setSelection, setParticipant } = useBooking();
  const { events } = useEvents();
  const event = events.find((item) => item.id === eventId);
  const selectedSpot = draft.eventId === eventId && draft.spot ? draft.spot : Number(spot);
  const [name, setName] = useState(draft.participantName);
  const [phone, setPhone] = useState(draft.participantPhone);
  const [notes, setNotes] = useState(draft.notes);
  const [agreed, setAgreed] = useState(draft.agreedToRules);
  const [errors, setErrors] = useState<FormErrors>({});

  if (!event || !selectedSpot) {
    return (
      <SafeAreaView style={styles.notFound}>
        <Text style={styles.notFoundTitle}>Pilih lapak terlebih dahulu</Text>
        <Pressable onPress={() => router.replace('/agenda')} style={styles.backToAgenda}>
          <Text style={styles.backToAgendaText}>Kembali ke agenda</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  const validateAndContinue = () => {
    const phoneDigits = phone.replace(/\D/g, '');
    const nextErrors: FormErrors = {};

    if (name.trim().length < 3) nextErrors.name = 'Masukkan nama lengkap minimal 3 karakter.';
    if (phoneDigits.length < 10 || phoneDigits.length > 15) {
      nextErrors.phone = 'Nomor HP harus terdiri dari 10 sampai 15 angka.';
    }
    if (!agreed) nextErrors.rules = 'Persetujuan aturan umpan wajib dicentang.';

    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setSelection(event.id, selectedSpot);
    setParticipant({
      participantName: name.trim(),
      participantPhone: phoneDigits,
      notes: notes.trim(),
      agreedToRules: agreed,
    });
    router.push(`/booking/${event.id}/payment` as Href);
  };

  return (
    <View style={styles.screen}>
      <KeyboardAvoidingView
        style={styles.page}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
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
              <Text style={styles.headerKicker}>BOOKING • LANGKAH 2</Text>
              <Text style={styles.headerTitle}>Data pemancing</Text>
            </View>
            <View style={styles.stepBadge}>
              <Text style={styles.stepBadgeText}>2/3</Text>
            </View>
          </View>
        </SafeAreaView>

        <ScrollView
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.content}>
          <View style={styles.bookingSummary}>
            <View style={styles.spotBadge}>
              <Text style={styles.spotBadgeLabel}>LAPAK</Text>
              <Text style={styles.spotBadgeValue}>{selectedSpot}</Text>
            </View>
            <View style={styles.summaryCopy}>
              <Text style={styles.summaryTitle}>{event.title}</Text>
              <Text style={styles.summaryMeta}>{event.shortDate} • {event.time}</Text>
            </View>
            <Text style={styles.summaryPrice}>{formatRupiah(event.price)}</Text>
          </View>

          <View style={styles.intro}>
            <Text style={styles.introKicker}>DATA PESERTA</Text>
            <Text style={styles.introTitle}>Siapa yang akan memancing?</Text>
            <Text style={styles.introText}>Data ini digunakan untuk tiket dan konfirmasi booking melalui WhatsApp.</Text>
          </View>

          <View style={styles.formCard}>
            <Text style={styles.fieldLabel}>NAMA LENGKAP</Text>
            <View style={[styles.inputShell, errors.name && styles.inputShellError]}>
              <Text style={styles.inputMarker}>A</Text>
              <TextInput
                value={name}
                onChangeText={(value) => {
                  setName(value);
                  if (errors.name) setErrors((current) => ({ ...current, name: undefined }));
                }}
                placeholder="Contoh: Budi Santoso"
                placeholderTextColor="#9AA6A2"
                autoCapitalize="words"
                style={styles.input}
              />
            </View>
            {errors.name && <Text style={styles.errorText}>{errors.name}</Text>}

            <Text style={[styles.fieldLabel, styles.fieldSpacing]}>NOMOR HP / WHATSAPP</Text>
            <View style={[styles.inputShell, errors.phone && styles.inputShellError]}>
              <Text style={styles.countryCode}>+62</Text>
              <TextInput
                value={phone}
                onChangeText={(value) => {
                  setPhone(value);
                  if (errors.phone) setErrors((current) => ({ ...current, phone: undefined }));
                }}
                placeholder="812 3456 7890"
                placeholderTextColor="#9AA6A2"
                keyboardType="phone-pad"
                style={styles.input}
              />
            </View>
            {errors.phone && <Text style={styles.errorText}>{errors.phone}</Text>}

            <Text style={[styles.fieldLabel, styles.fieldSpacing]}>CATATAN TAMBAHAN • OPSIONAL</Text>
            <View style={[styles.inputShell, styles.notesShell]}>
              <TextInput
                value={notes}
                onChangeText={setNotes}
                placeholder="Contoh: Datang bersama komunitas..."
                placeholderTextColor="#9AA6A2"
                multiline
                maxLength={180}
                textAlignVertical="top"
                style={[styles.input, styles.notesInput]}
              />
              <Text style={styles.characterCount}>{notes.length}/180</Text>
            </View>
          </View>

          <Pressable
            onPress={() => {
              setAgreed((current) => !current);
              if (errors.rules) setErrors((current) => ({ ...current, rules: undefined }));
            }}
            style={[styles.ruleAgreement, errors.rules && styles.ruleAgreementError]}>
            <View style={[styles.checkbox, agreed && styles.checkboxChecked]}>
              {agreed && <Text style={styles.checkmark}>✓</Text>}
            </View>
            <View style={styles.ruleCopy}>
              <Text style={styles.ruleTitle}>Saya memahami aturan umpan kolam</Text>
              <Text style={styles.ruleText}>
                Umpan wajib berasal dari bahan alami. Essen atau pemanis hanya boleh sebagai campuran.
              </Text>
            </View>
          </Pressable>
          {errors.rules && <Text style={styles.ruleError}>{errors.rules}</Text>}

          <View style={styles.privacyNote}>
            <Text style={styles.privacyMark}>i</Text>
            <Text style={styles.privacyText}>Data hanya digunakan untuk keperluan booking event pemancingan ini.</Text>
          </View>
        </ScrollView>

        <SafeAreaView edges={['bottom']} style={styles.footerSafeArea}>
          <View style={styles.footer}>
            <View>
              <Text style={styles.footerLabel}>TOTAL SEMENTARA</Text>
              <Text style={styles.footerPrice}>{formatRupiah(event.price)}</Text>
            </View>
            <Pressable
              onPress={validateAndContinue}
              style={({ pressed }) => [styles.continueButton, pressed && styles.pressed]}>
              <Text style={styles.continueButtonText}>Pilih pembayaran</Text>
              <Text style={styles.continueButtonArrow}>→</Text>
            </Pressable>
          </View>
        </SafeAreaView>
      </KeyboardAvoidingView>
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
  content: { paddingHorizontal: 15, paddingBottom: 125 },
  bookingSummary: { minHeight: 84, marginTop: 15, padding: 12, borderRadius: Radius.medium, backgroundColor: Palette.surface, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#E7E1D5' },
  spotBadge: { width: 55, height: 58, borderRadius: 14, backgroundColor: Palette.orange, alignItems: 'center', justifyContent: 'center' },
  spotBadgeLabel: { color: '#FFD8CD', fontFamily: Fonts?.rounded, fontSize: 7, fontWeight: '900', letterSpacing: 0.8 },
  spotBadgeValue: { color: Palette.white, fontFamily: Fonts?.display, fontSize: 24, lineHeight: 26, fontWeight: '900' },
  summaryCopy: { flex: 1, paddingHorizontal: 11 },
  summaryTitle: { color: Palette.ink, fontFamily: Fonts?.display, fontSize: 17, fontWeight: '900' },
  summaryMeta: { color: Palette.muted, fontFamily: Fonts?.sans, fontSize: 8, marginTop: 4 },
  summaryPrice: { color: Palette.orange, fontFamily: Fonts?.display, fontSize: 17, fontWeight: '900' },
  intro: { marginTop: 28, marginBottom: 15, paddingHorizontal: 2 },
  introKicker: { color: Palette.orange, fontFamily: Fonts?.rounded, fontSize: 8, fontWeight: '900', letterSpacing: 1.3 },
  introTitle: { color: Palette.ink, fontFamily: Fonts?.display, fontSize: 27, fontWeight: '900', letterSpacing: -0.4, marginTop: 2 },
  introText: { color: Palette.muted, fontFamily: Fonts?.sans, fontSize: 10, lineHeight: 15, maxWidth: 360, marginTop: 5 },
  formCard: { backgroundColor: Palette.surface, borderRadius: Radius.large, padding: 16, borderWidth: 1, borderColor: '#E7E1D5' },
  fieldLabel: { color: Palette.inkSoft, fontFamily: Fonts?.rounded, fontSize: 8, fontWeight: '900', letterSpacing: 1 },
  fieldSpacing: { marginTop: 17 },
  inputShell: { height: 54, marginTop: 7, borderRadius: 14, backgroundColor: '#F0F2EC', borderWidth: 1.5, borderColor: 'transparent', paddingHorizontal: 13, flexDirection: 'row', alignItems: 'center' },
  inputShellError: { borderColor: Palette.orange, backgroundColor: '#FFF4F0' },
  inputMarker: { width: 27, color: Palette.orange, fontFamily: Fonts?.serif, fontStyle: 'italic', fontSize: 20, fontWeight: '900' },
  countryCode: { color: Palette.ink, fontFamily: Fonts?.rounded, fontSize: 12, fontWeight: '900', paddingRight: 11, marginRight: 10, borderRightWidth: 1, borderRightColor: '#CDD4CD' },
  input: { flex: 1, height: '100%', color: Palette.ink, fontFamily: Fonts?.sans, fontSize: 12 },
  notesShell: { height: 103, alignItems: 'flex-start', paddingTop: 9 },
  notesInput: { minHeight: 72, paddingTop: 2, paddingRight: 34 },
  characterCount: { position: 'absolute', right: 11, bottom: 9, color: Palette.muted, fontFamily: Fonts?.rounded, fontSize: 7 },
  errorText: { color: Palette.orangeDark, fontFamily: Fonts?.sans, fontSize: 8, marginTop: 5 },
  ruleAgreement: { marginTop: 13, borderRadius: Radius.medium, backgroundColor: Palette.gold, padding: 14, flexDirection: 'row', borderWidth: 1.5, borderColor: 'transparent' },
  ruleAgreementError: { borderColor: Palette.orange },
  checkbox: { width: 25, height: 25, borderRadius: 8, borderWidth: 2, borderColor: Palette.inkSoft, alignItems: 'center', justifyContent: 'center', marginRight: 11 },
  checkboxChecked: { backgroundColor: Palette.ink, borderColor: Palette.ink },
  checkmark: { color: Palette.white, fontSize: 14, fontWeight: '900' },
  ruleCopy: { flex: 1 },
  ruleTitle: { color: Palette.ink, fontFamily: Fonts?.rounded, fontSize: 11, fontWeight: '900' },
  ruleText: { color: Palette.inkSoft, fontFamily: Fonts?.sans, fontSize: 9, lineHeight: 14, marginTop: 3 },
  ruleError: { color: Palette.orangeDark, fontFamily: Fonts?.sans, fontSize: 8, marginTop: 5, paddingHorizontal: 3 },
  privacyNote: { marginTop: 13, paddingHorizontal: 8, flexDirection: 'row', alignItems: 'center', gap: 8 },
  privacyMark: { color: Palette.muted, fontFamily: Fonts?.serif, fontStyle: 'italic', fontSize: 16, fontWeight: '900' },
  privacyText: { flex: 1, color: Palette.muted, fontFamily: Fonts?.sans, fontSize: 8, lineHeight: 12 },
  footerSafeArea: { position: 'absolute', left: 0, right: 0, bottom: 0, backgroundColor: Palette.surface, borderTopWidth: 1, borderTopColor: Palette.line },
  footer: { minHeight: 83, paddingHorizontal: 15, paddingVertical: 11, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  footerLabel: { color: Palette.muted, fontFamily: Fonts?.rounded, fontSize: 7, fontWeight: '900', letterSpacing: 1 },
  footerPrice: { color: Palette.ink, fontFamily: Fonts?.display, fontSize: 21, fontWeight: '900', marginTop: 2 },
  continueButton: { height: 52, minWidth: 196, borderRadius: 16, backgroundColor: Palette.orange, paddingHorizontal: 17, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 14 },
  continueButtonText: { color: Palette.white, fontFamily: Fonts?.rounded, fontSize: 11, fontWeight: '900' },
  continueButtonArrow: { color: Palette.white, fontSize: 19, marginTop: -2 },
  pressed: { opacity: 0.82, transform: [{ scale: 0.985 }] },
  notFound: { flex: 1, backgroundColor: Palette.paper, alignItems: 'center', justifyContent: 'center', padding: 24 },
  notFoundTitle: { color: Palette.ink, fontFamily: Fonts?.display, fontSize: 26, fontWeight: '900' },
  backToAgenda: { marginTop: 18, backgroundColor: Palette.orange, borderRadius: 14, paddingHorizontal: 18, paddingVertical: 13 },
  backToAgendaText: { color: Palette.white, fontFamily: Fonts?.rounded, fontWeight: '900' },
});
