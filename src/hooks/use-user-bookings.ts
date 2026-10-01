import { useCallback } from 'react';

import { useAuth } from '@/context/auth-context';
import { useFocusResource } from '@/hooks/use-focus-resource';
import { fetchUserBookings, UserBooking } from '@/services/booking-service';

export function useUserBookings() {
  const { session } = useAuth();
  const userId = session?.user.id;
  const load = useCallback(async () => userId ? fetchUserBookings(userId) : [], [userId]);
  return useFocusResource<UserBooking[]>(load, [], Boolean(userId), 15000);
}
