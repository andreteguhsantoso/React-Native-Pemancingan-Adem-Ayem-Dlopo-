import type { ImageSource } from 'expo-image';

export type FishingEvent = {
  startsAt?: string;
  endsAt?: string;
  description?: string;
  featured?: boolean;
  id: string;
  title: string;
  label: string;
  date: string;
  shortDate: string;
  time: string;
  fishKg: number;
  price: number;
  availableSpots: number;
  totalSpots: number;
  image: ImageSource;
};

export const events: FishingEvent[] = [
  {
    id: '00000000-0000-4000-8000-000000000225',
    title: 'Grand Mix Babaon',
    label: 'EVENT UTAMA',
    date: 'Minggu, 4 Oktober 2026',
    shortDate: '04 OKT',
    time: '08.00 - 13.00 WIB',
    fishKg: 225,
    price: 100000,
    availableSpots: 14,
    totalSpots: 82,
    image: require('../../assets/images/nila/carousel-event-nila.png'),
  },
  {
    id: '00000000-0000-4000-8000-000000000200',
    title: 'Pesta Nila 200 KG',
    label: 'MANCING BARENG',
    date: 'Sabtu, 10 Oktober 2026',
    shortDate: '10 OKT',
    time: '15.00 - 20.00 WIB',
    fishKg: 200,
    price: 85000,
    availableSpots: 31,
    totalSpots: 82,
    image: require('../../assets/images/nila/gallery-nila.png'),
  },
  {
    id: '00000000-0000-4000-8000-000000000150',
    title: 'Nila Night Strike',
    label: 'SESI MALAM',
    date: 'Jumat, 16 Oktober 2026',
    shortDate: '16 OKT',
    time: '19.00 - 23.30 WIB',
    fishKg: 150,
    price: 70000,
    availableSpots: 25,
    totalSpots: 82,
    image: require('../../assets/images/nila/carousel-night-nila.png'),
  },
  {
    id: '00000000-0000-4000-8000-000000000100',
    title: 'Fun Fishing Nila',
    label: 'HARIAN SERU',
    date: 'Minggu, 25 Oktober 2026',
    shortDate: '25 OKT',
    time: '07.00 - 11.30 WIB',
    fishKg: 100,
    price: 50000,
    availableSpots: 46,
    totalSpots: 82,
    image: require('../../assets/images/nila/venue-nila.png'),
  },
];

export const formatRupiah = (value: number) => `Rp${value.toLocaleString('id-ID')}`;
