import * as Linking from 'expo-linking';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator, Alert, KeyboardAvoidingView, Platform, Pressable, StyleSheet,
  Text, TextInput, View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Fonts, MaxContentWidth, Palette, Radius } from '@/constants/theme';
import { useAuth } from '@/context/auth-context';
import { establishRecoverySession } from '@/services/auth-link-service';

export default function ResetPasswordScreen() {
  const router = useRouter();
  const url = Linking.useURL();
  const { configured, signOut, updatePassword } = useAuth();
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [preparing, setPreparing] = useState(configured);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState(configured ? '' : 'Backend belum dikonfigurasi.');

  useEffect(() => {
    if (!configured) return;
    if (!url) return;
    establishRecoverySession(url)
      .catch((error) => setErrorMessage(error instanceof Error ? error.message : 'Tautan pemulihan tidak dapat diproses.'))
      .finally(() => setPreparing(false));
  }, [configured, url]);

  const submit = async () => {
    if (password.length < 8) return setErrorMessage('Password baru minimal 8 karakter.');
    if (password !== confirmation) return setErrorMessage('Konfirmasi password belum sama.');
    setSubmitting(true);
    setErrorMessage('');
    try {
      await updatePassword(password);
      await signOut();
      Alert.alert('Password diperbarui', 'Silakan masuk kembali menggunakan password baru Anda.');
      router.replace('/auth');
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Password gagal diperbarui.');
    } finally { setSubmitting(false); }
  };

  return <View style={styles.screen}><KeyboardAvoidingView style={styles.page} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
    <SafeAreaView style={styles.safeArea}>
      <Pressable onPress={() => router.replace('/auth')} style={styles.closeButton}><Text style={styles.closeText}>×</Text></Pressable>
      <View style={styles.hero}>
        <Text style={styles.kicker}>KEAMANAN AKUN</Text>
        <Text style={styles.title}>Buat password baru.</Text>
        <Text style={styles.subtitle}>Gunakan minimal 8 karakter dan jangan menggunakan password yang sama dengan akun lain.</Text>
      </View>
      <View style={styles.card}>
        {preparing ? <View style={styles.loading}><ActivityIndicator color={Palette.orange} /><Text style={styles.loadingText}>Memeriksa tautan pemulihan...</Text></View> : <>
          <Text style={styles.label}>PASSWORD BARU</Text>
          <TextInput value={password} onChangeText={setPassword} secureTextEntry autoCapitalize="none" placeholder="Minimal 8 karakter" placeholderTextColor="#91A09D" style={styles.input} />
          <Text style={styles.label}>ULANGI PASSWORD</Text>
          <TextInput value={confirmation} onChangeText={setConfirmation} secureTextEntry autoCapitalize="none" placeholder="Ketik ulang password" placeholderTextColor="#91A09D" style={styles.input} />
          {errorMessage ? <Text style={styles.error}>{errorMessage}</Text> : null}
          <Pressable disabled={submitting || Boolean(errorMessage && !password)} onPress={submit} style={[styles.button, submitting && styles.disabled]}>
            {submitting ? <ActivityIndicator color={Palette.white} /> : <Text style={styles.buttonText}>Perbarui password</Text>}
          </Pressable>
        </>}
      </View>
    </SafeAreaView>
  </KeyboardAvoidingView></View>;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#D8D2C5', alignItems: 'center' },
  page: { flex: 1, width: '100%', maxWidth: MaxContentWidth, backgroundColor: Palette.ink },
  safeArea: { flex: 1, padding: 20 },
  closeButton: { width: 44, height: 44, borderRadius: 15, backgroundColor: Palette.inkSoft, alignItems: 'center', justifyContent: 'center' },
  closeText: { color: Palette.white, fontSize: 27, lineHeight: 29 },
  hero: { marginTop: 32, marginBottom: 24 },
  kicker: { color: Palette.gold, fontFamily: Fonts?.rounded, fontSize: 9, fontWeight: '900', letterSpacing: 1.3 },
  title: { color: Palette.white, fontFamily: Fonts?.display, fontSize: 36, lineHeight: 39, fontWeight: '900', marginTop: 6 },
  subtitle: { color: '#B9CFCC', fontFamily: Fonts?.sans, fontSize: 11, lineHeight: 17, marginTop: 8 },
  card: { backgroundColor: Palette.surface, borderRadius: Radius.large, padding: 18, gap: 9 },
  loading: { minHeight: 140, alignItems: 'center', justifyContent: 'center', gap: 12 },
  loadingText: { color: Palette.muted, fontFamily: Fonts?.sans, fontSize: 10 },
  label: { color: Palette.inkSoft, fontFamily: Fonts?.rounded, fontSize: 8, fontWeight: '900', letterSpacing: 0.9, marginTop: 4 },
  input: { height: 53, borderRadius: 14, backgroundColor: '#EEF2EC', color: Palette.ink, fontFamily: Fonts?.sans, fontSize: 12, paddingHorizontal: 14, borderWidth: 1, borderColor: '#DFE5DD' },
  error: { color: Palette.orangeDark, backgroundColor: '#FFF0EB', borderRadius: 10, padding: 10, fontFamily: Fonts?.sans, fontSize: 9, lineHeight: 14, marginTop: 4 },
  button: { height: 54, borderRadius: 16, backgroundColor: Palette.orange, alignItems: 'center', justifyContent: 'center', marginTop: 8 },
  buttonText: { color: Palette.white, fontFamily: Fonts?.rounded, fontSize: 11, fontWeight: '900' },
  disabled: { opacity: 0.6 },
});
