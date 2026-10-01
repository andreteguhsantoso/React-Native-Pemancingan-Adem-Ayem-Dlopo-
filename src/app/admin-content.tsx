import { MediaImage as Image } from '@/components/media-image';
import { useRouter } from 'expo-router';
import { ComponentProps, useEffect, useState } from 'react';
import {
  ActivityIndicator, Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView,
  StyleSheet, Text, TextInput, View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Fonts, MaxContentWidth, Palette, Radius } from '@/constants/theme';
import { useAuth } from '@/context/auth-context';
import { useNews } from '@/context/news-context';
import { useVenue } from '@/context/venue-context';
import type { RemoteNewsItem, VenueSettings } from '@/lib/database.types';
import { requireSupabase } from '@/lib/supabase';
import { pickImage, PickedImage, publicMediaUrl, uploadUserImage } from '@/services/media-service';

type Tab = 'news' | 'operations';
type NewsForm = { title: string; category: string; summary: string; body: string; published: boolean };
type DeletionRequest = {
  id: string;
  user_id: string;
  status: string;
  requested_at: string;
  profiles: { full_name: string; username: string | null; phone: string | null } | null;
};

const emptyNews: NewsForm = { title: '', category: 'pengumuman', summary: '', body: '', published: true };
const defaultSettings: VenueSettings = {
  id: true,
  venue_name: 'Pemancingan Adem Ayem Dlopo',
  opens_at: '06:00',
  closes_at: '22:00',
  fish_mood: 'normal',
  fish_mood_note: 'Kondisi ikan diperbarui oleh pengelola.',
  map_url: 'https://maps.app.goo.gl/cQtnrkjTiAvC5JNC7',
  whatsapp: null,
  natural_bait_rule: 'Umpan wajib berasal dari bahan alami. Essen atau pemanis hanya boleh sebagai campuran umpan alami.',
  updated_by: null,
  updated_at: '',
};

function slugify(value: string) {
  return value.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

export default function AdminContentScreen() {
  const router = useRouter();
  const { profile, session } = useAuth();
  const { refreshNews } = useNews();
  const { refreshVenue } = useVenue();
  const [tab, setTab] = useState<Tab>('news');
  const [items, setItems] = useState<RemoteNewsItem[]>([]);
  const [form, setForm] = useState<NewsForm>(emptyNews);
  const [editing, setEditing] = useState<RemoteNewsItem | null>(null);
  const [photo, setPhoto] = useState<PickedImage | null>(null);
  const [settings, setSettings] = useState<VenueSettings>(defaultSettings);
  const [deletionRequests, setDeletionRequests] = useState<DeletionRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const isStaff = profile?.role === 'admin' || profile?.role === 'operator';

  const load = async () => {
    const client = requireSupabase();
    const [newsResult, settingsResult, deletionResult] = await Promise.all([
      client.from('news_items').select('*').order('created_at', { ascending: false }),
      client.from('venue_settings').select('*').eq('id', true).single(),
      client.from('account_deletion_requests')
        .select('id,user_id,status,requested_at,profiles!account_deletion_requests_user_id_fkey(full_name,username,phone)')
        .in('status', ['pending', 'processing'])
        .order('requested_at', { ascending: true }),
    ]);
    if (newsResult.error) throw new Error(newsResult.error.message);
    if (settingsResult.error) throw new Error(settingsResult.error.message);
    if (deletionResult.error) throw new Error(deletionResult.error.message);
    setItems(newsResult.data as RemoteNewsItem[]);
    setSettings(settingsResult.data as VenueSettings);
    setDeletionRequests(deletionResult.data as unknown as DeletionRequest[]);
  };

  useEffect(() => {
    if (!isStaff) return;
    const timer = setTimeout(() => load().catch((error) => Alert.alert('Gagal memuat konten', error.message)).finally(() => setLoading(false)), 0);
    return () => clearTimeout(timer);
  }, [isStaff]);

  const resetNews = () => { setEditing(null); setForm(emptyNews); setPhoto(null); };
  const editNews = (item: RemoteNewsItem) => {
    setEditing(item);
    setPhoto(null);
    setForm({ title: item.title, category: item.category, summary: item.summary, body: item.body, published: item.is_active && Boolean(item.published_at) });
  };

  const saveNews = async () => {
    if (form.title.trim().length < 5 || form.summary.trim().length < 10 || form.body.trim().length < 20) {
      return Alert.alert('Artikel belum lengkap', 'Isi judul, ringkasan, dan artikel dengan informasi yang cukup.');
    }
    setSaving(true);
    try {
      const imagePath = photo && session ? await uploadUserImage('content', session.user.id, photo) : editing?.image_path ?? null;
      const payload = {
        title: form.title.trim(),
        summary: form.summary.trim(),
        body: form.body.trim(),
        category: form.category,
        image_path: imagePath,
        is_active: form.published,
        published_at: form.published ? editing?.published_at ?? new Date().toISOString() : null,
      };
      const result = editing
        ? await requireSupabase().from('news_items').update(payload).eq('id', editing.id)
        : await requireSupabase().from('news_items').insert({
            ...payload,
            slug: `${slugify(form.title)}-${Date.now().toString(36)}`,
            created_by: session?.user.id,
          });
      if (result.error) throw new Error(result.error.message);
      await Promise.all([load(), refreshNews()]);
      resetNews();
      Alert.alert('Berita tersimpan', form.published ? 'Berita sudah tampil untuk pengguna.' : 'Berita disimpan sebagai draf.');
    } catch (error) {
      Alert.alert('Gagal menyimpan', error instanceof Error ? error.message : 'Silakan coba kembali.');
    } finally { setSaving(false); }
  };

  const toggleNews = async (item: RemoteNewsItem) => {
    const publish = !item.is_active || !item.published_at;
    const { error } = await requireSupabase().from('news_items').update({
      is_active: publish,
      published_at: publish ? item.published_at ?? new Date().toISOString() : null,
    }).eq('id', item.id);
    if (error) return Alert.alert('Gagal memperbarui', error.message);
    await Promise.all([load(), refreshNews()]);
  };

  const saveSettings = async () => {
    if (!/^\d{2}:\d{2}(:\d{2})?$/.test(settings.opens_at) || !/^\d{2}:\d{2}(:\d{2})?$/.test(settings.closes_at)) {
      return Alert.alert('Jam tidak valid', 'Gunakan format HH:MM.');
    }
    setSaving(true);
    try {
      const { error } = await requireSupabase().from('venue_settings').update({
        venue_name: settings.venue_name.trim(),
        opens_at: settings.opens_at.slice(0, 5),
        closes_at: settings.closes_at.slice(0, 5),
        fish_mood: settings.fish_mood.trim(),
        fish_mood_note: settings.fish_mood_note.trim(),
        map_url: settings.map_url.trim(),
        whatsapp: settings.whatsapp?.trim() || null,
        natural_bait_rule: settings.natural_bait_rule.trim(),
        updated_by: session?.user.id,
      }).eq('id', true);
      if (error) throw new Error(error.message);
      await Promise.all([load(), refreshVenue()]);
      Alert.alert('Operasional diperbarui', 'Informasi kolam berhasil disimpan.');
    } catch (error) {
      Alert.alert('Gagal menyimpan', error instanceof Error ? error.message : 'Silakan coba kembali.');
    } finally { setSaving(false); }
  };

  const updateDeletionStatus = async (request: DeletionRequest, status: 'processing' | 'rejected') => {
    const { error } = await requireSupabase().from('account_deletion_requests').update({
      status,
      reviewed_by: session?.user.id,
      reviewed_at: new Date().toISOString(),
    }).eq('id', request.id);
    if (error) return Alert.alert('Gagal memperbarui permintaan', error.message);
    await load();
  };

  if (!isStaff) return <SafeAreaView style={styles.denied}><Text style={styles.title}>Akses khusus pengelola</Text></SafeAreaView>;

  return <View style={styles.screen}><KeyboardAvoidingView style={styles.page} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
    <SafeAreaView edges={['top']} style={styles.headerSafe}><View style={styles.header}>
      <Pressable onPress={() => router.back()} style={styles.backButton}><Text style={styles.backText}>‹</Text></Pressable>
      <View style={styles.headerCopy}><Text style={styles.kicker}>PUSAT INFORMASI</Text><Text style={styles.headerTitle}>Berita & operasional</Text></View>
    </View></SafeAreaView>
    <View style={styles.tabs}>{(['news', 'operations'] as Tab[]).map((item) => <Pressable key={item} onPress={() => setTab(item)} style={[styles.tab, tab === item && styles.tabActive]}><Text style={[styles.tabText, tab === item && styles.tabTextActive]}>{item === 'news' ? 'Berita' : 'Operasional'}</Text></Pressable>)}</View>
    <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.content}>
      {loading ? <ActivityIndicator color={Palette.orange} /> : tab === 'news' ? <>
        <View style={styles.card}>
          <Text style={styles.title}>{editing ? 'Edit berita' : 'Berita baru'}</Text>
          <Field label="JUDUL" value={form.title} onChangeText={(title) => setForm({ ...form, title })} />
          <Text style={styles.fieldLabel}>KATEGORI</Text><View style={styles.chips}>{['event', 'kolam', 'aturan', 'pengumuman'].map((category) => <Pressable key={category} onPress={() => setForm({ ...form, category })} style={[styles.chip, form.category === category && styles.chipActive]}><Text style={[styles.chipText, form.category === category && styles.chipTextActive]}>{category.toUpperCase()}</Text></Pressable>)}</View>
          <Field label="RINGKASAN" value={form.summary} onChangeText={(summary) => setForm({ ...form, summary })} multiline />
          <Field label="ISI ARTIKEL" value={form.body} onChangeText={(body) => setForm({ ...form, body })} multiline />
          {photo ? <Image source={{ uri: photo.uri }} contentFit="cover" style={styles.preview} /> : editing?.image_path ? <Image source={{ uri: publicMediaUrl('content', editing.image_path) ?? '' }} contentFit="cover" style={styles.preview} /> : null}
          <Pressable onPress={async () => { const image = await pickImage([16, 9]); if (image) setPhoto(image); }} style={styles.photoButton}><Text style={styles.photoText}>{photo || editing?.image_path ? 'Ganti gambar berita' : 'Pilih gambar berita'}</Text></Pressable>
          <Pressable onPress={() => setForm({ ...form, published: !form.published })} style={[styles.publishToggle, form.published && styles.publishToggleActive]}><Text style={[styles.publishText, form.published && styles.publishTextActive]}>{form.published ? 'TERBITKAN SEKARANG' : 'SIMPAN SEBAGAI DRAF'}</Text></Pressable>
          <Pressable disabled={saving} onPress={saveNews} style={[styles.saveButton, saving && styles.disabled]}>{saving ? <ActivityIndicator color={Palette.white} /> : <Text style={styles.saveText}>Simpan berita</Text>}</Pressable>
          {editing ? <Pressable onPress={resetNews}><Text style={styles.cancelText}>Batal mengedit</Text></Pressable> : null}
        </View>
        <Text style={styles.listLabel}>SEMUA BERITA</Text>
        {items.map((item) => <View key={item.id} style={styles.itemCard}><View style={styles.itemCopy}><Text style={styles.itemStatus}>{item.is_active && item.published_at ? 'TERBIT' : 'DRAF'} · {item.category.toUpperCase()}</Text><Text style={styles.itemTitle}>{item.title}</Text></View><Pressable onPress={() => editNews(item)} style={styles.editButton}><Text style={styles.editText}>Edit</Text></Pressable><Pressable onPress={() => toggleNews(item)} style={styles.darkButton}><Text style={styles.darkText}>{item.is_active && item.published_at ? 'Tarik' : 'Terbit'}</Text></Pressable></View>)}
      </> : <>
        <View style={styles.card}>
          <Text style={styles.title}>Informasi kolam</Text>
          <Field label="NAMA PEMANCINGAN" value={settings.venue_name} onChangeText={(venue_name) => setSettings({ ...settings, venue_name })} />
          <View style={styles.row}><View style={styles.flex}><Field label="BUKA" value={settings.opens_at.slice(0, 5)} onChangeText={(opens_at) => setSettings({ ...settings, opens_at })} /></View><View style={styles.flex}><Field label="TUTUP" value={settings.closes_at.slice(0, 5)} onChangeText={(closes_at) => setSettings({ ...settings, closes_at })} /></View></View>
          <Field label="MOOD IKAN" value={settings.fish_mood} onChangeText={(fish_mood) => setSettings({ ...settings, fish_mood })} />
          <Field label="CATATAN MOOD" value={settings.fish_mood_note} onChangeText={(fish_mood_note) => setSettings({ ...settings, fish_mood_note })} multiline />
          <Field label="WHATSAPP PENGELOLA" value={settings.whatsapp ?? ''} onChangeText={(whatsapp) => setSettings({ ...settings, whatsapp })} keyboardType="phone-pad" />
          <Field label="TAUTAN GOOGLE MAPS" value={settings.map_url} onChangeText={(map_url) => setSettings({ ...settings, map_url })} autoCapitalize="none" />
          <Field label="ATURAN UMPAN" value={settings.natural_bait_rule} onChangeText={(natural_bait_rule) => setSettings({ ...settings, natural_bait_rule })} multiline />
          <Pressable disabled={saving} onPress={saveSettings} style={[styles.saveButton, saving && styles.disabled]}>{saving ? <ActivityIndicator color={Palette.white} /> : <Text style={styles.saveText}>Simpan operasional</Text>}</Pressable>
        </View>
        <Text style={styles.listLabel}>PERMINTAAN PENGHAPUSAN AKUN</Text>
        {deletionRequests.length ? deletionRequests.map((request) => <View key={request.id} style={styles.requestCard}>
          <View style={styles.itemCopy}><Text style={styles.itemStatus}>{request.status.toUpperCase()} · {new Date(request.requested_at).toLocaleDateString('id-ID')}</Text><Text style={styles.itemTitle}>{request.profiles?.full_name || request.profiles?.username || 'Pengguna'}</Text><Text style={styles.requestMeta}>{request.profiles?.phone || request.user_id}</Text></View>
          {request.status === 'pending' ? <Pressable onPress={() => updateDeletionStatus(request, 'processing')} style={styles.editButton}><Text style={styles.editText}>Proses</Text></Pressable> : null}
          <Pressable onPress={() => updateDeletionStatus(request, 'rejected')} style={styles.darkButton}><Text style={styles.darkText}>Tolak</Text></Pressable>
        </View>) : <View style={styles.emptyRequest}><Text style={styles.requestMeta}>Tidak ada permintaan aktif.</Text></View>}
      </>}
    </ScrollView>
  </KeyboardAvoidingView></View>;
}

function Field({ label, multiline, ...props }: ComponentProps<typeof TextInput> & { label: string }) {
  return <View style={styles.field}><Text style={styles.fieldLabel}>{label}</Text><TextInput placeholderTextColor="#94A19E" style={[styles.input, multiline && styles.multiline]} multiline={multiline} textAlignVertical={multiline ? 'top' : 'center'} {...props} /></View>;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#D8D2C5', alignItems: 'center' }, page: { flex: 1, width: '100%', maxWidth: MaxContentWidth, backgroundColor: Palette.paper }, headerSafe: { backgroundColor: Palette.ink }, header: { height: 76, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center' }, backButton: { width: 44, height: 44, borderRadius: 15, backgroundColor: Palette.inkSoft, alignItems: 'center', justifyContent: 'center' }, backText: { color: Palette.white, fontSize: 32 }, headerCopy: { paddingLeft: 13 }, kicker: { color: Palette.gold, fontFamily: Fonts?.rounded, fontSize: 8, fontWeight: '900', letterSpacing: 1.1 }, headerTitle: { color: Palette.white, fontFamily: Fonts?.display, fontSize: 24, fontWeight: '900' }, tabs: { flexDirection: 'row', gap: 8, padding: 12, backgroundColor: Palette.surface }, tab: { flex: 1, borderRadius: 12, padding: 11, alignItems: 'center' }, tabActive: { backgroundColor: Palette.ink }, tabText: { color: Palette.ink, fontFamily: Fonts?.rounded, fontSize: 9, fontWeight: '900' }, tabTextActive: { color: Palette.white }, content: { padding: 15, paddingBottom: 44 }, card: { borderRadius: Radius.large, backgroundColor: Palette.surface, borderWidth: 1, borderColor: '#E5DED1', padding: 15, gap: 12 }, title: { color: Palette.ink, fontFamily: Fonts?.display, fontSize: 23, fontWeight: '900' }, field: { gap: 5 }, fieldLabel: { color: Palette.inkSoft, fontFamily: Fonts?.rounded, fontSize: 7, fontWeight: '900', letterSpacing: 0.8 }, input: { minHeight: 47, borderRadius: 12, backgroundColor: '#EEF2EC', paddingHorizontal: 11, color: Palette.ink, fontFamily: Fonts?.sans, fontSize: 10 }, multiline: { minHeight: 100, paddingTop: 12, lineHeight: 16 }, chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 }, chip: { borderRadius: 10, borderWidth: 1, borderColor: Palette.line, paddingHorizontal: 9, paddingVertical: 8 }, chipActive: { backgroundColor: Palette.gold, borderColor: Palette.gold }, chipText: { color: Palette.muted, fontFamily: Fonts?.rounded, fontSize: 7, fontWeight: '900' }, chipTextActive: { color: Palette.ink }, preview: { width: '100%', height: 145, borderRadius: 14, backgroundColor: Palette.mint }, photoButton: { borderWidth: 1, borderStyle: 'dashed', borderColor: Palette.inkSoft, borderRadius: 12, padding: 12, alignItems: 'center' }, photoText: { color: Palette.ink, fontFamily: Fonts?.rounded, fontSize: 9, fontWeight: '900' }, publishToggle: { height: 42, borderRadius: 12, borderWidth: 1, borderColor: Palette.line, alignItems: 'center', justifyContent: 'center' }, publishToggleActive: { backgroundColor: Palette.mint, borderColor: Palette.success }, publishText: { color: Palette.muted, fontFamily: Fonts?.rounded, fontSize: 8, fontWeight: '900' }, publishTextActive: { color: Palette.ink }, saveButton: { height: 50, borderRadius: 14, backgroundColor: Palette.orange, alignItems: 'center', justifyContent: 'center' }, saveText: { color: Palette.white, fontFamily: Fonts?.rounded, fontSize: 10, fontWeight: '900' }, disabled: { opacity: 0.6 }, cancelText: { color: Palette.orangeDark, fontFamily: Fonts?.rounded, fontSize: 8, fontWeight: '900', textAlign: 'center' }, listLabel: { color: Palette.orange, fontFamily: Fonts?.rounded, fontSize: 8, fontWeight: '900', letterSpacing: 1, marginTop: 23, marginBottom: 9 }, itemCard: { backgroundColor: Palette.surface, borderRadius: Radius.medium, padding: 12, marginBottom: 8, flexDirection: 'row', alignItems: 'center' }, itemCopy: { flex: 1 }, itemStatus: { color: Palette.orange, fontFamily: Fonts?.rounded, fontSize: 7, fontWeight: '900' }, itemTitle: { color: Palette.ink, fontFamily: Fonts?.rounded, fontSize: 10, fontWeight: '900', marginTop: 3 }, editButton: { backgroundColor: Palette.mint, borderRadius: 9, padding: 9 }, editText: { color: Palette.ink, fontSize: 7, fontWeight: '900' }, darkButton: { backgroundColor: Palette.ink, borderRadius: 9, padding: 9, marginLeft: 5 }, darkText: { color: Palette.white, fontSize: 7, fontWeight: '900' }, requestCard: { backgroundColor: Palette.surface, borderRadius: Radius.medium, padding: 12, marginBottom: 8, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#E5DED1' }, requestMeta: { color: Palette.muted, fontFamily: Fonts?.sans, fontSize: 8, marginTop: 3 }, emptyRequest: { backgroundColor: Palette.surface, borderRadius: Radius.medium, padding: 16, alignItems: 'center' }, row: { flexDirection: 'row', gap: 8 }, flex: { flex: 1 }, denied: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: Palette.paper },
});
