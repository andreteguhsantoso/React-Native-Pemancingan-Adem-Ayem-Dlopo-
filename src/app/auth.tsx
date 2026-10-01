import { Image } from 'expo-image';
import { Href, useLocalSearchParams, useRouter } from 'expo-router';
import { ComponentProps, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
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
import { useAuth } from '@/context/auth-context';

type Mode = 'login' | 'register';

export default function AuthScreen() {
  const router = useRouter();
  const { redirect } = useLocalSearchParams<{ redirect?: string }>();
  const { configured, requestPasswordReset, signIn, signUp } = useAuth();
  const [mode, setMode] = useState<Mode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [phone, setPhone] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const forgotPassword = async () => {
    if (!email.includes('@')) return setErrorMessage('Masukkan email akun terlebih dahulu.');
    setSubmitting(true);
    setErrorMessage('');
    try {
      await requestPasswordReset(email);
      Alert.alert('Email pemulihan dikirim', 'Periksa inbox atau folder spam, lalu buka tautannya melalui perangkat ini.');
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Email pemulihan gagal dikirim.');
    } finally { setSubmitting(false); }
  };

  const finish = () => router.replace((redirect || '/profile') as Href);

  const submit = async () => {
    if (!configured || submitting) return;
    setErrorMessage('');

    if (!email.includes('@')) return setErrorMessage('Masukkan alamat email yang valid.');
    if (password.length < 8) return setErrorMessage('Password minimal 8 karakter.');
    if (mode === 'register' && fullName.trim().length < 3) return setErrorMessage('Nama lengkap minimal 3 karakter.');
    if (mode === 'register' && !/^[a-zA-Z0-9_]{3,24}$/.test(username)) {
      return setErrorMessage('Username 3-24 karakter dan hanya boleh berisi huruf, angka, atau garis bawah.');
    }
    if (mode === 'register' && !/^[0-9]{10,15}$/.test(phone.replace(/\D/g, ''))) {
      return setErrorMessage('Nomor WhatsApp harus terdiri dari 10-15 angka.');
    }

    setSubmitting(true);
    try {
      if (mode === 'login') {
        await signIn(email, password);
        finish();
      } else {
        const result = await signUp({ email, password, username, fullName, phone });
        if (result.confirmationRequired) {
          Alert.alert('Periksa email Anda', 'Klik tautan verifikasi yang kami kirim, kemudian masuk ke aplikasi.');
          setMode('login');
        } else {
          finish();
        }
      }
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Terjadi kesalahan. Silakan coba lagi.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={styles.screen}>
      <KeyboardAvoidingView style={styles.page} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <SafeAreaView edges={['top']} style={styles.safeArea}>
          <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.content}>
            <View style={styles.topRow}>
              <Pressable onPress={() => router.back()} style={styles.closeButton}>
                <Text style={styles.closeText}>×</Text>
              </Pressable>
              <Text style={styles.guestHint}>Melihat-lihat tidak perlu login</Text>
            </View>

            <View style={styles.brandBlock}>
              <Image source={require('../../assets/images/nila/brand-adem-ayem-icon.png')} contentFit="contain" style={styles.logo} />
              <Text style={styles.kicker}>PEMANCINGAN ADEM AYEM DLOPO</Text>
              <Text style={styles.title}>{mode === 'login' ? 'Masuk untuk memesan.' : 'Buat akun pemancing.'}</Text>
              <Text style={styles.subtitle}>
                Akun diperlukan untuk menjaga tiket, riwayat pesanan, dan pilihan lapak Anda.
              </Text>
            </View>

            {!configured ? (
              <View style={styles.setupCard}>
                <Text style={styles.setupTitle}>Backend belum dihubungkan</Text>
                <Text style={styles.setupText}>
                  Isi file .env menggunakan URL dan publishable key Supabase. Semua halaman publik tetap dapat dilihat.
                </Text>
                <Pressable onPress={() => router.replace('/')} style={styles.secondaryButton}>
                  <Text style={styles.secondaryButtonText}>Lanjut sebagai tamu</Text>
                </Pressable>
                <Pressable onPress={() => router.push('/backend-status' as Href)} style={styles.diagnosticButton}>
                  <Text style={styles.diagnosticText}>Periksa konfigurasi backend</Text>
                </Pressable>
              </View>
            ) : (
              <View style={styles.formCard}>
                {mode === 'register' ? (
                  <>
                    <Field label="NAMA LENGKAP" value={fullName} onChangeText={setFullName} placeholder="Nama pada tiket" autoCapitalize="words" />
                    <Field label="USERNAME" value={username} onChangeText={setUsername} placeholder="contoh: pemancing_kediri" autoCapitalize="none" />
                    <Field label="NOMOR WHATSAPP" value={phone} onChangeText={setPhone} placeholder="081234567890" keyboardType="phone-pad" />
                  </>
                ) : null}
                <Field label="EMAIL" value={email} onChangeText={setEmail} placeholder="nama@email.com" keyboardType="email-address" autoCapitalize="none" />
                <Field label="PASSWORD" value={password} onChangeText={setPassword} placeholder="Minimal 8 karakter" secureTextEntry autoCapitalize="none" />

                {mode === 'login' ? <Pressable disabled={submitting} onPress={forgotPassword} style={styles.forgotButton}><Text style={styles.forgotText}>Lupa password?</Text></Pressable> : null}

                {errorMessage ? <Text style={styles.error}>{errorMessage}</Text> : null}

                <Pressable disabled={submitting} onPress={submit} style={[styles.primaryButton, submitting && styles.disabled]}>
                  {submitting ? <ActivityIndicator color={Palette.white} /> : <Text style={styles.primaryButtonText}>{mode === 'login' ? 'Masuk' : 'Daftar sekarang'}</Text>}
                </Pressable>

                <Pressable onPress={() => { setMode(mode === 'login' ? 'register' : 'login'); setErrorMessage(''); }} style={styles.switchButton}>
                  <Text style={styles.switchText}>{mode === 'login' ? 'Belum punya akun? Daftar' : 'Sudah punya akun? Masuk'}</Text>
                </Pressable>
              </View>
            )}
          </ScrollView>
        </SafeAreaView>
      </KeyboardAvoidingView>
    </View>
  );
}

type FieldProps = ComponentProps<typeof TextInput> & { label: string };

function Field({ label, ...props }: FieldProps) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput placeholderTextColor="#91A09D" style={styles.input} {...props} />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#D8D2C5', alignItems: 'center' },
  page: { flex: 1, width: '100%', maxWidth: MaxContentWidth, backgroundColor: Palette.ink },
  safeArea: { flex: 1 },
  content: { flexGrow: 1, padding: 20, paddingBottom: 40 },
  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  closeButton: { width: 44, height: 44, borderRadius: 15, backgroundColor: Palette.inkSoft, alignItems: 'center', justifyContent: 'center' },
  closeText: { color: Palette.white, fontSize: 27, lineHeight: 29 },
  guestHint: { color: '#AFC7C3', fontFamily: Fonts?.rounded, fontSize: 9, fontWeight: '800' },
  brandBlock: { marginTop: 28, marginBottom: 22 },
  logo: { width: 70, height: 70, marginBottom: 18 },
  kicker: { color: Palette.gold, fontFamily: Fonts?.rounded, fontSize: 9, fontWeight: '900', letterSpacing: 1.4 },
  title: { color: Palette.white, fontFamily: Fonts?.display, fontSize: 36, lineHeight: 39, fontWeight: '900', marginTop: 5 },
  subtitle: { color: '#B9CFCC', fontFamily: Fonts?.sans, fontSize: 11, lineHeight: 17, marginTop: 8, maxWidth: 390 },
  formCard: { backgroundColor: Palette.surface, borderRadius: Radius.large, padding: 17, gap: 14 },
  field: { gap: 7 },
  fieldLabel: { color: Palette.inkSoft, fontFamily: Fonts?.rounded, fontSize: 8, fontWeight: '900', letterSpacing: 1 },
  input: { height: 53, borderRadius: 14, backgroundColor: '#EEF2EC', color: Palette.ink, fontFamily: Fonts?.sans, fontSize: 12, paddingHorizontal: 14, borderWidth: 1, borderColor: '#DFE5DD' },
  error: { color: Palette.orangeDark, backgroundColor: '#FFF0EB', borderRadius: 10, padding: 10, fontFamily: Fonts?.sans, fontSize: 9, lineHeight: 14 },
  primaryButton: { height: 54, borderRadius: 16, backgroundColor: Palette.orange, alignItems: 'center', justifyContent: 'center', marginTop: 2 },
  primaryButtonText: { color: Palette.white, fontFamily: Fonts?.rounded, fontSize: 12, fontWeight: '900' },
  disabled: { opacity: 0.65 },
  switchButton: { alignItems: 'center', paddingVertical: 8 },
  switchText: { color: Palette.inkSoft, fontFamily: Fonts?.rounded, fontSize: 10, fontWeight: '900' },
  forgotButton: { alignSelf: 'flex-end', marginTop: -6, paddingVertical: 3 },
  forgotText: { color: Palette.orangeDark, fontFamily: Fonts?.rounded, fontSize: 9, fontWeight: '900' },
  setupCard: { backgroundColor: Palette.gold, borderRadius: Radius.large, padding: 18 },
  setupTitle: { color: Palette.ink, fontFamily: Fonts?.display, fontSize: 22, fontWeight: '900' },
  setupText: { color: Palette.inkSoft, fontFamily: Fonts?.sans, fontSize: 10, lineHeight: 16, marginTop: 5 },
  secondaryButton: { height: 48, borderRadius: 14, backgroundColor: Palette.ink, alignItems: 'center', justifyContent: 'center', marginTop: 16 },
  secondaryButtonText: { color: Palette.white, fontFamily: Fonts?.rounded, fontSize: 10, fontWeight: '900' },
  diagnosticButton: { alignItems: 'center', paddingTop: 13 },
  diagnosticText: { color: Palette.ink, fontFamily: Fonts?.rounded, fontSize: 9, fontWeight: '900', textDecorationLine: 'underline' },
});
