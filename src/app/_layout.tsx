import * as SplashScreen from 'expo-splash-screen';
import { ThemeProvider, usePathname } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';

import AppTabs from '@/components/app-tabs';
import { Palette } from '@/constants/theme';
import { AuthProvider } from '@/context/auth-context';
import { BookingProvider } from '@/context/booking-context';
import { EventsProvider } from '@/context/events-context';
import { NewsProvider } from '@/context/news-context';
import { VenueProvider } from '@/context/venue-context';

SplashScreen.preventAutoHideAsync();

const appTheme = {
  dark: false,
  colors: {
    primary: Palette.orange,
    background: Palette.paper,
    card: Palette.surface,
    text: Palette.ink,
    border: Palette.line,
    notification: Palette.orange,
  },
  fonts: {
    regular: { fontFamily: 'sans-serif', fontWeight: '400' as const },
    medium: { fontFamily: 'sans-serif-medium', fontWeight: '500' as const },
    bold: { fontFamily: 'sans-serif', fontWeight: '700' as const },
    heavy: { fontFamily: 'sans-serif', fontWeight: '900' as const },
  },
};

export default function RootLayout() {
  const path = usePathname();
  const darkHeader = path.startsWith('/admin') || path === '/bookings' || path === '/profile-edit' || path === '/gallery-submit' || path === '/gallery-submissions' || path.startsWith('/booking/');
  useEffect(() => {
    SplashScreen.hideAsync();
  }, []);

  return (
    <ThemeProvider value={appTheme}>
      <StatusBar style={darkHeader ? 'light' : 'dark'} />
      <AuthProvider>
        <VenueProvider>
          <EventsProvider>
            <NewsProvider>
              <BookingProvider>
                <AppTabs />
              </BookingProvider>
            </NewsProvider>
          </EventsProvider>
        </VenueProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
