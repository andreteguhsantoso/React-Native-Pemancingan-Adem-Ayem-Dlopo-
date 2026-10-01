import type { ImageSource } from 'expo-image';

export type NewsCategory = 'Event' | 'Kolam' | 'Aturan' | 'Pengumuman';

export type NewsItem = {
  id: string;
  category: NewsCategory;
  title: string;
  summary: string;
  date: string;
  readTime: string;
  badge: string;
  image: ImageSource;
  featured?: boolean;
  relatedEventId?: string;
  paragraphs: string[];
  facts?: { label: string; value: string }[];
};

export const newsItems: NewsItem[] = [
  {
    id: 'grand-mix-babaon-dibuka',
    category: 'Event',
    title: 'Pendaftaran Grand Mix Babaon Sudah Dibuka',
    summary: 'Event utama dengan pelepasan 225 kg ikan nila, tiket Rp100.000, dan total 82 lapak.',
    date: '2 September 2026',
    readTime: '2 menit',
    badge: 'PENDAFTARAN DIBUKA',
    image: require('../../assets/images/nila/carousel-event-nila.png'),
    featured: true,
    relatedEventId: '00000000-0000-4000-8000-000000000225',
    paragraphs: [
      'Pemancingan Adem Ayem Dlopo membuka pendaftaran Grand Mix Babaon untuk Minggu, 6 September 2026. Event berlangsung pukul 08.00 sampai 13.00 WIB.',
      'Sebanyak 225 kg ikan nila akan dilepas untuk dipancing pada hari event. Satu tiket berlaku untuk satu lapak dan peserta dapat memilih dari total 82 lapak yang tersedia.',
      'Peserta disarankan datang lebih awal untuk pemeriksaan tiket dan persiapan alat. Gunakan umpan berbahan alami sesuai aturan kolam.',
    ],
    facts: [
      { label: 'IKAN DILEPAS', value: '225 KG NILA' },
      { label: 'HARGA TIKET', value: 'Rp100.000' },
      { label: 'TOTAL LAPAK', value: '82 LAPAK' },
    ],
  },
  {
    id: 'pelepasan-nila-225',
    category: 'Kolam',
    title: 'Persiapan Pelepasan 225 KG Nila',
    summary: 'Operator menyiapkan dokumentasi dan pemerataan pelepasan ikan sebelum Grand Mix Babaon.',
    date: '1 September 2026',
    readTime: '2 menit',
    badge: 'DARI KOLAM',
    image: require('../../assets/images/nila/gallery-release.png'),
    paragraphs: [
      'Tim kolam mulai menyiapkan proses pelepasan ikan nila untuk Grand Mix Babaon. Pelepasan dilakukan bertahap agar ikan tersebar lebih merata di seluruh area kolam.',
      'Jumlah ikan yang disiapkan adalah 225 kg dan hanya terdiri dari ikan nila. Proses pelepasan didokumentasikan oleh operator sebagai bagian dari transparansi event.',
      'Kondisi ikan akan dipantau sampai hari pelaksanaan. Informasi mood ikan terbaru tersedia di Beranda aplikasi.',
    ],
    facts: [
      { label: 'JENIS IKAN', value: 'NILA' },
      { label: 'TOTAL TEBAR', value: '225 KG' },
      { label: 'STATUS', value: 'PERSIAPAN' },
    ],
  },
  {
    id: 'panduan-umpan-alami',
    category: 'Aturan',
    title: 'Panduan Umpan Alami di Kolam Adem Ayem',
    summary: 'Umpan wajib berasal dari bahan alami. Essen atau pemanis hanya boleh menjadi campuran.',
    date: '31 Agustus 2026',
    readTime: '3 menit',
    badge: 'WAJIB DIBACA',
    image: require('../../assets/images/nila/news-natural-bait.png'),
    paragraphs: [
      'Semua pemancing wajib menggunakan umpan yang berasal dari bahan alami. Contohnya antara lain cacing, jagung, singkong, lumut, nasi, dan adonan berbahan alami.',
      'Media umpan yang tidak berasal dari alam tidak diperbolehkan. Essen atau pemanis tetap boleh digunakan, tetapi hanya sebagai campuran pada umpan alami dan bukan sebagai media utama.',
      'Operator berhak memeriksa umpan sebelum atau selama event. Aturan ini menjaga kondisi kolam, kesehatan ikan nila, dan rasa adil bagi seluruh peserta.',
    ],
    facts: [
      { label: 'UMPAN UTAMA', value: 'BAHAN ALAMI' },
      { label: 'ESSEN/PEMANIS', value: 'BOLEH DICAMPUR' },
      { label: 'MEDIA NON-ALAMI', value: 'DILARANG' },
    ],
  },
  {
    id: 'prediksi-event-oktober',
    category: 'Pengumuman',
    title: 'Prediksi Agenda Nila Bulan Oktober',
    summary: 'Pengelola sedang menyiapkan event lanjutan. Tanggal dan jumlah ikan belum ditetapkan.',
    date: '29 Agustus 2026',
    readTime: '1 menit',
    badge: 'BELUM FINAL',
    image: require('../../assets/images/nila/gallery-family.png'),
    paragraphs: [
      'Pemancingan Adem Ayem Dlopo sedang menyusun agenda event ikan nila untuk bulan Oktober. Rencana awal mencakup sesi keluarga dan satu event malam.',
      'Informasi ini masih berupa prediksi. Tanggal, harga tiket, jumlah ikan tebar, dan jam pelaksanaan belum final sehingga belum dapat dipesan.',
      'Pengumuman resmi akan tampil di halaman Agenda setelah operator menyelesaikan jadwal dan membuka pendaftaran.',
    ],
    facts: [
      { label: 'BULAN', value: 'OKTOBER 2026' },
      { label: 'STATUS', value: 'PREDIKSI' },
      { label: 'PEMESANAN', value: 'BELUM DIBUKA' },
    ],
  },
];

export function findNewsItem(id: string | undefined) {
  return newsItems.find((item) => item.id === id);
}
