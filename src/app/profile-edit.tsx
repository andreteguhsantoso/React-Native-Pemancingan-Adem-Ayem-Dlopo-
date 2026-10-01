import { MediaImage as Image } from '@/components/media-image';
import { Redirect, useRouter } from 'expo-router';
import { ComponentProps, useState } from 'react';
import { ActivityIndicator, Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Fonts, MaxContentWidth, Palette, Radius } from '@/constants/theme';
import { useAuth } from '@/context/auth-context';
import { pickImage, PickedImage, publicMediaUrl, uploadUserImage } from '@/services/media-service';

export default function ProfileEditScreen() {
  const { loading, profile, session, refreshProfile } = useAuth();
  if (loading) return <View style={[styles.screen, { justifyContent: 'center' }]}><ActivityIndicator color={Palette.orange} size="large" /></View>;
  if (!session) return <Redirect href="/auth" />;
  if (!profile) return <SafeAreaView style={[styles.screen, { justifyContent: 'center', padding: 24 }]}><Text style={{ fontSize: 16, color: Palette.ink, textAlign: 'center' }}>Data profil belum dapat dimuat.</Text><Pressable onPress={() => refreshProfile().catch(() => Alert.alert('Profil belum tersedia', 'Periksa koneksi Anda dan coba kembali.'))} style={styles.saveButton}><Text style={styles.saveText}>Muat ulang profil</Text></Pressable></SafeAreaView>;
  return <ProfileForm key={profile.id} />;
}

function ProfileForm() {
  const router = useRouter();
  const { profile, session, updateProfile } = useAuth();
  const [fullName, setFullName] = useState(profile?.full_name ?? '');
  const [username, setUsername] = useState(profile?.username ?? '');
  const [phone, setPhone] = useState(profile?.phone ?? '');
  const [newImage, setNewImage] = useState<PickedImage | null>(null);
  const [saving, setSaving] = useState(false);
  const currentAvatar = newImage?.uri || publicMediaUrl('avatars', profile?.avatar_path ?? null);

  if (!session) {
    return <Redirect href="/auth" />;
  }

  const choosePhoto = async () => {
    try {
      const image = await pickImage([1, 1]);
      if (image) setNewImage(image);
    } catch (error) {
      Alert.alert('Foto tidak dapat dibuka', error instanceof Error ? error.message : 'Silakan coba kembali.');
    }
  };

  const save = async () => {
    if (saving) return;
    const cleanPhone = phone.replace(/\D/g, '');
    if (fullName.trim().length < 3) return Alert.alert('Nama belum valid', 'Nama lengkap minimal 3 karakter.');
    if (!/^[a-zA-Z0-9_]{3,24}$/.test(username.trim())) return Alert.alert('Username belum valid', 'Gunakan 3-24 huruf, angka, atau garis bawah.');
    if (!/^[0-9]{10,15}$/.test(cleanPhone)) return Alert.alert('Nomor belum valid', 'Nomor WhatsApp harus terdiri dari 10-15 angka.');
    setSaving(true);
    try {
      const avatarPath = newImage ? await uploadUserImage('avatars', session.user.id, newImage) : profile?.avatar_path ?? null;
      await updateProfile({ username: username.trim(), full_name: fullName.trim(), phone: cleanPhone, avatar_path: avatarPath });
      Alert.alert('Profil diperbarui', 'Nama, username, nomor, dan foto profil berhasil disimpan.');
      router.back();
    } catch (error) {
      Alert.alert('Gagal menyimpan', error instanceof Error ? error.message : 'Silakan coba kembali.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.screen}>
      <KeyboardAvoidingView style={styles.page} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <SafeAreaView edges={['top']} style={styles.headerSafe}>
          <View style={styles.header}>
            <Pressable onPress={() => router.back()} style={styles.backButton}><Text style={styles.backText}>‹</Text></Pressable>
            <View style={styles.headerCopy}><Text style={styles.kicker}>PENGATURAN AKUN</Text><Text style={styles.title}>Edit profil</Text></View>
          </View>
        </SafeAreaView>
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.content}>
          <View style={styles.photoCard}>
            <View style={styles.avatar}>
              {currentAvatar ? <Image source={{ uri: currentAvatar }} contentFit="cover" style={styles.avatarImage} /> : <Text style={styles.avatarText}>{fullName.slice(0, 2).toUpperCase() || 'PA'}</Text>}
            </View>
            <View style={styles.photoCopy}><Text style={styles.photoTitle}>Foto profil</Text><Text style={styles.photoText}>{newImage ? 'Foto baru siap disimpan.' : 'JPG, PNG, atau WebP maksimal 5 MB.'}</Text></View>
            <Pressable disabled={saving} onPress={choosePhoto} style={styles.photoButton}><Text style={styles.photoButtonText}>{currentAvatar ? 'Ganti foto' : 'Pilih foto'}</Text></Pressable>
          </View>
          <View style={styles.formCard}>
            <Field label="NAMA LENGKAP" value={fullName} onChangeText={setFullName} autoCapitalize="words" maxLength={100} />
            <Field label="USERNAME" value={username} onChangeText={setUsername} autoCapitalize="none" maxLength={24} />
            <Field label="NOMOR WHATSAPP" value={phone} onChangeText={setPhone} keyboardType="phone-pad" maxLength={20} />
            <Field label="EMAIL" value={session.user.email ?? ''} editable={false} />
            <Pressable disabled={saving} onPress={save} style={[styles.saveButton, saving && styles.disabled]}>
              {saving ? <ActivityIndicator color={Palette.white} /> : <Text style={styles.saveText}>Simpan profil</Text>}
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

function Field({ label, ...props }: ComponentProps<typeof TextInput> & { label: string }) {
  return <View style={styles.field}><Text style={styles.fieldLabel}>{label}</Text><TextInput placeholderTextColor="#93A09C" style={[styles.input, props.editable === false && styles.inputDisabled]} {...props} /></View>;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#D8D2C5', alignItems: 'center' }, page: { flex: 1, width: '100%', maxWidth: MaxContentWidth, backgroundColor: Palette.paper },
  headerSafe: { backgroundColor: Palette.ink }, header: { height: 76, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center' },
  backButton: { width: 44, height: 44, borderRadius: 15, backgroundColor: Palette.inkSoft, alignItems: 'center', justifyContent: 'center' }, backText: { color: Palette.white, fontSize: 32 },
  headerCopy: { paddingLeft: 13 }, kicker: { color: Palette.gold, fontFamily: Fonts?.rounded, fontSize: 8, fontWeight: '900', letterSpacing: 1.2 }, title: { color: Palette.white, fontFamily: Fonts?.display, fontSize: 25, fontWeight: '900' },
  content: { padding: 16, paddingBottom: 40 }, photoCard: { borderRadius: Radius.large, backgroundColor: Palette.gold, padding: 15, flexDirection: 'row', alignItems: 'center' },
  avatar: { width: 72, height: 72, borderRadius: 24, backgroundColor: Palette.orange, overflow: 'hidden', alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: Palette.surface }, avatarImage: { width: '100%', height: '100%' }, avatarText: { color: Palette.white, fontFamily: Fonts?.display, fontSize: 24, fontWeight: '900' },
  photoCopy: { flex: 1, paddingHorizontal: 12 }, photoTitle: { color: Palette.ink, fontFamily: Fonts?.rounded, fontSize: 12, fontWeight: '900' }, photoText: { color: Palette.inkSoft, fontFamily: Fonts?.sans, fontSize: 8, lineHeight: 12, marginTop: 3 },
  photoButton: { backgroundColor: Palette.ink, borderRadius: 11, paddingHorizontal: 12, paddingVertical: 9 }, photoButtonText: { color: Palette.white, fontFamily: Fonts?.rounded, fontSize: 8, fontWeight: '900' },
  formCard: { marginTop: 14, borderRadius: Radius.large, backgroundColor: Palette.surface, padding: 16, gap: 14, borderWidth: 1, borderColor: '#E5DED1' }, field: { gap: 6 }, fieldLabel: { color: Palette.inkSoft, fontFamily: Fonts?.rounded, fontSize: 8, fontWeight: '900', letterSpacing: 0.9 },
  input: { height: 52, borderRadius: 14, backgroundColor: '#EEF2EC', paddingHorizontal: 13, color: Palette.ink, fontFamily: Fonts?.sans, fontSize: 11 }, inputDisabled: { color: Palette.muted, opacity: 0.75 },
  saveButton: { height: 53, borderRadius: 15, backgroundColor: Palette.orange, alignItems: 'center', justifyContent: 'center', marginTop: 3 }, saveText: { color: Palette.white, fontFamily: Fonts?.rounded, fontSize: 11, fontWeight: '900' }, disabled: { opacity: 0.6 },
});
