# Checklist Rilis Publik

## Sudah tersedia di kode

- Identitas aplikasi Android dan iOS.
- Profil build development, APK preview, dan AAB production.
- Mode tamu untuk konten publik.
- Login dan registrasi email/password.
- Skema database online dan Row Level Security.
- Booking atomik untuk mencegah lapak ganda.
- Masa tahan lapak dapat diatur admin, default 30 menit dan dibatasi waktu mulai event.
- Perbaikan bug SQL booking `42702` dan permintaan booking idempotent.
- Transfer bank manual, rekening resmi dari admin, bukti privat, antrean pemeriksaan dan penerbitan tiket setelah konfirmasi dana.
- Pencegahan pembatalan sendiri setelah bukti transfer dikirim dan larangan menyetujui reservasi kedaluwarsa.
- Uji regresi PostgreSQL dalam memori untuk booking, pembayaran, privasi dan hak akses.
- Struktur storage foto profil, galeri pengguna, dan konten admin.
- Struktur role customer, operator, dan admin.
- Validasi aturan umpan alami.
- Riwayat booking pengguna dan pembatalan booking yang masih menunggu pembayaran.
- Upload dan penggantian foto profil.
- Pengiriman galeri oleh pengguna serta moderasi admin.
- CRUD event beserta status draf/terbit; carousel beranda mengikuti seluruh event aktif.
- CRUD leaderboard beserta foto tangkapan.
- CRUD berita beserta gambar dan status draf/terbit.
- Pengaturan operasional untuk jam buka, mood ikan, Maps, WhatsApp, dan aturan umpan.
- Fallback konten lokal ketika backend belum dikonfigurasi.
- Pengiriman email reset password dan halaman pembuatan password baru melalui deep link.
- Diagnostik konfigurasi URL, database, migrasi, dan storage Supabase.
- Permintaan penghapusan akun oleh pengguna dan antrean peninjauan admin.
- Halaman status pembayaran yang membaca status booking langsung dari database.
- Tiket digital hanya ditampilkan untuk booking berstatus `paid` atau `confirmed`.
- Riwayat pesanan menyediakan pemeriksaan status pembayaran dan akses tiket tervalidasi.
- Pemeriksaan TypeScript dan ESLint.

## Wajib sebelum closed testing

- Buat proyek Supabase dan jalankan migrasi.
- Isi `.env` dengan publishable key.
- Uji registrasi, verifikasi email, login, logout, dan reset password pada backend nyata.
- Promosikan akun pengelola pertama menjadi admin dan uji seluruh hak akses.
- Uji booking bersamaan dari dua perangkat untuk memastikan lapak tidak ganda.
- Uji upload foto profil, galeri, berita, dan leaderboard pada perangkat fisik.
- Tambahkan monitoring error dan pengujian pada beberapa ukuran Android.
- Siapkan URL kebijakan privasi dan prosedur penghapusan akun.
- Tentukan dan implementasikan proses penghapusan permanen setelah kebijakan retensi transaksi disetujui.
- Hapus atau perbarui data contoh sebelum produksi.

## Wajib sebelum produksi berbayar

- Terapkan migrasi pembayaran terbaru dan ikuti `PAYMENT_SETUP.md`.
- Konfigurasi rekening asli, uji upload bukti dan pemeriksaan mutasi oleh petugas pada perangkat fisik.
- Tentukan kebijakan pengembalian dana untuk transaksi terlambat dan batas waktu respons petugas.
- Tetapkan retensi dan akses bukti transfer privat; pembayaran manual belum mempunyai pengembalian dana otomatis.
- Siapkan backup dan prosedur pemulihan data.

## Tambahan untuk pembayaran otomatis

- Pilih penyedia dan buat akun merchant, misalnya Midtrans atau Xendit.
- Dapatkan persetujuan kebijakan privasi untuk pengiriman nama, email, nomor telepon, dan nominal ke penyedia pembayaran.
- Buat Edge Function untuk transaksi dan webhook pembayaran.
- Verifikasi signature serta status pembayaran dari server.
- Uji pembayaran sandbox untuk QRIS, virtual account, dan e-wallet.
- Pastikan tiket tidak ditandai lunas berdasarkan callback dari aplikasi pengguna.

## Play Store

- Buat akun Google Play Console.
- Lengkapi verifikasi identitas dan persyaratan closed testing akun personal.
- Siapkan screenshot, ikon, feature graphic, deskripsi, email dukungan, dan kategori aplikasi.
- Isi Data Safety berdasarkan data akun, nomor telepon, foto, dan transaksi yang benar-benar dikumpulkan.
- Bangun AAB production dan unggah ke internal testing sebelum closed testing.
