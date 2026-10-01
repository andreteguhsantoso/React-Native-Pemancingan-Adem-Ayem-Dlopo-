type BackendError = { message?: string; code?: string };
const messages: Record<string, string> = {
  AUTH_REQUIRED: 'Sesi login berakhir. Silakan masuk kembali.',
  ACCOUNT_NOT_ACTIVE: 'Profil akun belum tersedia atau akun dinonaktifkan. Periksa akun dengan pengelola.',
  EVENT_NOT_AVAILABLE: 'Event tidak tersedia untuk pemesanan atau sudah ditarik pengelola.',
  EVENT_ALREADY_STARTED: 'Event sudah dimulai dan tidak menerima booking baru.',
  INVALID_SPOT: 'Nomor lapak tidak valid.',
  INVALID_NAME: 'Nama peserta harus berisi 3-100 karakter.',
  INVALID_PHONE: 'Nomor WhatsApp harus berisi 10-15 angka.',
  INVALID_NOTES: 'Catatan maksimal 180 karakter.',
  SPOT_ALREADY_BOOKED: 'Lapak baru saja dipesan pengguna lain. Silakan pilih lapak berbeda.',
  BOOKING_EXPIRED: 'Waktu reservasi habis. Mulai kembali dari pemilihan lapak; jangan transfer untuk booking ini.',
  BOOKING_NOT_FOUND: 'Pesanan tidak ditemukan pada akun Anda.',
  BOOKING_NOT_CANCELLABLE: 'Pesanan sudah diproses atau tidak dapat dibatalkan. Segarkan halaman untuk melihat status terbaru.',
  PAYMENT_NOT_FOUND: 'Bukti pembayaran tidak ditemukan. Segarkan daftar pemeriksaan.',
  PAYMENT_ALREADY_SUBMITTED: 'Bukti transfer sudah dikirim. Hubungi pengelola untuk perubahan atau pembatalan; jangan melakukan transfer ulang.',
  PAYMENT_PROOF_CHANGED: 'Bukti transfer sudah berubah sejak halaman dibuka. Segarkan daftar dan periksa bukti terbaru sebelum menyetujui.',
  INVALID_REQUEST_ID: 'Permintaan booking tidak lengkap. Mulai kembali dari pemilihan lapak.',
  TOO_MANY_RESERVATIONS: 'Anda memiliki 3 reservasi aktif. Selesaikan atau batalkan pesanan sebelumnya.',
  REQUEST_CONFLICT: 'Permintaan booking tidak cocok. Mulai kembali dari pemilihan lapak.',
  TRANSFER_NOT_ENABLED: 'Transfer bank belum diaktifkan oleh pengelola. Jangan mengirim uang sebelum rekening tersedia.',
  INVALID_PAYER_NAME: 'Isi nama pengirim sesuai rekening, minimal 3 karakter.',
  INVALID_PAYMENT_PROOF: 'Bukti pembayaran belum tersimpan atau bukan milik akun Anda. Pilih ulang foto bukti.',
  PAYMENT_UNDER_REVIEW: 'Bukti sebelumnya sedang diperiksa. Tunggu keputusan pengelola sebelum mengirim ulang.',
  PAYMENT_ALREADY_REVIEWED: 'Bukti sudah diproses. Segarkan halaman untuk melihat status terbaru.',
  PAYMENT_RESERVATION_EXPIRED: 'Reservasi sudah habis atau dilepas. Jangan aktifkan tiket ini; hubungi pemesan untuk penyelesaian uang yang masuk.',
  INVALID_REVIEW_NOTE: 'Isi alasan penolakan minimal 5 karakter, maksimal 500 karakter.',
  STAFF_REQUIRED: 'Hanya pengelola yang dapat memverifikasi pembayaran.',
};

export function friendlyBookingError(error: BackendError | string) {
  const detail = typeof error === 'string' ? { message: error } : error;
  const message = detail.message ?? '';
  const known = Object.keys(messages).find((key) => message.includes(key));
  if (known) return messages[known];
  if (detail.code === '42702' || /ambiguous/i.test(message)) return 'Fungsi booking database masih memakai versi lama. Pengelola perlu menjalankan migrasi perbaikan booking 202609290002. (Kode 42702)';
  if (['PGRST202', 'PGRST205', '42P01', '42703'].includes(detail.code ?? '')) return 'Pembaruan database belum diterapkan. Jalankan migrasi 202609290001 lalu 202609290002 di Supabase SQL Editor.';
  if (detail.code === 'PGRST116') return 'Pesanan atau pengaturan tidak ditemukan untuk akun Anda. Periksa kode booking dan migrasi database.';
  if (['42501', '401', '403'].includes(detail.code ?? '')) return 'Izin akun tidak mencukupi atau sesi login berakhir. Masuk kembali dan periksa migrasi database.';
  if (/network|fetch|timeout|connection/i.test(message)) return 'Koneksi ke server terputus. Periksa Pesanan Saya sebelum mencoba ulang agar tidak membuat pesanan ganda.';
  return `Permintaan belum berhasil diproses. Coba lagi atau hubungi pengelola${detail.code ? ` (kode ${detail.code.replace(/[^A-Za-z0-9]/g, '').slice(0, 12)})` : ''}.`;
}
