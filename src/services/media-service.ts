import { File } from 'expo-file-system';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';
import { Platform } from 'react-native';

import { galleryObjectPath, imageMimeFromBytes, MediaBucket, resolveMediaUrl } from '@/lib/media-validation';
import { requireSupabase } from '@/lib/supabase';

export type PickedImage = { uri: string; mimeType: string; fileName: string; width?: number; height?: number };

export async function pickImage(aspect: [number, number], allowsEditing = true): Promise<PickedImage | null> {
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'], allowsEditing, aspect, quality: 1,
  });
  if (result.canceled || !result.assets[0]) return null;
  const asset = result.assets[0];
  return { uri: asset.uri, mimeType: asset.mimeType || 'image/jpeg', fileName: asset.fileName || 'photo.jpg', width: asset.width, height: asset.height };
}

export async function uploadUserImage(bucket: MediaBucket, userId: string, image: PickedImage) {
  const client = requireSupabase();
  const context = ImageManipulator.manipulate(image.uri);
  const limit = bucket === 'avatars' ? 640 : 1600;
  if (image.width && image.height && Math.max(image.width, image.height) > limit) {
    context.resize(image.width >= image.height ? { width: limit } : { height: limit });
  }
  let uri: string;
  try {
    const rendered = await context.renderAsync();
    uri = (await rendered.saveAsync({ format: SaveFormat.JPEG, compress: 0.82 })).uri;
  } catch {
    throw new Error('Foto tidak dapat diproses. Pilih ulang foto asli dari galeri perangkat.');
  }
  // Native fetch(file://) can return HTTP 200 with "File not found" instead of image bytes.
  let body: ArrayBuffer;
  if (Platform.OS === 'web') {
    const response = await fetch(uri);
    if (!response.ok) throw new Error('Foto tidak dapat dibaca. Silakan pilih ulang.');
    body = await response.arrayBuffer();
  } else {
    const file = new File(uri);
    if (!file.exists || file.size === 0) throw new Error('File foto tidak ditemukan. Silakan pilih ulang.');
    body = await file.arrayBuffer();
  }
  const mime = imageMimeFromBytes(new Uint8Array(body));
  if (!mime) throw new Error('Isi file bukan gambar yang valid. Foto tidak diunggah; silakan pilih ulang.');
  if (body.byteLength > 5 * 1024 * 1024) throw new Error('Foto masih melebihi 5 MB setelah diperkecil. Pilih foto lain.');
  const path = `${userId}/${Date.now()}-${Math.random().toString(36).slice(2, 10)}.jpg`;
  const { error } = await client.storage.from(bucket).upload(path, body, { contentType: mime, cacheControl: '31536000', upsert: false });
  if (error) throw new Error(`Unggahan gagal: ${error.message}`);
  return path;
}

export function publicMediaUrl(bucket: MediaBucket, path: string | null | undefined) {
  return resolveMediaUrl(process.env.EXPO_PUBLIC_SUPABASE_URL?.trim() ?? '', bucket, path);
}

export async function galleryMediaUrls(paths: string[]) {
  const urls = new Map<string, string>();
  const projectUrl = process.env.EXPO_PUBLIC_SUPABASE_URL?.trim() ?? '';
  const objects = new Map(paths.map((path) => [path, galleryObjectPath(projectUrl, path)]));
  const storagePaths = [...new Set([...objects.values()].filter((path): path is string => Boolean(path)))];
  if (storagePaths.length) {
    const { data, error } = await requireSupabase().storage.from('gallery').createSignedUrls(storagePaths, 900);
    if (error) throw new Error(`Akses foto belum tersedia: ${error.message}`);
    const signed = new Map((data ?? []).filter((item) => !item.error && item.path && item.signedUrl).map((item) => [item.path, item.signedUrl!]));
    objects.forEach((path, original) => { if (path && signed.has(path)) urls.set(original, signed.get(path)!); });
  }
  objects.forEach((path, original) => { if (!path && /^https?:\/\//i.test(original)) urls.set(original, original); });
  return urls;
}
