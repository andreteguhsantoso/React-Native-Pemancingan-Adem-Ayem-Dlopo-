import { createContext, ReactNode, useContext, useState } from 'react';
import { randomUUID } from 'expo-crypto';

export type PaymentMethod = 'qris' | 'bank_transfer' | 'virtual_account' | 'ewallet' | 'reserve_only';

export type BookingDraft = {
  eventId: string | null;
  spot: number | null;
  participantName: string;
  participantPhone: string;
  notes: string;
  agreedToRules: boolean;
  paymentMethod: PaymentMethod | null;
  bookingCode: string | null;
  paidAt: string | null;
  requestId: string | null;
};

type ParticipantData = Pick<
  BookingDraft,
  'participantName' | 'participantPhone' | 'notes' | 'agreedToRules'
>;

type BookingContextValue = {
  draft: BookingDraft;
  setSelection: (eventId: string, spot: number) => void;
  setParticipant: (data: ParticipantData) => void;
  setPaymentMethod: (method: PaymentMethod) => void;
  completeBooking: (bookingCode: string) => string;
  resetBooking: () => void;
};

const initialDraft: BookingDraft = {
  eventId: null,
  spot: null,
  participantName: '',
  participantPhone: '',
  notes: '',
  agreedToRules: false,
  paymentMethod: null,
  bookingCode: null,
  paidAt: null,
  requestId: null,
};

const BookingContext = createContext<BookingContextValue | null>(null);

export function BookingProvider({ children }: { children: ReactNode }) {
  const [draft, setDraft] = useState<BookingDraft>(initialDraft);

  const setSelection = (eventId: string, spot: number) => {
    const requestId = randomUUID();
    setDraft((current) => ({
      ...initialDraft,
      eventId,
      spot,
      requestId,
      participantName: current.eventId === eventId ? current.participantName : '',
      participantPhone: current.eventId === eventId ? current.participantPhone : '',
      notes: current.eventId === eventId ? current.notes : '',
      agreedToRules: current.eventId === eventId && current.agreedToRules,
    }));
  };

  const setParticipant = (data: ParticipantData) => {
    setDraft((current) => ({ ...current, ...data }));
  };

  const setPaymentMethod = (paymentMethod: PaymentMethod) => {
    setDraft((current) => ({ ...current, paymentMethod }));
  };

  const completeBooking = (bookingCode: string) => {
    setDraft((current) => ({ ...current, bookingCode, paidAt: null }));
    return bookingCode;
  };

  const resetBooking = () => setDraft(initialDraft);

  return (
    <BookingContext.Provider
      value={{ draft, setSelection, setParticipant, setPaymentMethod, completeBooking, resetBooking }}>
      {children}
    </BookingContext.Provider>
  );
}

export function useBooking() {
  const context = useContext(BookingContext);
  if (!context) {
    throw new Error('useBooking harus digunakan di dalam BookingProvider');
  }
  return context;
}
