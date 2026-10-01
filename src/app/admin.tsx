import { Href, useRouter } from 'expo-router';
import { ComponentProps, useEffect, useState } from 'react';
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
import { useEvents } from '@/context/events-context';
import type { EventStatus, RemoteEvent } from '@/lib/database.types';
import { requireSupabase } from '@/lib/supabase';
import { MediaImage } from '@/components/media-image';
import { normalizeDate, parseDecimal } from '@/lib/domain';
import { pickImage, PickedImage, publicMediaUrl, uploadUserImage } from '@/services/media-service';

type EventForm = {
  description: string;
  imagePath: string | null;
  endsDate: string;
  featured: boolean;
  title: string;
  label: string;
  date: string;
  startsAt: string;
  endsAt: string;
  fishKg: string;
  price: string;
  totalSpots: string;
  status: EventStatus;
};

const emptyForm: EventForm = {
  description: '', imagePath: null, endsDate: '', featured: false,
  title: '',
  label: 'EVENT NILA',
  date: '',
  startsAt: '08:00',
  endsAt: '13:00',
  fishKg: '100',
  price: '50000',
  totalSpots: '82',
  status: 'draft',
};

function slugify(value: string) {
  return value.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function datePart(value: string) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit',
    hourCycle: 'h23', timeZone: 'Asia/Jakarta',
  }).formatToParts(new Date(value));
  const get = (type: string) => parts.find((part) => part.type === type)?.value ?? '';
  return { date: `${get('year')}-${get('month')}-${get('day')}`, time: `${get('hour')}:${get('minute')}` };
}

export default function AdminScreen() {
  const router = useRouter();
  const { profile, session } = useAuth();
  const { refreshEvents } = useEvents();
  const [items, setItems] = useState<RemoteEvent[]>([]);
  const [form, setForm] = useState<EventForm>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [photo, setPhoto] = useState<PickedImage | null>(null);
  const isStaff = profile?.role === 'admin' || profile?.role === 'operator';

  const loadEvents = async () => {
    const { data, error } = await requireSupabase().from('events').select('*').order('starts_at');
    if (error) throw new Error(error.message);
    setItems(data as RemoteEvent[]);
  };

  useEffect(() => {
    if (!isStaff) return;
    const timer = setTimeout(() => {
      loadEvents().catch((error) => Alert.alert('Gagal memuat event', error.message)).finally(() => setLoading(false));
    }, 0);
    return () => clearTimeout(timer);
  }, [isStaff]);

  const editEvent = (event: RemoteEvent) => {
    const start = datePart(event.starts_at);
    const end = datePart(event.ends_at);
    setEditingId(event.id);
    setPhoto(null);
    setForm({
      description: event.description, imagePath: event.image_path, endsDate: end.date, featured: event.featured,
      title: event.title,
      label: event.label,
      date: start.date,
      startsAt: start.time,
      endsAt: end.time,
      fishKg: String(event.fish_kg),
      price: String(event.price),
      totalSpots: String(event.total_spots),
      status: event.status,
    });
  };

  const resetForm = () => {
    setEditingId(null);
    setForm(emptyForm);
    setPhoto(null);
  };

  const saveEvent = async () => {
    if (saving) return;
    const fishKg = parseDecimal(form.fishKg);
    const price = Number(form.price);
    const totalSpots = Number(form.totalSpots);
    if (form.title.trim().length < 3) return Alert.alert('Judul belum lengkap', 'Masukkan minimal 3 karakter.');
    const startsDate = normalizeDate(form.date);
    const endsDate = normalizeDate(form.endsDate || form.date);
    if (!startsDate || !endsDate) return Alert.alert('Tanggal tidak valid', 'Gunakan tanggal kalender yang benar, misalnya 2026-10-30.');
    const timePattern = /^(?:[01]\d|2[0-3]):[0-5]\d$/;
    if (!timePattern.test(form.startsAt) || !timePattern.test(form.endsAt)) return Alert.alert('Jam tidak valid', 'Gunakan jam antara 00:00 dan 23:59.');
    const startsAt = `${startsDate}T${form.startsAt}:00+07:00`;
    const endsAt = `${endsDate}T${form.endsAt}:00+07:00`;
    if (new Date(endsAt).getTime() <= new Date(startsAt).getTime()) return Alert.alert('Waktu selesai belum benar', 'Selesai harus setelah mulai. Untuk event lewat tengah malam, isi tanggal selesai hari berikutnya.');
    if (!Number.isFinite(fishKg) || fishKg <= 0 || !Number.isInteger(price) || price < 0) return Alert.alert('Angka tidak valid', 'Periksa jumlah ikan dan harga tiket.');
    if (!Number.isInteger(totalSpots) || totalSpots < 1 || totalSpots > 82) return Alert.alert('Jumlah lapak tidak valid', 'Kapasitas event harus antara 1 sampai 82 lapak.');

    setSaving(true);
    try {
      const imagePath = photo && session ? await uploadUserImage('content', session.user.id, photo) : form.imagePath;
      const payload = {
        title: form.title.trim(),
        label: form.label.trim() || 'EVENT NILA',
        description: form.description.trim() || `Event ikan nila ${fishKg} kg untuk ${totalSpots} lapak.`,
        image_path: imagePath, featured: form.featured,
        starts_at: startsAt,
        ends_at: endsAt,
        fish_kg: fishKg,
        price,
        total_spots: totalSpots,
        status: form.status,
      };
      const client = requireSupabase();
      const result = editingId
        ? await client.from('events').update(payload).eq('id', editingId).select('id').single()
        : await client.from('events').insert({
            ...payload,
            slug: `${slugify(form.title)}-${Date.now().toString(36)}`,
            created_by: session?.user.id,
          }).select('id').single();
      if (result.error) throw new Error(result.error.message);
      await Promise.all([loadEvents(), refreshEvents()]);
      resetForm();
      Alert.alert('Tersimpan', editingId ? 'Event berhasil diperbarui.' : 'Event baru berhasil dibuat.');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Silakan coba kembali.';
      Alert.alert('Gagal menyimpan', message.includes('EVENT_CAPACITY_BELOW_ACTIVE_BOOKING') ? 'Jumlah lapak tidak dapat dikurangi karena ada booking aktif pada nomor yang lebih tinggi.' : message);
    } finally {
      setSaving(false);
    }
  };

  const togglePublished = async (event: RemoteEvent) => {
    const status: EventStatus = event.status === 'published' ? 'draft' : 'published';
    const { error } = await requireSupabase().from('events').update({ status }).eq('id', event.id);
    if (error) return Alert.alert('Gagal memperbarui', error.message);
    try { await Promise.all([loadEvents(), refreshEvents()]); }
    catch { Alert.alert('Status tersimpan', 'Penyegaran daftar belum berhasil. Buka ulang halaman.'); }
  };

  if (!isStaff) {
    return (
      <SafeAreaView style={styles.denied}>
        <Text style={styles.deniedTitle}>Akses khusus pengelola</Text>
        <Text style={styles.deniedText}>Akun Anda tidak memiliki izin untuk mengelola konten.</Text>
        <Pressable onPress={() => router.replace('/profile')} style={styles.primaryButton}>
          <Text style={styles.primaryButtonText}>Kembali ke profil</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  return (
    <View style={styles.screen}>
      <KeyboardAvoidingView style={styles.page} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <SafeAreaView edges={['top']} style={styles.headerSafe}>
          <View style={styles.header}>
            <Pressable onPress={() => router.back()} style={styles.backButton}><Text style={styles.backText}>‹</Text></Pressable>
            <View style={styles.headerCopy}>
              <Text style={styles.headerKicker}>PANEL PENGELOLA</Text>
              <Text style={styles.headerTitle}>Kelola event</Text>
            </View>
            <Pressable onPress={() => router.push('/profile' as Href)} style={styles.roleBadge}><Text style={styles.roleText}>{profile?.role.toUpperCase()}</Text></Pressable>
          </View>
        </SafeAreaView>

        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.content}>
          <View style={styles.notice}>
            <Text style={styles.noticeTitle}>Carousel mengikuti event aktif</Text>
            <Text style={styles.noticeText}>Event berstatus Terbit langsung muncul di beranda dan agenda pengguna.</Text>
          </View>
          <Pressable onPress={() => router.push('/admin-community' as Href)} style={styles.communityButton}>
            <View><Text style={styles.communityKicker}>KONTEN KOMUNITAS</Text><Text style={styles.communityTitle}>Moderasi galeri & leaderboard</Text></View><Text style={styles.communityArrow}>→</Text>
          </Pressable>
          <Pressable onPress={() => router.push('/admin-bookings' as Href)} style={[styles.communityButton, styles.bookingsButton]}>
            <View><Text style={styles.communityKicker}>KONTROL LAPAK</Text><Text style={styles.communityTitle}>Ketersediaan & data pemesan</Text></View><Text style={styles.communityArrow}>→</Text>
          </Pressable>
          <Pressable onPress={() => router.push('/admin-content' as Href)} style={[styles.communityButton, styles.contentButton]}>
            <View><Text style={styles.communityKicker}>INFORMASI RESMI</Text><Text style={styles.communityTitle}>Berita & operasional kolam</Text></View><Text style={styles.communityArrow}>→</Text>
          </Pressable>
          <Pressable onPress={() => router.push('/admin-payments')} style={[styles.communityButton, styles.bookingsButton]}>
            <View><Text style={styles.communityKicker}>PEMBAYARAN TIKET</Text><Text style={styles.communityTitle}>Rekening & verifikasi transfer</Text></View><Text style={styles.communityArrow}>→</Text>
          </Pressable>

          <View style={styles.formCard}>
            <Text style={styles.formTitle}>{editingId ? 'Perbarui event' : 'Event baru'}</Text>
            <AdminField label="JUDUL EVENT" value={form.title} onChangeText={(title) => setForm({ ...form, title })} placeholder="Grand Mix Babaon" />
            <AdminField label="LABEL" value={form.label} onChangeText={(label) => setForm({ ...form, label })} placeholder="EVENT UTAMA" />
            <AdminField label="DESKRIPSI EVENT" value={form.description} onChangeText={(description) => setForm({ ...form, description })} multiline placeholder="Informasi acara, ketentuan, dan hadiah" />
            <AdminField label="TANGGAL" value={form.date} onChangeText={(date) => setForm({ ...form, date })} placeholder="2026-10-30" />
            <AdminField label="TANGGAL SELESAI (KOSONGKAN JIKA SAMA)" value={form.endsDate} onChangeText={(endsDate) => setForm({ ...form, endsDate })} placeholder={form.date || 'YYYY-MM-DD'} />
            <View style={styles.row}>
              <View style={styles.flex}><AdminField label="MULAI" value={form.startsAt} onChangeText={(startsAt) => setForm({ ...form, startsAt })} placeholder="08:00" /></View>
              <View style={styles.flex}><AdminField label="SELESAI" value={form.endsAt} onChangeText={(endsAt) => setForm({ ...form, endsAt })} placeholder="13:00" /></View>
            </View>
            <View style={styles.row}>
              <View style={styles.flex}><AdminField label="IKAN NILA (KG)" value={form.fishKg} onChangeText={(fishKg) => setForm({ ...form, fishKg })} keyboardType="numeric" /></View>
              <View style={styles.flex}><AdminField label="HARGA TIKET" value={form.price} onChangeText={(price) => setForm({ ...form, price })} keyboardType="numeric" /></View>
            </View>
            <AdminField label="JUMLAH LAPAK (MAKSIMAL 82)" value={form.totalSpots} onChangeText={(totalSpots) => setForm({ ...form, totalSpots })} keyboardType="number-pad" />
            {photo || form.imagePath ? <MediaImage source={{ uri: photo?.uri || publicMediaUrl('content', form.imagePath) || '' }} style={{ height: 200, width: '100%', borderRadius: 16 }} showRetry fallbackLabel="Foto event belum dapat dimuat. Pilih ulang foto asli." /> : null}
            <Pressable disabled={saving} onPress={async () => { try { const selected = await pickImage([16, 9]); if (selected) setPhoto(selected); } catch { Alert.alert('Foto belum dipilih', 'Coba buka kembali galeri perangkat.'); } }} style={styles.primaryButton}><Text style={styles.primaryButtonText}>{photo || form.imagePath ? 'Ganti foto event / slide beranda' : 'Tambah foto event / slide beranda'}</Text></Pressable>
            <Pressable onPress={() => setForm({ ...form, featured: !form.featured })} style={[styles.statusChip, form.featured && styles.statusChipActive]}><Text style={[styles.statusText, form.featured && styles.statusTextActive]}>{form.featured ? '✓ Event unggulan' : 'Jadikan event unggulan'}</Text></Pressable>
            <View style={styles.statusRow}>
              {(['draft', 'published'] as EventStatus[]).map((status) => (
                <Pressable key={status} onPress={() => setForm({ ...form, status })} style={[styles.statusChip, form.status === status && styles.statusChipActive]}>
                  <Text style={[styles.statusText, form.status === status && styles.statusTextActive]}>{status === 'published' ? 'Terbit' : 'Draf'}</Text>
                </Pressable>
              ))}
            </View>
            <Pressable disabled={saving} onPress={saveEvent} style={[styles.primaryButton, saving && styles.disabled]}>
              {saving ? <ActivityIndicator color={Palette.white} /> : <Text style={styles.primaryButtonText}>{editingId ? 'Simpan perubahan' : 'Buat event'}</Text>}
            </Pressable>
            {editingId ? <Pressable onPress={resetForm} style={styles.cancelButton}><Text style={styles.cancelText}>Batal mengedit</Text></Pressable> : null}
          </View>

          <Text style={styles.listTitle}>SEMUA EVENT</Text>
          {loading ? <ActivityIndicator color={Palette.orange} /> : items.map((event) => (
            <View key={event.id} style={styles.eventCard}>
              <View style={styles.eventCopy}>
                <Text style={styles.eventStatus}>{event.status.toUpperCase()}</Text>
                <Text style={styles.eventTitle}>{event.title}</Text>
                <Text style={styles.eventMeta}>{Number(event.fish_kg)} kg · Rp{event.price.toLocaleString('id-ID')} · {event.total_spots} lapak</Text>
              </View>
              <Pressable onPress={() => editEvent(event)} style={styles.editButton}><Text style={styles.editText}>Edit</Text></Pressable>
              <Pressable onPress={() => togglePublished(event)} style={styles.toggleButton}><Text style={styles.toggleText}>{event.status === 'published' ? 'Tarik' : 'Terbitkan'}</Text></Pressable>
            </View>
          ))}
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

function AdminField({ label, ...props }: ComponentProps<typeof TextInput> & { label: string }) {
  return <View style={styles.field}><Text style={[styles.fieldLabel, { fontSize: 12 }]}>{label}</Text><TextInput accessibilityLabel={label} placeholderTextColor="#9AA6A2" style={[styles.input, { fontSize: 16 }, props.multiline && { height: 90, textAlignVertical: 'top', paddingTop: 12 }]} {...props} /></View>;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#D8D2C5', alignItems: 'center' },
  page: { flex: 1, width: '100%', maxWidth: MaxContentWidth, backgroundColor: Palette.paper },
  headerSafe: { backgroundColor: Palette.ink },
  header: { height: 76, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center' },
  backButton: { width: 44, height: 44, borderRadius: 15, backgroundColor: Palette.inkSoft, alignItems: 'center', justifyContent: 'center' },
  backText: { color: Palette.white, fontSize: 32, lineHeight: 34 },
  headerCopy: { flex: 1, paddingHorizontal: 13 },
  headerKicker: { color: Palette.gold, fontFamily: Fonts?.rounded, fontSize: 8, fontWeight: '900', letterSpacing: 1.2 },
  headerTitle: { color: Palette.white, fontFamily: Fonts?.display, fontSize: 25, fontWeight: '900' },
  roleBadge: { backgroundColor: Palette.gold, borderRadius: 10, paddingHorizontal: 9, paddingVertical: 7 },
  roleText: { color: Palette.ink, fontFamily: Fonts?.rounded, fontSize: 7, fontWeight: '900' },
  content: { padding: 15, paddingBottom: 40 },
  notice: { borderRadius: Radius.medium, backgroundColor: Palette.gold, padding: 14, marginBottom: 13 },
  noticeTitle: { color: Palette.ink, fontFamily: Fonts?.rounded, fontSize: 11, fontWeight: '900' },
  noticeText: { color: Palette.inkSoft, fontFamily: Fonts?.sans, fontSize: 9, lineHeight: 14, marginTop: 3 },
  communityButton: { minHeight: 66, borderRadius: Radius.medium, backgroundColor: Palette.sky, paddingHorizontal: 15, marginBottom: 13, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, communityKicker: { color: Palette.inkSoft, fontFamily: Fonts?.rounded, fontSize: 7, fontWeight: '900', letterSpacing: 1 }, communityTitle: { color: Palette.ink, fontFamily: Fonts?.display, fontSize: 18, fontWeight: '900', marginTop: 2 }, communityArrow: { color: Palette.ink, fontSize: 23 },
  contentButton: { backgroundColor: Palette.mint },
  bookingsButton: { backgroundColor: Palette.gold },
  formCard: { borderRadius: Radius.large, backgroundColor: Palette.surface, padding: 16, gap: 13, borderWidth: 1, borderColor: '#E5DED1' },
  formTitle: { color: Palette.ink, fontFamily: Fonts?.display, fontSize: 24, fontWeight: '900' },
  field: { gap: 6 },
  fieldLabel: { color: Palette.inkSoft, fontFamily: Fonts?.rounded, fontSize: 7, fontWeight: '900', letterSpacing: 0.9 },
  input: { height: 49, borderRadius: 13, backgroundColor: '#EEF2EC', paddingHorizontal: 12, color: Palette.ink, fontFamily: Fonts?.sans, fontSize: 11 },
  row: { flexDirection: 'row', gap: 9 },
  flex: { flex: 1 },
  statusRow: { flexDirection: 'row', gap: 8 },
  statusChip: { flex: 1, height: 42, borderRadius: 12, borderWidth: 1, borderColor: Palette.line, alignItems: 'center', justifyContent: 'center' },
  statusChipActive: { backgroundColor: Palette.ink, borderColor: Palette.ink },
  statusText: { color: Palette.inkSoft, fontFamily: Fonts?.rounded, fontSize: 9, fontWeight: '900' },
  statusTextActive: { color: Palette.white },
  primaryButton: { height: 51, borderRadius: 15, backgroundColor: Palette.orange, alignItems: 'center', justifyContent: 'center' },
  primaryButtonText: { color: Palette.white, fontFamily: Fonts?.rounded, fontSize: 11, fontWeight: '900' },
  disabled: { opacity: 0.6 },
  cancelButton: { alignItems: 'center', padding: 6 },
  cancelText: { color: Palette.orangeDark, fontFamily: Fonts?.rounded, fontSize: 9, fontWeight: '900' },
  listTitle: { color: Palette.orange, fontFamily: Fonts?.rounded, fontSize: 9, fontWeight: '900', letterSpacing: 1.1, marginTop: 25, marginBottom: 10 },
  eventCard: { backgroundColor: Palette.surface, borderRadius: Radius.medium, padding: 13, marginBottom: 9, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#E5DED1' },
  eventCopy: { flex: 1 },
  eventStatus: { color: Palette.orange, fontFamily: Fonts?.rounded, fontSize: 7, fontWeight: '900', letterSpacing: 0.8 },
  eventTitle: { color: Palette.ink, fontFamily: Fonts?.rounded, fontSize: 12, fontWeight: '900', marginTop: 2 },
  eventMeta: { color: Palette.muted, fontFamily: Fonts?.sans, fontSize: 8, marginTop: 3 },
  editButton: { borderRadius: 10, backgroundColor: Palette.mint, paddingHorizontal: 10, paddingVertical: 9, marginLeft: 6 },
  editText: { color: Palette.ink, fontFamily: Fonts?.rounded, fontSize: 8, fontWeight: '900' },
  toggleButton: { borderRadius: 10, backgroundColor: Palette.ink, paddingHorizontal: 9, paddingVertical: 9, marginLeft: 5 },
  toggleText: { color: Palette.white, fontFamily: Fonts?.rounded, fontSize: 7, fontWeight: '900' },
  denied: { flex: 1, backgroundColor: Palette.paper, alignItems: 'center', justifyContent: 'center', padding: 28 },
  deniedTitle: { color: Palette.ink, fontFamily: Fonts?.display, fontSize: 27, fontWeight: '900' },
  deniedText: { color: Palette.muted, fontFamily: Fonts?.sans, fontSize: 11, textAlign: 'center', marginVertical: 12 },
});
