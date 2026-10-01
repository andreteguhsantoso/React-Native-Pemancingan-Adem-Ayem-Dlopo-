import { useRouter } from 'expo-router';
import { ComponentProps, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { MediaImage } from '@/components/media-image';
import { Fonts, MaxContentWidth, Palette, Radius } from '@/constants/theme';
import { useAuth } from '@/context/auth-context';
import { useFocusResource } from '@/hooks/use-focus-resource';
import { normalizeDate, parseDecimal, wibDateKey } from '@/lib/domain';
import { requireSupabase } from '@/lib/supabase';
import { LeaderRecord } from '@/services/community-service';
import { galleryMediaUrls, pickImage, PickedImage, publicMediaUrl, uploadUserImage } from '@/services/media-service';

type GalleryRecord = { id: string; title: string; category: string; image_path: string; status: string; is_active: boolean; imageUrl?: string };
type EventOption = { id: string; title: string };
type CommunityData = { gallery: GalleryRecord[]; leaders: LeaderRecord[]; events: EventOption[]; totalsSupported: boolean; warnings: string[] };
const emptyData: CommunityData = { gallery: [], leaders: [], events: [], totalsSupported: false, warnings: [] };
const statusLabels: Record<string, string> = { pending: 'Menunggu persetujuan', approved: 'Disetujui', rejected: 'Ditolak' };

async function fetchCommunity(): Promise<CommunityData> {
  const client = requireSupabase();
  const [gallery, leaders, events, columns] = await Promise.all([
    client.from('gallery_items').select('*').order('created_at', { ascending: false }),
    client.from('leaderboard_entries').select('*').order('fish_weight_kg', { ascending: false }),
    client.from('events').select('id,title').order('starts_at', { ascending: false }),
    client.from('leaderboard_entries').select('fish_count,total_weight_kg').limit(0),
  ]);
  if (gallery.error && leaders.error) throw new Error(gallery.error.message);
  let mediaWarning = '';
  const photos = await galleryMediaUrls((gallery.data ?? []).map((item) => item.image_path)).catch((cause) => { mediaWarning = cause instanceof Error ? cause.message : 'Foto galeri belum dapat dimuat.'; return new Map<string, string>(); });
  return { gallery: (gallery.data ?? []).map((item) => ({ ...item, imageUrl: photos.get(item.image_path) })) as GalleryRecord[], leaders: (leaders.data ?? []) as LeaderRecord[], events: (events.data ?? []) as EventOption[], totalsSupported: !columns.error,
    warnings: [gallery.error ? `Galeri: ${gallery.error.message}` : '', leaders.error ? `Peringkat: ${leaders.error.message}` : '', events.error ? 'Daftar event belum dapat dimuat.' : '', mediaWarning].filter(Boolean) };
}

export default function AdminCommunityScreen() {
  const router = useRouter();
  const { profile, session } = useAuth();
  const isStaff = profile?.role === 'admin' || profile?.role === 'operator';
  const { data, refreshing, error, refresh } = useFocusResource(fetchCommunity, emptyData, isStaff);
  const [tab, setTab] = useState<'gallery' | 'leaderboard'>('gallery');
  const [galleryFilter, setGalleryFilter] = useState('pending');
  const [name, setName] = useState('');
  const [weight, setWeight] = useState('');
  const [count, setCount] = useState('1');
  const [total, setTotal] = useState('');
  const [date, setDate] = useState(() => wibDateKey());
  const [eventId, setEventId] = useState<string | null>(null);
  const [notes, setNotes] = useState('');
  const [photo, setPhoto] = useState<PickedImage | null>(null);
  const [photoInvalid, setPhotoInvalid] = useState(false);
  const [editing, setEditing] = useState<LeaderRecord | null>(null);
  const [operation, setOperation] = useState<string | null>(null);
  const lock = useRef(false);
  const scroll = useRef<ScrollView>(null);
  const filteredGallery = data.gallery.filter((item) => galleryFilter === 'all' || item.status === galleryFilter);

  const perform = async (key: string, job: () => Promise<void>) => {
    if (lock.current) return;
    lock.current = true; setOperation(key);
    try { await job(); await refresh(); }
    catch (cause) { Alert.alert('Perubahan belum tersimpan', cause instanceof Error ? cause.message : 'Silakan coba kembali.'); }
    finally { lock.current = false; setOperation(null); }
  };

  const reset = () => { setEditing(null); setName(''); setWeight(''); setCount('1'); setTotal(''); setDate(wibDateKey()); setEventId(null); setNotes(''); setPhoto(null); setPhotoInvalid(false); };
  const edit = (item: LeaderRecord) => {
    setEditing(item); setName(item.angler_name); setWeight(String(item.fish_weight_kg)); setCount(String(item.fish_count ?? 1));
    setTotal(String(item.total_weight_kg ?? item.fish_weight_kg)); setDate(item.caught_at); setEventId(item.event_id); setNotes(item.notes); setPhoto(null); setPhotoInvalid(false);
    scroll.current?.scrollTo({ y: 0, animated: true });
  };

  const choosePhoto = async () => {
    try { const selected = await pickImage([4, 3]); if (selected) { setPhoto(selected); setPhotoInvalid(false); } }
    catch { Alert.alert('Foto belum dipilih', 'Galeri perangkat belum dapat dibuka. Coba kembali.'); }
  };

  const save = () => perform('save', async () => {
    if (!session) throw new Error('Masuk kembali untuk menyimpan data.');
    const biggest = parseDecimal(weight);
    const fishCount = Number(count);
    const totalWeight = fishCount === 1 ? biggest : total.trim() ? parseDecimal(total) : biggest;
    const caughtAt = normalizeDate(date);
    if (name.trim().length < 3 || name.trim().length > 100 || !Number.isFinite(biggest) || biggest <= 0 || biggest >= 10000 || !caughtAt) throw new Error('Isi nama, berat positif, dan tanggal yang valid (YYYY-MM-DD).');
    if (caughtAt > wibDateKey() && (!editing || caughtAt !== normalizeDate(editing.caught_at))) throw new Error('Tanggal penimbangan tidak boleh di masa depan.');
    if (data.totalsSupported && (!Number.isInteger(fishCount) || fishCount < 1 || fishCount > 10000 || !Number.isFinite(totalWeight) || totalWeight < biggest || (fishCount === 1 && totalWeight !== biggest))) throw new Error('Jumlah ikan minimal 1. Total berat tidak boleh kurang dari ikan terbesar; untuk 1 ekor, berat total harus sama.');
    if (photoInvalid && !photo) throw new Error('Foto lama rusak atau tidak dapat dimuat. Pilih ulang foto asli sebelum menyimpan.');
    const imagePath = photo ? await uploadUserImage('content', session.user.id, photo) : editing?.image_path ?? null;
    const payload = { angler_name: name.trim(), fish_weight_kg: biggest, caught_at: caughtAt, event_id: eventId, notes: notes.trim(), image_path: imagePath,
      is_active: editing?.is_active ?? true, ...(data.totalsSupported ? { fish_count: fishCount, total_weight_kg: totalWeight } : {}) };
    const query = editing ? requireSupabase().from('leaderboard_entries').update(payload).eq('id', editing.id) : requireSupabase().from('leaderboard_entries').insert({ ...payload, created_by: session.user.id });
    const { data: saved, error: saveError } = await query.select('id').single();
    if (saveError || !saved) throw new Error(saveError?.message || 'Data tidak berubah. Periksa izin akun pengelola.');
    reset(); Alert.alert('Tersimpan', 'Peringkat dan foto akan tampil pada halaman Juara sesuai periode yang dipilih.');
  });

  const moderate = (item: GalleryRecord, status: string) => perform(item.id, async () => {
    const result = await requireSupabase().from('gallery_items').update({ status, moderated_by: session?.user.id, moderated_at: new Date().toISOString() }).eq('id', item.id).select('id').single();
    if (result.error || !result.data) throw new Error(result.error?.message || 'Foto belum diperbarui.');
  });

  const toggle = (item: LeaderRecord) => perform(item.id, async () => {
    const result = await requireSupabase().from('leaderboard_entries').update({ is_active: !item.is_active }).eq('id', item.id).select('id').single();
    if (result.error || !result.data) throw new Error(result.error?.message || 'Peringkat belum diperbarui.');
  });

  if (!isStaff) return <SafeAreaView style={styles.denied}><Text style={styles.title}>Akses khusus pengelola</Text><Button label="Kembali" onPress={() => router.back()} /></SafeAreaView>;
  const preview = photo?.uri || publicMediaUrl('content', editing?.image_path);

  return <View style={styles.screen}><View style={styles.page}>
    <SafeAreaView edges={['top']} style={styles.headerSafe}><View style={styles.header}>
      <Pressable accessibilityLabel="Kembali" onPress={() => router.back()} style={styles.back}><Text style={styles.backText}>‹</Text></Pressable>
      <View><Text style={styles.kicker}>PANEL KOMUNITAS</Text><Text style={styles.headerTitle}>Galeri & juara</Text></View>
    </View></SafeAreaView>
    <View style={styles.tabs}>{(['gallery', 'leaderboard'] as const).map((item) => <Button key={item} label={item === 'gallery' ? `Galeri (${data.gallery.filter((i) => i.status === 'pending').length})` : 'Peringkat'} onPress={() => setTab(item)} muted={tab !== item} />)}</View>
    <ScrollView ref={scroll} keyboardShouldPersistTaps="handled" refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={Palette.orange} />} contentContainerStyle={styles.content}>
      {error || data.warnings.length ? <View style={styles.notice}><Text style={styles.body}>{error || data.warnings.join('\n')}</Text><Button label="Coba lagi" onPress={refresh} muted /></View> : null}
      {tab === 'gallery' ? <>
        <Text style={styles.title}>Tinjau momen komunitas</Text>
        <Text style={styles.body}>Pastikan foto dapat dilihat dan sesuai aturan sebelum menyetujuinya.</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>{[['pending', 'Menunggu'], ['approved', 'Disetujui'], ['rejected', 'Ditolak'], ['all', 'Semua']].map(([id, label]) => <Button key={id} label={label} onPress={() => setGalleryFilter(id)} muted={galleryFilter !== id} />)}</ScrollView>
        {!refreshing && !filteredGallery.length ? <View style={styles.card}><Text style={styles.body}>Tidak ada kiriman pada kategori ini.</Text></View> : null}
        {filteredGallery.map((item) => <View style={styles.card} key={item.id}>
          <MediaImage source={item.imageUrl ? { uri: item.imageUrl } : null} style={styles.preview} showRetry fallbackLabel="Foto gagal dimuat. Pengirim perlu memilih ulang foto asli." />
          <Text style={styles.kickerOrange}>{statusLabels[item.status]} · {item.category}</Text><Text style={styles.title}>{item.title}</Text>
          <View style={styles.row}><Button label="Setujui" disabled={Boolean(operation) || item.status === 'approved'} onPress={() => moderate(item, 'approved')} /><Button label="Tolak" disabled={Boolean(operation) || item.status === 'rejected'} onPress={() => moderate(item, 'rejected')} muted /></View>
        </View>)}
      </> : <>
        <View style={styles.card}>
          <Text style={styles.title}>{editing ? 'Perbarui penimbangan' : 'Catat hasil penimbangan'}</Text>
          <Field label="Nama pemancing" value={name} onChangeText={setName} maxLength={100} />
          <View style={styles.row}><View style={styles.flex}><Field label="Ikan terbesar (kg)" value={weight} onChangeText={setWeight} keyboardType="decimal-pad" placeholder="3,82" /></View><View style={styles.flex}><Field label="Tanggal timbang" value={date} onChangeText={setDate} placeholder="YYYY-MM-DD" /></View></View>
          {editing && normalizeDate(editing.caught_at)! > wibDateKey() ? <Text style={styles.warning}>Data lama menggunakan tanggal di masa depan. Foto tetap dapat diperbaiki, tetapi sesuaikan tanggal penimbangan agar filter periode akurat.</Text> : null}
          {data.totalsSupported ? <View style={styles.row}><View style={styles.flex}><Field label="Jumlah ikan (ekor)" value={count} onChangeText={setCount} keyboardType="number-pad" /></View><View style={styles.flex}><Field label="Total berat (kg)" value={Number(count) === 1 ? weight : total} onChangeText={setTotal} editable={Number(count) !== 1} keyboardType="decimal-pad" placeholder={weight || '0'} /></View></View> : <Text style={styles.hint}>Kolom jumlah ikan dan total berat akan aktif setelah migrasi 202609290001 diterapkan. Data lama tetap bisa diedit.</Text>}
          <Text style={styles.label}>Event terkait</Text><ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>{[{ id: '', title: 'Tanpa event' }, ...data.events].map((event) => <Button key={event.id} label={event.title} onPress={() => setEventId(event.id || null)} muted={(eventId ?? '') !== event.id} />)}</ScrollView>
          <Field label="Catatan operator" value={notes} onChangeText={setNotes} multiline maxLength={500} />
          {preview ? <MediaImage source={{ uri: preview }} style={styles.preview} showRetry fallbackLabel="Foto tidak dapat dibuka. Pilih ulang foto asli." onError={() => setPhotoInvalid(true)} /> : null}
          {photoInvalid ? <Text style={styles.warning}>Foto ini gagal dimuat. Unggah ulang dari galeri HP untuk memperbaikinya.</Text> : null}
          <Button label={photo || editing?.image_path ? 'Ganti foto tangkapan' : 'Tambah foto tangkapan'} onPress={choosePhoto} disabled={Boolean(operation)} muted />
          <Text style={styles.hint}>Foto dikompres otomatis dan diperiksa sebelum diunggah. Foto asli di HP tidak diubah.</Text>
          <Button label={operation === 'save' ? 'Menyimpan...' : 'Simpan penimbangan'} onPress={save} disabled={Boolean(operation)} />
          {editing ? <Button label="Batal mengedit" onPress={reset} disabled={Boolean(operation)} muted /> : null}
        </View>
        <Text style={styles.title}>Hasil tersimpan ({data.leaders.length})</Text>
        {!refreshing && !data.leaders.length ? <Text style={styles.body}>Belum ada hasil penimbangan. Tambahkan melalui formulir di atas.</Text> : null}
        {data.leaders.map((item) => <View key={item.id} style={styles.card}>
          <View style={styles.row}><MediaImage source={item.image_path ? { uri: publicMediaUrl('content', item.image_path) ?? '' } : null} style={styles.thumb} /><View style={styles.flex}><Text style={styles.title}>{item.angler_name}</Text><Text style={styles.body}>{Number(item.fish_weight_kg).toFixed(2)} kg · {item.caught_at}</Text><Text style={styles.kickerOrange}>{item.is_active ? 'Tampil di publik' : 'Disembunyikan'}</Text></View></View>
          <View style={styles.row}><Button label="Edit data & foto" onPress={() => edit(item)} disabled={Boolean(operation)} muted /><Button label={item.is_active ? 'Sembunyikan' : 'Tampilkan'} onPress={() => toggle(item)} disabled={Boolean(operation)} /></View>
        </View>)}
      </>}
    </ScrollView>
  </View></View>;
}

function Field({ label, ...props }: ComponentProps<typeof TextInput> & { label: string }) { return <View style={styles.field}><Text style={styles.label}>{label}</Text><TextInput accessibilityLabel={label} placeholderTextColor={Palette.muted} style={[styles.input, props.multiline && { minHeight: 80, textAlignVertical: 'top' }]} {...props} /></View>; }
function Button({ label, onPress, muted = false, disabled = false }: { label: string; onPress: () => void; muted?: boolean; disabled?: boolean }) { return <Pressable accessibilityRole="button" disabled={disabled} onPress={onPress} style={[styles.button, muted && styles.buttonMuted, disabled && { opacity: 0.5 }]}><Text style={[styles.buttonText, muted && { color: Palette.ink }]}>{label}</Text>{disabled && label === 'Menyimpan...' ? <ActivityIndicator color={Palette.white} /> : null}</Pressable>; }

const styles = StyleSheet.create({
  screen: { flex: 1, alignItems: 'center', backgroundColor: '#D8D2C5' }, page: { flex: 1, width: '100%', maxWidth: MaxContentWidth, backgroundColor: Palette.paper },
  headerSafe: { backgroundColor: Palette.ink }, header: { padding: 16, gap: 14, flexDirection: 'row', alignItems: 'center' }, back: { width: 44, height: 44, borderRadius: 14, backgroundColor: Palette.inkSoft, alignItems: 'center', justifyContent: 'center' }, backText: { color: Palette.white, fontSize: 30 },
  kicker: { fontSize: 11, color: Palette.gold, fontWeight: '900', letterSpacing: 1 }, headerTitle: { fontSize: 28, color: Palette.white, fontWeight: '900', fontFamily: Fonts.display },
  tabs: { flexDirection: 'row', padding: 12, gap: 8, backgroundColor: Palette.surface }, content: { padding: 16, paddingBottom: 48, gap: 16 },
  title: { fontSize: 20, color: Palette.ink, fontWeight: '800', fontFamily: Fonts.display }, body: { fontSize: 14, lineHeight: 21, color: Palette.inkSoft }, hint: { fontSize: 12, lineHeight: 18, color: Palette.muted }, warning: { fontSize: 13, lineHeight: 19, color: Palette.orangeDark },
  kickerOrange: { fontSize: 12, color: Palette.orangeDark, fontWeight: '700' }, card: { padding: 16, gap: 12, borderRadius: Radius.large, backgroundColor: Palette.surface, borderWidth: 1, borderColor: Palette.line },
  notice: { padding: 14, gap: 12, backgroundColor: '#FFF0EB', borderRadius: 16 }, row: { flexDirection: 'row', gap: 10, alignItems: 'center', flexWrap: 'wrap' }, flex: { flex: 1, minWidth: 110 },
  field: { gap: 6 }, label: { fontSize: 12, fontWeight: '800', color: Palette.inkSoft }, input: { minHeight: 50, padding: 12, borderRadius: 12, backgroundColor: '#EEF2EC', fontSize: 16, color: Palette.ink },
  chips: { gap: 8, paddingVertical: 4 }, button: { minHeight: 46, borderRadius: 12, backgroundColor: Palette.orange, paddingVertical: 12, paddingHorizontal: 16, justifyContent: 'center', alignItems: 'center', flexDirection: 'row', gap: 6 }, buttonMuted: { backgroundColor: Palette.mint }, buttonText: { fontSize: 13, fontWeight: '800', color: Palette.white },
  preview: { height: 220, width: '100%', borderRadius: 16 }, thumb: { width: 72, height: 80, borderRadius: 14 }, denied: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 20, backgroundColor: Palette.paper },
});
