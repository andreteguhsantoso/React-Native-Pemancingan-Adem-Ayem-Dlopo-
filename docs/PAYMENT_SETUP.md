# Aktivasi Booking dan Pembayaran Tiket

Pembaruan 29 September 2026 untuk project React Native `D:\VSCODE\pemancingan-nila-expo`.

## Apa yang diperbaiki

Kode booking sudah ada sebelumnya, tetapi fungsi PostgreSQL lama mempunyai kolom `status` dan `expires_at` yang bertabrakan dengan nama keluaran fungsi. Pengujian lokal berhasil mereproduksi error `42702`. Aplikasi sebelumnya menampilkan pesan umum sehingga penyebabnya tidak terlihat.

Migrasi baru memperbaiki fungsi tersebut dan menambahkan pembayaran **transfer bank manual**, bukti transfer privat, pemeriksaan admin/operator, serta penerbitan tiket setelah dana masuk dikonfirmasi. QRIS, virtual account dan e-wallet **otomatis belum aktif**. Pilihan yang belum tersedia tidak bisa dipilih dan tidak menghasilkan nomor atau QR pembayaran palsu.

Kode telah diperbarui di komputer, tetapi migrasi ini **belum dijalankan pada database Supabase online Anda**. Tidak ada data pengguna yang dihapus dan tidak ada uang yang ditransfer saat pengembangan atau pengujian.

## 1. Jalankan pembaruan database

Jika tiga migrasi awal sudah berhasil dijalankan, jangan ulangi migrasi awal. Di dashboard Supabase buka **SQL Editor**, buat query baru, lalu jalankan **seluruh isi file**, bukan hanya satu fungsi:

1. `supabase/migrations/202609290001_community_booking_maturity.sql` jika belum dijalankan.
2. `supabase/migrations/202609290002_booking_manual_payments.sql`.

Keduanya menggunakan transaksi: apabila terdapat error, perbaiki penyebabnya dan jalankan kembali seluruh file. Migrasi pembayaran baru dapat diulang tanpa menggandakan tabel atau kebijakan. Jangan mengubah fungsi lama dari query awal setelah pembaruan ini karena akan mengembalikan bug.

Untuk database yang benar-benar baru, jalankan seluruh migrasi berurutan seperti daftar dalam `BACKEND_SETUP.md`.

Migrasi pembayaran menambahkan:

- `payment_settings`: rekening resmi, status aktif transfer, batas reservasi dan waktu pemeriksaan.
- `bookings.client_request_id`: identitas permintaan untuk percobaan ulang yang aman.
- `bookings.bank_instructions`: salinan rekening tujuan bagi setiap pesanan.
- `manual_payment_submissions`: bukti transfer dan keputusan pengelola.
- Bucket privat `payment-proofs`: foto hanya dapat diakses pemilik dan pengelola melalui tautan sementara.
- Fungsi `reserve_ticket`, `prepare_manual_transfer`, `submit_manual_payment`, dan `review_manual_payment`.
- Perbaikan `create_booking` dan `cancel_booking`; penulisan transaksi langsung dari aplikasi diblokir.

## 2. Jalankan ulang aplikasi React

Hentikan server Expo pada terminal yang sedang menjalankan aplikasi. Dari terminal VS Code:

```powershell
cd D:\VSCODE\pemancingan-nila-expo
npx expo start --clear
```

Buka kembali aplikasi di HP. Jangan menggunakan folder Kivy, `file.env`, atau variabel `NEXT_PUBLIC_` untuk project ini. Konfigurasi React tetap menggunakan `.env` dengan `EXPO_PUBLIC_SUPABASE_URL` dan `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.

## 3. Aktifkan rekening dari akun admin

1. Masuk menggunakan akun yang sudah mempunyai role `admin` dan status `active`.
2. Buka **Profil > Panel pengelola > Rekening & verifikasi transfer**.
3. Pilih tab **Pengaturan**.
4. Isi bank, nomor rekening **asli** tanpa spasi dan nama pemilik rekening. Tidak ada rekening contoh yang otomatis digunakan.
5. Atur batas reservasi, default 30 menit. Rentang yang diizinkan 15-120 menit.
6. Atur waktu pemeriksaan bukti, default 120 menit. Rentang 15-360 menit.
7. Aktifkan **transfer bank manual** dan tekan **Simpan pengaturan pembayaran**.

Operator dapat memeriksa pembayaran, tetapi tidak dapat mengganti rekening tujuan. Jangan masukkan password internet banking, PIN atau OTP ke aplikasi.

## 4. Alur pengguna

1. Masuk ke akun, pilih event mendatang yang berstatus Terbit, pilih lapak kosong dan isi data peserta.
2. Pilih **Transfer Bank**, lalu **Lanjut transfer**. Server menentukan harga, membuat reservasi dan menahan lapak.
3. Halaman berikutnya menampilkan total, rekening resmi, nama penerima, kode booking dan batas waktu.
4. Periksa jumlah dan penerima pada aplikasi bank sebelum pengguna melakukan transfer. Jangan membayar setelah reservasi habis.
5. Pilih foto bukti yang jelas, isi nama pengirim dan tekan **Kirim bukti ke pengelola**.
6. Status menjadi **Bukti sedang diperiksa**. Ini belum tiket lunas.
7. Setelah pengelola menyetujui dana yang benar-benar masuk, tombol **Buka tiket digital** tersedia.

Jika transfer belum diaktifkan, pengguna hanya dapat membuat reservasi sementara. Teks pada aplikasi menjelaskan bahwa reservasi **bukan pembelian tiket yang berhasil**. Pesanan tersimpan bisa dibuka kembali melalui **Profil > Pesanan saya**.

## 5. Alur pemeriksaan admin/operator

1. Buka **Rekening & verifikasi transfer > Bukti transfer**.
2. Pilih pesanan. Cocokkan kode, pemancing, akun, lapak, nominal, nama pengirim, rekening tujuan dan foto bukti.
   Ketuk foto untuk membuka ukuran penuh. Tombol pembesar dan geser gambar membantu membaca bukti yang panjang.
3. Periksa mutasi rekening secara mandiri. Foto bisa keliru atau dipalsukan; jangan menyetujui hanya berdasarkan foto.
4. Jika dana benar-benar masuk sesuai pesanan, centang pernyataan pemeriksaan dan pilih **Setujui & terbitkan tiket**. Konfirmasikan sekali lagi.
5. Jika bukti perlu diperbaiki, isi alasan minimal 5 karakter dan pilih **Minta perbaikan bukti**.

Persetujuan dilakukan dalam satu transaksi database: membuat catatan pembayaran dan mengubah booking menjadi `paid`. Percobaan persetujuan ulang tidak menggandakan catatan pembayaran. Daftar menampilkan 300 kiriman terbaru dan dapat dicari berdasarkan kode, nama, username, event atau lapak.

## 6. Aturan keamanan dan operasional

- Satu akun maksimal mempunyai 3 reservasi yang masih menunggu pembayaran dan belum kedaluwarsa.
- Percobaan ulang tombol pada permintaan booking yang sama tidak membuat pesanan baru. Setelah menutup aplikasi, periksa Pesanan saya sebelum memulai pemesanan lain.
- Pengiriman bukti pertama memperpanjang reservasi satu kali untuk pemeriksaan, paling lama sampai event dimulai. Kirim ulang bukti tidak memperpanjang waktu lagi.
- Jika bukti sudah diganti sejak admin membuka halaman, persetujuan diblokir sampai bukti terbaru diperiksa. Keputusan tidak boleh menggunakan salinan bukti yang sudah kedaluwarsa.
- Setelah bukti dikirim, pengguna tidak bisa membatalkan sendiri. Pengelola perlu membantu penyelesaian pembayaran; belum ada pengembalian dana otomatis.
- Jika reservasi habis atau dibatalkan, persetujuan pembayaran diblokir. Jangan menghidupkan kembali tiket pada lapak yang mungkin sudah dipesan orang lain.
- Jika dana terlambat masuk, hubungi pemancing dan selesaikan pengembalian dana atau pemesanan ulang secara operasional. Tidak ada tombol yang memindahkan uang atau otomatis mengembalikan dana.
- Rekening disalin saat instruksi pesanan pertama dibuka. Perubahan atau penonaktifan rekening baru tidak mengubah instruksi yang sudah diterbitkan; tetap pantau rekening lama sampai pesanan tersebut selesai.
- Bukti pembayaran bukan foto galeri publik dan tidak ditampilkan melalui URL publik. Tautan foto berlaku sementara dan diperbarui saat halaman dibuka kembali.
- Log audit mencatat pelaku, tindakan dan status tanpa menyalin nama peserta, nomor rekening atau URL foto bukti.
- Aplikasi tidak menyimpan informasi login bank. Secret key Supabase atau payment gateway tidak boleh dimasukkan ke `.env` Expo.

## 7. Jika masih gagal

| Gejala | Tindakan |
| --- | --- |
| Error `42702` | Jalankan seluruh migrasi `202609290002`, jangan memakai fungsi booking versi awal. |
| Tabel atau fungsi tidak ditemukan | Pastikan migrasi `202609290001` lalu `202609290002` sudah berhasil, lalu periksa ulang aplikasi. |
| Transfer belum aktif | Masuk sebagai admin, lengkapi dan aktifkan rekening di tab Pengaturan. |
| Lapak sudah dipesan | Pilih lapak lain; status server selalu menjadi sumber kebenaran. |
| Koneksi terputus | Buka Pesanan saya sebelum mencoba booking ulang. |
| Foto bukti tidak tampil | Tekan Muat ulang foto bukti; pastikan akun pemilik/admin masih login. |
| Reservasi sudah habis | Jangan lanjut transfer. Jika dana sudah dikirim, hubungi pengelola. |

Menu **Periksa konfigurasi backend** sekarang dapat memeriksa tabel pembayaran dan apakah rekening diaktifkan, setelah login. Pemeriksaan ini tidak melakukan booking atau pembayaran sungguhan.

## 8. Pemeriksaan sebelum digunakan publik

- Jalankan `npm run check` untuk TypeScript, ESLint dan tes lokal. Tes memakai PostgreSQL dalam memori dengan akun dan rekening fiktif, bukan database online.
- Uji alur lengkap pada dua HP dengan akun berbeda: lapak sama, upload bukti, penolakan, persetujuan, tiket dan kedaluwarsa.
- Tetapkan siapa yang memeriksa mutasi dan berapa cepat responsnya; batas waktu pemeriksaan harus sesuai jam kerja petugas.
- Tetapkan kebijakan pengembalian dana, retensi bukti pembayaran, penghapusan akun dan privasi sebelum menerima pembayaran publik.
- Pembayaran otomatis membutuhkan integrasi gateway server-side, akun merchant, webhook terverifikasi dan pengujian sandbox tersendiri. Fitur manual bukan pengganti integrasi otomatis tersebut.
- Pemeriksaan kode dan ekspor Android tidak berarti proses pembayaran di HP atau database produksi sudah diuji langsung.
