import type { BookingDraft } from '@/context/booking-context';
import type { BookingStatus, CreateBookingResult } from '@/lib/database.types';
import { requireSupabase } from '@/lib/supabase';
import { effectiveBookingStatus } from '@/lib/domain';
import { friendlyBookingError } from '@/lib/booking-errors';

export type UserBooking = { id: string; booking_code: string; event_id: string; spot_number: number; participant_name: string; amount: number; status: BookingStatus; expires_at: string | null; created_at: string; paymentSubmitted: boolean; events: { title: string; starts_at: string; ends_at: string } | null };
export const bookingStatusLabels: Record<BookingStatus, string> = { awaiting_payment: 'Menunggu pembayaran', paid: 'Sudah dibayar', confirmed: 'Terkonfirmasi', cancelled: 'Dibatalkan', expired: 'Kedaluwarsa' };

export async function fetchUserBookings(userId: string): Promise<UserBooking[]> {
  const expiration = await requireSupabase().rpc('refresh_booking_expirations');
  if (expiration.error) throw new Error(friendlyBookingError(expiration.error));
  const { data, error } = await requireSupabase().from('bookings').select('id,booking_code,event_id,spot_number,participant_name,amount,status,expires_at,created_at,events(title,starts_at,ends_at)').eq('user_id', userId).order('created_at', { ascending: false });
  if (error) throw new Error(friendlyBookingError(error));
  const ids = (data ?? []).map((item) => item.id as string);
  const proofBookings = new Set<string>();
  if (ids.length) {
    const proofs = await requireSupabase().from('manual_payment_submissions').select('booking_id').in('booking_id', ids);
    if (proofs.error) throw new Error(friendlyBookingError(proofs.error));
    proofs.data?.forEach((item) => proofBookings.add(item.booking_id));
  }
  return (data as unknown as UserBooking[]).map((item) => ({ ...item, paymentSubmitted: proofBookings.has(item.id), status: effectiveBookingStatus(item.status, item.expires_at) as BookingStatus }));
}

export async function cancelRemoteBooking(id: string) {
  const client = requireSupabase();
  const { error } = await client.rpc('cancel_booking', { p_booking_id: id });
  if (error) throw new Error(friendlyBookingError(error));
}

export async function fetchOccupiedSpots(eventId: string) {
  const { data, error } = await requireSupabase().rpc('get_occupied_spots', { p_event_id: eventId });
  if (error) throw new Error(error.message);
  return new Set<number>((data ?? []).map((item: { spot_number: number }) => item.spot_number));
}

export async function createRemoteBooking(draft: BookingDraft) {
  if (!draft.eventId || !draft.spot || !draft.participantName || !draft.participantPhone || !draft.agreedToRules) {
    throw new Error('Data booking belum lengkap.');
  }

  if (!draft.requestId) throw new Error('Mulai ulang dari pemilihan lapak agar permintaan booking aman untuk dicoba ulang.');
  const { data, error } = await requireSupabase().rpc('reserve_ticket', {
    p_event_id: draft.eventId,
    p_spot_number: draft.spot,
    p_participant_name: draft.participantName,
    p_participant_phone: draft.participantPhone,
    p_notes: draft.notes || null,
    p_request_id: draft.requestId,
  });

  if (error) throw new Error(friendlyBookingError(error));
  const result = (data as CreateBookingResult[] | null)?.[0];
  if (!result) throw new Error('Server tidak mengembalikan data booking.');
  return result;
}
