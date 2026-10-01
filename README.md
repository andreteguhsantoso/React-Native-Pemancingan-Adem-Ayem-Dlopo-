# Pemancingan Adem Ayem Dlopo

Aplikasi React Native + Expo untuk informasi event nila, pemesanan 82 lapak, tiket, galeri komunitas, leaderboard, berita, lokasi, serta pengelolaan konten oleh admin.

Mode tamu dapat melihat seluruh informasi publik. Akun pengguna diperlukan untuk booking, riwayat pesanan, profil, dan unggah galeri. Admin/operator dapat mengelola event, berita, jam operasional, mood ikan, aturan kolam, moderasi galeri, leaderboard, serta permintaan penghapusan akun langsung dari aplikasi. Pemulihan password menggunakan deep link `ademayemdlopo://`.

## Menjalankan aplikasi

```powershell
npm install
npx expo start
```

Scan QR menggunakan Expo Go untuk pratinjau. Login, booking, unggah foto, serta panel admin online memerlukan konfigurasi Supabase pada `.env`.

Booking yang baru dibuat berstatus menunggu pembayaran. Tiket digital hanya terbuka setelah backend mengubah status menjadi `paid` atau `confirmed`; aplikasi tidak pernah menganggap redirect pembayaran sebagai bukti pembayaran.

Transfer bank manual tersedia setelah migrasi pembayaran diterapkan dan admin mengaktifkan rekening asli. Pengguna mengunggah bukti privat, lalu admin/operator mengonfirmasi dana masuk sebelum tiket aktif. QRIS, VA, dan e-wallet otomatis belum tersedia. Ikuti [aktivasi pembayaran](docs/PAYMENT_SETUP.md).

## Pemeriksaan kualitas

```powershell
npm run check
```

## Build Android

```powershell
eas build --platform android --profile preview
eas build --platform android --profile production
```

Profil `preview` menghasilkan APK untuk pengujian internal. Profil `production` menghasilkan Android App Bundle untuk Play Store.

## Dokumentasi

- [PRD](docs/PRD.md)
- [Wireframe](docs/WIREFRAME.md)
- [Setup backend](docs/BACKEND_SETUP.md)
- [Aktivasi booking & pembayaran](docs/PAYMENT_SETUP.md)
- [Checklist rilis](docs/RELEASE_CHECKLIST.md)

Jangan masukkan Supabase secret key, service-role key, atau server key payment gateway ke aplikasi mobile.
