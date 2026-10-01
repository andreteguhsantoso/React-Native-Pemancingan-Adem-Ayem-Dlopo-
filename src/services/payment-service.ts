import { friendlyBookingError } from '@/lib/booking-errors';
import type { BookingStatus } from '@/lib/database.types';
import { effectiveBookingStatus } from '@/lib/domain';
import { requireSupabase } from '@/lib/supabase';

export type PaymentSettings = { id: boolean; transfer_enabled: boolean; bank_name: string; account_number: string; account_holder: string; booking_hold_minutes: number; review_hold_minutes: number };
export type PaymentSubmission = { id: string; booking_id: string; proof_path: string; payer_name: string; status: 'pending' | 'approved' | 'rejected'; submitted_at: string; reviewed_at: string | null; review_note: string };
export type BankInstructions = { bank_name: string; account_number: string; account_holder: string };
export type PaymentBooking = { id: string; event_id: string; booking_code: string; amount: number; status: BookingStatus; expires_at: string | null; spot_number: number; participant_name: string; bank_instructions: BankInstructions | null };
export type PaymentOverview = { userId: string; booking: PaymentBooking; settings: PaymentSettings | null; submission: PaymentSubmission | null; paymentError: string | null };
export type PaymentReviewItem = PaymentSubmission & { bookings: PaymentBooking & { events: { title: string } | null; profiles: { username: string; full_name: string } | null } };

export function formatPaymentAmount(amount: number) {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(amount);
}

export function formatPaymentDeadline(date: string | null) {
  return date ? `${new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Jakarta' }).format(new Date(date))} WIB` : '-';
}

export async function fetchPaymentOverview(userId: string, eventId: string, bookingId?: string, code?: string): Promise<PaymentOverview> {
  if (!bookingId && !code) throw new Error('Kode booking tidak lengkap. Buka pesanan dari halaman Profil.');
  let query = requireSupabase().from('bookings').select('id,event_id,booking_code,amount,status,expires_at,spot_number,participant_name,bank_instructions').eq('event_id', eventId).eq('user_id', userId);
  query = bookingId ? query.eq('id', bookingId) : query.eq('booking_code', code as string);
  const { data, error } = await query.single();
  if (error) throw new Error(friendlyBookingError(error));
  const booking = data as PaymentBooking;
  booking.status = effectiveBookingStatus(booking.status, booking.expires_at) as BookingStatus;
  try {
    const settings = await fetchPaymentSettings();
    const submission = await fetchPaymentSubmission(booking.id);
    return { userId, booking, settings, submission, paymentError: null };
  } catch (cause) {
    return { userId, booking, settings: null, submission: null, paymentError: cause instanceof Error ? cause.message : 'Layanan pembayaran belum siap.' };
  }
}

export async function prepareManualTransfer(bookingId: string): Promise<BankInstructions> {
  const { data, error } = await requireSupabase().rpc('prepare_manual_transfer', { p_booking_id: bookingId });
  if (error) throw new Error(friendlyBookingError(error));
  return data as BankInstructions;
}

export async function fetchPaymentReviews(): Promise<PaymentReviewItem[]> {
  const { data, error } = await requireSupabase().from('manual_payment_submissions').select('id,booking_id,proof_path,payer_name,status,submitted_at,reviewed_at,review_note,bookings!inner(id,event_id,booking_code,amount,status,expires_at,spot_number,participant_name,bank_instructions,events(title),profiles!bookings_user_id_fkey(username,full_name))').order('submitted_at', { ascending: false }).limit(300);
  if (error) throw new Error(friendlyBookingError(error));
  return (data as unknown as PaymentReviewItem[]).map((item) => ({ ...item, bookings: { ...item.bookings, status: effectiveBookingStatus(item.bookings.status, item.bookings.expires_at) as BookingStatus } }));
}

export async function fetchPaymentSettings(): Promise<PaymentSettings> {
  const { data, error } = await requireSupabase().from('payment_settings').select('id,transfer_enabled,bank_name,account_number,account_holder,booking_hold_minutes,review_hold_minutes').eq('id', true).single();
  if (error) throw new Error(friendlyBookingError(error));
  return data as PaymentSettings;
}

export async function fetchPaymentSubmission(bookingId: string) {
  const { data, error } = await requireSupabase().from('manual_payment_submissions').select('id,booking_id,proof_path,payer_name,status,submitted_at,reviewed_at,review_note').eq('booking_id', bookingId).maybeSingle();
  if (error) throw new Error(friendlyBookingError(error));
  return data as PaymentSubmission | null;
}

export async function signedPaymentProof(path: string) {
  const { data, error } = await requireSupabase().storage.from('payment-proofs').createSignedUrl(path, 600);
  if (error) throw new Error('Bukti pembayaran belum dapat dibuka. Segarkan halaman dan periksa izin akun.');
  return data.signedUrl;
}

export async function submitPaymentProof(bookingId: string, path: string, payerName: string) {
  const { error } = await requireSupabase().rpc('submit_manual_payment', { p_booking_id: bookingId, p_proof_path: path, p_payer_name: payerName.trim() });
  if (error) throw new Error(friendlyBookingError(error));
}

export async function reviewPayment(submission: PaymentSubmission, approved: boolean, note: string) {
  const { error } = await requireSupabase().rpc('review_manual_payment', { p_submission_id: submission.id, p_approve: approved, p_note: note.trim(), p_expected_proof_path: submission.proof_path, p_expected_submitted_at: submission.submitted_at });
  if (error) throw new Error(friendlyBookingError(error));
}
