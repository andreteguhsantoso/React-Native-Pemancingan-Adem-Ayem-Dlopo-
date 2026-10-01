import type { ImageSource } from 'expo-image';

export type GalleryCategory = 'Event' | 'Tangkapan' | 'Momen' | 'Kolam';

export type GalleryItem = {
  id: string;
  title: string;
  category: GalleryCategory;
  date: string;
  event: string;
  image: ImageSource;
};

export const galleryItems: GalleryItem[] = [
  {
    id: 'release-225',
    title: 'Pelepasan 225 KG Nila',
    category: 'Event',
    date: '30 Agustus 2026',
    event: 'Grand Mix Babaon',
    image: require('../../assets/images/nila/gallery-release.png'),
  },
  {
    id: 'champion-catch',
    title: 'Senyum Sang Juara',
    category: 'Tangkapan',
    date: '30 Agustus 2026',
    event: 'Grand Mix Babaon',
    image: require('../../assets/images/nila/leaderboard-champion.png'),
  },
  {
    id: 'night-strike',
    title: 'Strike di Bawah Lampu',
    category: 'Event',
    date: '22 Agustus 2026',
    event: 'Nila Night Strike',
    image: require('../../assets/images/nila/gallery-night-event.png'),
  },
  {
    id: 'family-day',
    title: 'Mancing Bareng Keluarga',
    category: 'Momen',
    date: '16 Agustus 2026',
    event: 'Fun Fishing Nila',
    image: require('../../assets/images/nila/gallery-family.png'),
  },
  {
    id: 'best-catch',
    title: 'Nila Pilihan Hari Ini',
    category: 'Tangkapan',
    date: '9 Agustus 2026',
    event: 'Mancing Harian',
    image: require('../../assets/images/nila/gallery-nila.png'),
  },
  {
    id: 'pond-morning',
    title: 'Pagi Tenang di Kolam',
    category: 'Kolam',
    date: '2 Agustus 2026',
    event: 'Suasana Pemancingan',
    image: require('../../assets/images/nila/venue-nila.png'),
  },
];

export type LeaderboardPeriod = 'Hari Ini' | 'Per Event' | 'Bulanan';

export type LeaderboardEntry = {
  eventId?: string | null;
  dateKey?: string;
  id: string;
  name: string;
  event: string;
  biggestKg: number;
  totalKg: number;
  fishCount: number;
  caughtAt: string;
  image: ImageSource;
  periods: LeaderboardPeriod[];
};

export const leaderboardEntries: LeaderboardEntry[] = [
  {
    id: 'satria-wibowo',
    name: 'Satria Wibowo',
    event: 'Grand Mix Babaon',
    biggestKg: 3.82,
    totalKg: 12.4,
    fishCount: 4,
    caughtAt: 'Lapak 27 · 30 Agu 2026',
    image: require('../../assets/images/nila/leaderboard-champion.png'),
    periods: ['Hari Ini', 'Per Event', 'Bulanan'],
  },
  {
    id: 'bayu-prasetyo',
    name: 'Bayu Prasetyo',
    event: 'Grand Mix Babaon',
    biggestKg: 3.45,
    totalKg: 11.7,
    fishCount: 4,
    caughtAt: 'Lapak 41 · 30 Agu 2026',
    image: require('../../assets/images/nila/leaderboard-man.png'),
    periods: ['Hari Ini', 'Per Event', 'Bulanan'],
  },
  {
    id: 'ayu-lestari',
    name: 'Ayu Lestari',
    event: 'Grand Mix Babaon',
    biggestKg: 3.2,
    totalKg: 9.8,
    fishCount: 3,
    caughtAt: 'Lapak 08 · 30 Agu 2026',
    image: require('../../assets/images/nila/leaderboard-woman.png'),
    periods: ['Hari Ini', 'Per Event', 'Bulanan'],
  },
  {
    id: 'dimas-ardana',
    name: 'Dimas Ardana',
    event: 'Nila Night Strike',
    biggestKg: 3.08,
    totalKg: 14.2,
    fishCount: 5,
    caughtAt: 'Lapak 63 · 22 Agu 2026',
    image: require('../../assets/images/nila/gallery-night-event.png'),
    periods: ['Per Event', 'Bulanan'],
  },
  {
    id: 'rudi-hartono',
    name: 'Rudi Hartono',
    event: 'Fun Fishing Nila',
    biggestKg: 2.94,
    totalKg: 10.5,
    fishCount: 4,
    caughtAt: 'Lapak 15 · 16 Agu 2026',
    image: require('../../assets/images/nila/gallery-family.png'),
    periods: ['Per Event', 'Bulanan'],
  },
  {
    id: 'andi-saputra',
    name: 'Andi Saputra',
    event: 'Mancing Harian',
    biggestKg: 2.86,
    totalKg: 8.7,
    fishCount: 3,
    caughtAt: 'Lapak 72 · 9 Agu 2026',
    image: require('../../assets/images/nila/gallery-nila.png'),
    periods: ['Bulanan'],
  },
];
