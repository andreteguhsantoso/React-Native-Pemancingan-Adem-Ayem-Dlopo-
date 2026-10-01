import { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { MediaImage } from '@/components/media-image';
import { Fonts, Palette } from '@/constants/theme';

export function PaymentProofPreview({ uri }: { uri: string }) {
  const [open, setOpen] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [ratio, setRatio] = useState(1);
  const { width, height } = useWindowDimensions();
  const pictureWidth = Math.min(width - 32, 680) * zoom;
  return <>
    <Pressable accessibilityRole="button" accessibilityLabel="Buka bukti transfer ukuran penuh" onPress={() => { setZoom(1); setOpen(true); }} style={styles.preview}>
      <MediaImage source={{ uri }} contentFit="contain" cachePolicy="none" style={styles.thumbnail} showRetry fallbackLabel="Bukti transfer belum dapat dimuat" />
      <Text style={styles.caption}>Ketuk untuk membaca bukti ukuran penuh</Text>
    </Pressable>
    <Modal visible={open} onRequestClose={() => setOpen(false)} animationType="slide" presentationStyle="fullScreen">
      <SafeAreaView style={styles.modal}>
        <View style={styles.toolbar}><Text style={styles.title}>Bukti transfer privat</Text><Pressable onPress={() => setOpen(false)} style={styles.control}><Text style={styles.controlText}>Tutup</Text></Pressable></View>
        <View style={styles.tools}><Pressable accessibilityLabel="Perkecil bukti" disabled={zoom <= 1} onPress={() => setZoom(Math.max(1, zoom - 0.5))} style={styles.control}><Text style={styles.controlText}>-</Text></Pressable><Text style={styles.zoom}>{Math.round(zoom * 100)}%</Text><Pressable accessibilityLabel="Perbesar bukti" disabled={zoom >= 3} onPress={() => setZoom(Math.min(3, zoom + 0.5))} style={styles.control}><Text style={styles.controlText}>+</Text></Pressable></View>
        <ScrollView contentContainerStyle={styles.vertical} nestedScrollEnabled><ScrollView horizontal contentContainerStyle={styles.horizontal} nestedScrollEnabled>
          <MediaImage source={{ uri }} contentFit="contain" cachePolicy="none" showRetry fallbackLabel="Bukti belum dapat dimuat. Tutup dan muat ulang foto." onLoad={(event) => { if (event.source.width > 0) setRatio(event.source.height / event.source.width); }} style={{ width: pictureWidth, height: Math.max(Math.min(height * 0.65, 500), pictureWidth * ratio) }} />
        </ScrollView></ScrollView>
        <Text style={styles.hint}>Gunakan + untuk memperbesar. Geser gambar untuk membaca seluruh bukti.</Text>
      </SafeAreaView>
    </Modal>
  </>;
}

const styles = StyleSheet.create({
  preview: { borderRadius: 15, overflow: 'hidden', backgroundColor: Palette.inkSoft }, thumbnail: { width: '100%', height: 300 }, caption: { color: Palette.white, fontFamily: Fonts?.rounded, fontSize: 12, textAlign: 'center', padding: 12 }, modal: { flex: 1, backgroundColor: Palette.ink }, toolbar: { padding: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 }, title: { flex: 1, fontFamily: Fonts?.rounded, fontSize: 18, fontWeight: '800', color: Palette.white }, control: { backgroundColor: Palette.mint, minHeight: 44, minWidth: 44, padding: 12, borderRadius: 12, alignItems: 'center', justifyContent: 'center' }, controlText: { color: Palette.ink, fontFamily: Fonts?.rounded, fontWeight: '800', fontSize: 15 }, tools: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 20, paddingBottom: 12 }, zoom: { color: Palette.gold, fontSize: 14, fontFamily: Fonts?.mono }, vertical: { padding: 16 }, horizontal: { minWidth: '100%', justifyContent: 'center' }, hint: { color: '#D5E4E1', fontSize: 12, fontFamily: Fonts?.sans, textAlign: 'center', lineHeight: 19, padding: 14 },
});
