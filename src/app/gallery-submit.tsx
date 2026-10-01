import { MediaImage as Image } from '@/components/media-image';
import { Href, Redirect, useRouter } from 'expo-router';
import { ComponentProps, useState } from 'react';
import { ActivityIndicator, Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Fonts, MaxContentWidth, Palette, Radius } from '@/constants/theme';
import { useAuth } from '@/context/auth-context';
import { requireSupabase } from '@/lib/supabase';
import { pickImage, PickedImage, uploadUserImage } from '@/services/media-service';

const categories = ['Momen', 'Tangkapan', 'Event', 'Kolam'] as const;

export default function GallerySubmitScreen() {
  const router = useRouter();
  const { profile, session, loading } = useAuth();
  const [title, setTitle] = useState('');
  const [caption, setCaption] = useState('');
  const [category, setCategory] = useState<(typeof categories)[number]>('Momen');
  const [image, setImage] = useState<PickedImage | null>(null);
  const [saving, setSaving] = useState(false);

  if (loading) return <View style={[styles.screen, { justifyContent: 'center' }]}><ActivityIndicator color={Palette.orange} size="large" /></View>;
  if (!session) {
    return <Redirect href={{ pathname: '/auth', params: { redirect: '/gallery-submit' } }} />;
  }

  const submit = async () => {
    if (saving) return;
    if (!image) return Alert.alert('Foto belum dipilih', 'Pilih satu foto dari perangkat Anda.');
    if (title.trim().length < 3) return Alert.alert('Judul belum lengkap', 'Judul minimal 3 karakter.');
    setSaving(true);
    try {
      const imagePath = await uploadUserImage('gallery', session.user.id, image);
      const isStaff = profile?.role === 'admin' || profile?.role === 'operator';
      const { error } = await requireSupabase().from('gallery_items').insert({
        user_id: session.user.id,
        title: title.trim(),
        caption: caption.trim(),
        category: category.toLowerCase(),
        image_path: imagePath,
        status: isStaff ? 'approved' : 'pending',
        moderated_by: isStaff ? session.user.id : null,
        moderated_at: isStaff ? new Date().toISOString() : null,
      }).select('id').single();
      if (error) throw new Error(error.message);
      Alert.alert(
        isStaff ? 'Foto diterbitkan' : 'Foto terkirim',
        isStaff ? 'Foto admin langsung tampil di galeri.' : 'Foto masuk antrean moderasi dan akan tampil setelah disetujui admin.',
      );
      router.replace('/gallery-submissions' as Href);
    } catch (error) {
      Alert.alert('Gagal mengirim', error instanceof Error ? error.message : 'Silakan coba kembali.');
    } finally {
      setSaving(false);
    }
  };

  const choosePhoto = async () => {
    try { const picked = await pickImage([4, 3]); if (picked) setImage(picked); }
    catch { Alert.alert('Foto belum dapat dipilih', 'Periksa izin galeri perangkat, kemudian pilih ulang foto.'); }
  };

  return (
    <View style={styles.screen}>
      <KeyboardAvoidingView style={styles.page} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <SafeAreaView edges={['top']} style={styles.headerSafe}>
          <View style={styles.header}>
            <Pressable onPress={() => router.back()} style={styles.backButton}><Text style={styles.backText}>‹</Text></Pressable>
            <View style={styles.headerCopy}><Text style={styles.kicker}>KOMUNITAS ADEM AYEM</Text><Text style={styles.title}>Kirim foto</Text></View>
          </View>
        </SafeAreaView>
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.content}>
          <Pressable disabled={saving} onPress={choosePhoto} style={styles.imagePicker}>
            {image ? <Image source={{ uri: image.uri }} contentFit="cover" style={styles.preview} /> : <View style={styles.placeholder}><Text style={styles.placeholderMark}>+</Text><Text style={styles.placeholderTitle}>Pilih foto dari galeri</Text><Text style={styles.placeholderText}>JPG, PNG, atau WebP maksimal 5 MB</Text></View>}
          </Pressable>
          <View style={styles.formCard}>
            <Field label="JUDUL FOTO" value={title} onChangeText={setTitle} placeholder="Contoh: Strike nila terbesar" maxLength={100} />
            <Text style={styles.fieldLabel}>KATEGORI</Text>
            <View style={styles.categoryRow}>{categories.map((item) => <Pressable key={item} onPress={() => setCategory(item)} style={[styles.categoryChip, category === item && styles.categoryChipActive]}><Text style={[styles.categoryText, category === item && styles.categoryTextActive]}>{item}</Text></Pressable>)}</View>
            <Field label="CERITA SINGKAT" value={caption} onChangeText={setCaption} placeholder="Ceritakan momen ini..." multiline maxLength={300} style={styles.textArea} />
            <View style={styles.moderationNote}><Text style={styles.noteTitle}>Foto diperiksa sebelum tayang</Text><Text style={styles.noteText}>Pastikan foto diambil di Pemancingan Adem Ayem Dlopo dan tidak memuat konten yang melanggar privasi.</Text></View>
            <Pressable disabled={saving} onPress={submit} style={[styles.submitButton, saving && styles.disabled]}>{saving ? <ActivityIndicator color={Palette.white} /> : <Text style={styles.submitText}>Kirim untuk ditinjau</Text>}</Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

function Field({ label, style, ...props }: ComponentProps<typeof TextInput> & { label: string }) {
  return <View style={styles.field}><Text style={styles.fieldLabel}>{label}</Text><TextInput placeholderTextColor="#93A09C" textAlignVertical="top" style={[styles.input, style]} {...props} /></View>;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#D8D2C5', alignItems: 'center' }, page: { flex: 1, width: '100%', maxWidth: MaxContentWidth, backgroundColor: Palette.paper }, headerSafe: { backgroundColor: Palette.ink },
  header: { height: 76, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center' }, backButton: { width: 44, height: 44, borderRadius: 15, backgroundColor: Palette.inkSoft, alignItems: 'center', justifyContent: 'center' }, backText: { color: Palette.white, fontSize: 32 }, headerCopy: { paddingLeft: 13 }, kicker: { color: Palette.gold, fontFamily: Fonts?.rounded, fontSize: 8, fontWeight: '900', letterSpacing: 1.2 }, title: { color: Palette.white, fontFamily: Fonts?.display, fontSize: 25, fontWeight: '900' },
  content: { padding: 15, paddingBottom: 40 }, imagePicker: { height: 245, borderRadius: Radius.large, backgroundColor: Palette.inkSoft, overflow: 'hidden', borderWidth: 2, borderStyle: 'dashed', borderColor: Palette.sky }, preview: { width: '100%', height: '100%' }, placeholder: { flex: 1, alignItems: 'center', justifyContent: 'center' }, placeholderMark: { color: Palette.gold, fontSize: 40, fontWeight: '300' }, placeholderTitle: { color: Palette.white, fontFamily: Fonts?.rounded, fontSize: 12, fontWeight: '900' }, placeholderText: { color: '#B9CFCC', fontFamily: Fonts?.sans, fontSize: 8, marginTop: 4 },
  formCard: { marginTop: 13, borderRadius: Radius.large, backgroundColor: Palette.surface, padding: 16, gap: 14, borderWidth: 1, borderColor: '#E5DED1' }, field: { gap: 6 }, fieldLabel: { color: Palette.inkSoft, fontFamily: Fonts?.rounded, fontSize: 8, fontWeight: '900', letterSpacing: 0.9 }, input: { height: 51, borderRadius: 14, backgroundColor: '#EEF2EC', paddingHorizontal: 13, color: Palette.ink, fontFamily: Fonts?.sans, fontSize: 11 }, textArea: { height: 100, paddingTop: 12 },
  categoryRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 }, categoryChip: { borderWidth: 1, borderColor: Palette.line, borderRadius: 11, paddingHorizontal: 12, paddingVertical: 9 }, categoryChipActive: { backgroundColor: Palette.ink, borderColor: Palette.ink }, categoryText: { color: Palette.inkSoft, fontFamily: Fonts?.rounded, fontSize: 8, fontWeight: '900' }, categoryTextActive: { color: Palette.white },
  moderationNote: { backgroundColor: Palette.gold, borderRadius: 14, padding: 12 }, noteTitle: { color: Palette.ink, fontFamily: Fonts?.rounded, fontSize: 10, fontWeight: '900' }, noteText: { color: Palette.inkSoft, fontFamily: Fonts?.sans, fontSize: 8, lineHeight: 13, marginTop: 3 }, submitButton: { height: 53, borderRadius: 15, backgroundColor: Palette.orange, alignItems: 'center', justifyContent: 'center' }, submitText: { color: Palette.white, fontFamily: Fonts?.rounded, fontSize: 11, fontWeight: '900' }, disabled: { opacity: 0.6 },
});
