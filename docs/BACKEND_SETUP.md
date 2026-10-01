# Setup Backend Supabase

Fondasi backend aplikasi menggunakan Supabase PostgreSQL, Auth, Storage, dan Row Level Security. Aplikasi tetap dapat dibuka tanpa konfigurasi backend, tetapi login dan booking online akan dinonaktifkan.

## 1. Buat proyek Supabase

1. Masuk ke dashboard Supabase.
2. Buat satu proyek untuk lingkungan pengembangan.
3. Simpan URL proyek dan publishable key. Jangan gunakan secret key di aplikasi.

## 2. Jalankan migrasi

Buka SQL Editor Supabase dan jalankan isi file berikut secara berurutan:

```text
supabase/migrations/202609180001_initial_schema.sql
supabase/migrations/202609240001_account_deletion_requests.sql
supabase/migrations/202609240002_capacity_and_media_hardening.sql
supabase/migrations/202609290001_community_booking_maturity.sql
supabase/migrations/202609290002_booking_manual_payments.sql
```

Migrasi membuat profil pengguna, event nila, maksimal 82 lapak per event, booking atomik, pembayaran, galeri, leaderboard, berita, pengaturan lokasi, audit log, permintaan penghapusan akun, storage foto, validasi kapasitas, dan Row Level Security.

## 3. Hubungkan aplikasi

Salin `.env.example` menjadi `.env`, kemudian isi:

```dotenv
EXPO_PUBLIC_SUPABASE_URL=https://PROJECT.supabase.co
EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_xxx
```

Hentikan Expo lalu jalankan kembali agar variabel dibaca ulang.

Gunakan halaman **Periksa konfigurasi backend** pada layar login untuk memastikan URL, database, migrasi, dan bucket galeri dapat diakses.

## 4. Atur tautan autentikasi

Di Supabase Dashboard buka Authentication > URL Configuration, kemudian tambahkan redirect URL:

```text
ademayemdlopo://**
```

Tautan ini diperlukan agar email pemulihan password dapat membuka kembali aplikasi. Uji pemulihan password menggunakan development build atau APK, bukan hanya Expo Go.

## 5. Jadikan akun pertama sebagai admin

Daftar melalui aplikasi, lalu jalankan SQL berikut menggunakan email akun tersebut:

```sql
update public.profiles
set role = 'admin'
where id = (
  select id from auth.users where email = 'admin@example.com'
);
```

Role tidak dapat diubah oleh aplikasi pengguna. Perubahan role berikutnya harus dilakukan oleh backend tepercaya atau dashboard Supabase.

## 6. Pemeriksaan keamanan

- Jangan memasukkan secret key atau service-role key ke `.env` Expo.
- Aktifkan verifikasi email sebelum produksi.
- Gunakan password kuat untuk akun admin.
- Uji bahwa pengguna hanya dapat membaca booking miliknya.
- Uji email pemulihan password pada perangkat Android fisik.
- Tinjau permintaan penghapusan akun melalui panel admin. Penghapusan permanen belum dijalankan otomatis.
- Payment webhook harus dibuat sebagai Edge Function dan memverifikasi status langsung ke payment gateway.

## 7. Status pembayaran

Pembaruan 29 September tersedia di `UPDATE_2026_09_29.md`. Setelah migrasi sebelumnya berhasil, jalankan satu query baru dari `supabase/migrations/202609290001_community_booking_maturity.sql` untuk privasi galeri, total tangkapan dan pengamanan pemesanan. Jangan mengulang migrasi awal.

Aplikasi tidak menandai booking sebagai lunas dari hasil tombol atau redirect di perangkat. Halaman status dan tiket selalu membaca kolom `bookings.status` dari database. Transfer bank manual dengan upload bukti privat dan persetujuan pengelola tersedia melalui migrasi `202609290002_booking_manual_payments.sql`. Ikuti seluruh langkah pada [PAYMENT_SETUP.md](PAYMENT_SETUP.md). Jika migrasi awal sudah dijalankan, jalankan hanya pembaruan yang belum diterapkan dalam query baru.

Integrasi Midtrans/Xendit memerlukan persetujuan pengiriman data pelanggan ke penyedia pembayaran, akun merchant, server key yang disimpan sebagai Supabase secret, serta webhook HTTPS yang memverifikasi signature provider.
