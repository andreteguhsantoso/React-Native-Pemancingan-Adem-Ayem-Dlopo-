export type MediaBucket = 'avatars' | 'gallery' | 'content' | 'payment-proofs';

export function galleryObjectPath(projectUrl: string, value: string) {
  const path = value.trim();
  if (/^https?:\/\//i.test(path)) {
    try {
      const url = new URL(path);
      if (url.origin !== new URL(projectUrl).origin) return null;
      const match = url.pathname.match(/^\/storage\/v1\/object\/(?:public|sign)\/gallery\/(.+)$/);
      return match ? decodeURIComponent(match[1]) : null;
    } catch { return null; }
  }
  const clean = path.replace(/^\/+/, '').replace(/^gallery\//, '');
  return clean && !clean.split('/').some((part) => part === '..' || part === '.' || !part) ? clean : null;
}

export function resolveMediaUrl(projectUrl: string, bucket: MediaBucket, value?: string | null) {
  const path = value?.trim();
  if (!path) return null;
  if (bucket === 'payment-proofs') return null;
  if (/^https?:\/\//i.test(path)) return path;
  if (!projectUrl || /^[a-z]+:/i.test(path)) return null;
  const clean = path.replace(/\\/g, '/').replace(/^\/+/, '').replace(/^storage\/v1\/object\/public\//, '');
  const parts = clean.split('/');
  const storedBucket = ['avatars', 'gallery', 'content'].includes(parts[0]) ? parts.shift()! : bucket;
  if (!parts.length || parts.some((part) => !part || part === '.' || part === '..')) return null;
  const encoded = parts.map((part) => {
    try {
      const decoded = decodeURIComponent(part);
      if (decoded === '.' || decoded === '..' || decoded.includes('/') || decoded.includes('\\')) return null;
      return encodeURIComponent(decoded);
    }
    catch { return encodeURIComponent(part); }
  });
  if (encoded.includes(null)) return null;
  return `${projectUrl.replace(/\/$/, '')}/storage/v1/object/public/${storedBucket}/${encoded.join('/')}`;
}

export function imageMimeFromBytes(bytes: Uint8Array): string | null {
  if (bytes.length < 128) return null;
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return 'image/jpeg';
  if ([137, 80, 78, 71, 13, 10, 26, 10].every((byte, index) => bytes[index] === byte)) return 'image/png';
  if (String.fromCharCode(...bytes.slice(0, 4)) === 'RIFF' && String.fromCharCode(...bytes.slice(8, 12)) === 'WEBP') return 'image/webp';
  return null;
}
