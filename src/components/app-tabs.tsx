import { Tabs } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { ColorValue, Platform, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Fonts, Palette } from '@/constants/theme';

type TabIconProps = {
  color: ColorValue;
  focused: boolean;
  name: 'home' | 'calendar' | 'gallery' | 'leaderboard' | 'profile';
};

function TabIcon({ color, focused, name }: TabIconProps) {
  const symbols = {
    home: { ios: focused ? 'house.fill' : 'house', android: 'home', web: 'home' },
    calendar: { ios: focused ? 'calendar.circle.fill' : 'calendar', android: 'event', web: 'event' },
    gallery: { ios: focused ? 'photo.stack.fill' : 'photo.stack', android: 'collections', web: 'collections' },
    leaderboard: { ios: focused ? 'trophy.fill' : 'trophy', android: 'emoji_events', web: 'emoji_events' },
    profile: { ios: focused ? 'person.crop.circle.fill' : 'person.crop.circle', android: 'person', web: 'person' },
  } as const;

  return <SymbolView name={symbols[name]} tintColor={color} size={focused ? 25 : 23} />;
}

export default function AppTabs() {
  const insets = useSafeAreaInsets();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: Palette.orange,
        tabBarInactiveTintColor: '#80908D',
        tabBarStyle: [styles.tabBar, { height: 62 + Math.max(insets.bottom, 8), paddingBottom: Math.max(insets.bottom, 8) }],
        tabBarItemStyle: styles.tabItem,
        tabBarLabelStyle: styles.tabLabel,
        sceneStyle: styles.scene,
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Beranda',
          tabBarIcon: ({ color, focused }) => <TabIcon color={color} focused={focused} name="home" />,
        }}
      />
      <Tabs.Screen
        name="agenda"
        options={{
          title: 'Agenda',
          tabBarIcon: ({ color, focused }) => <TabIcon color={color} focused={focused} name="calendar" />,
        }}
      />
      <Tabs.Screen
        name="gallery"
        options={{
          title: 'Galeri',
          tabBarIcon: ({ color, focused }) => <TabIcon color={color} focused={focused} name="gallery" />,
        }}
      />
      <Tabs.Screen
        name="leaderboard"
        options={{
          title: 'Juara',
          tabBarIcon: ({ color, focused }) => <TabIcon color={color} focused={focused} name="leaderboard" />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profil',
          tabBarIcon: ({ color, focused }) => <TabIcon color={color} focused={focused} name="profile" />,
        }}
      />
      <Tabs.Screen name="auth" options={{ href: null, tabBarStyle: { display: 'none' } }} />
      <Tabs.Screen name="reset-password" options={{ href: null, tabBarStyle: { display: 'none' } }} />
      <Tabs.Screen name="backend-status" options={{ href: null, tabBarStyle: { display: 'none' } }} />
      <Tabs.Screen name="admin" options={{ href: null, tabBarStyle: { display: 'none' } }} />
      <Tabs.Screen name="admin-bookings" options={{ href: null, tabBarStyle: { display: 'none' } }} />
      <Tabs.Screen name="admin-payments" options={{ href: null, tabBarStyle: { display: 'none' } }} />
      <Tabs.Screen name="gallery-submissions" options={{ href: null, tabBarStyle: { display: 'none' } }} />
      <Tabs.Screen name="profile-edit" options={{ href: null, tabBarStyle: { display: 'none' } }} />
      <Tabs.Screen name="gallery-submit" options={{ href: null, tabBarStyle: { display: 'none' } }} />
      <Tabs.Screen name="bookings" options={{ href: null, tabBarStyle: { display: 'none' } }} />
      <Tabs.Screen name="admin-community" options={{ href: null, tabBarStyle: { display: 'none' } }} />
      <Tabs.Screen name="admin-content" options={{ href: null, tabBarStyle: { display: 'none' } }} />
      <Tabs.Screen name="news" options={{ href: null, tabBarStyle: { display: 'none' } }} />
      <Tabs.Screen name="news/[id]" options={{ href: null, tabBarStyle: { display: 'none' } }} />
      <Tabs.Screen name="event/[id]" options={{ href: null, tabBarStyle: { display: 'none' } }} />
      <Tabs.Screen name="booking/[eventId]/spots" options={{ href: null, tabBarStyle: { display: 'none' } }} />
      <Tabs.Screen name="booking/[eventId]/details" options={{ href: null, tabBarStyle: { display: 'none' } }} />
      <Tabs.Screen name="booking/[eventId]/payment" options={{ href: null, tabBarStyle: { display: 'none' } }} />
      <Tabs.Screen name="booking/[eventId]/payment-status" options={{ href: null, tabBarStyle: { display: 'none' } }} />
      <Tabs.Screen name="booking/[eventId]/transfer" options={{ href: null, tabBarStyle: { display: 'none' } }} />
      <Tabs.Screen name="booking/[eventId]/ticket" options={{ href: null, tabBarStyle: { display: 'none' } }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  scene: {
    backgroundColor: Palette.paper,
  },
  tabBar: {
    position: Platform.OS === 'web' ? 'absolute' : undefined,
    height: Platform.OS === 'ios' ? 84 : 68,
    paddingTop: 7,
    paddingBottom: Platform.OS === 'ios' ? 22 : 8,
    backgroundColor: Palette.surface,
    borderTopWidth: 0,
    elevation: 16,
    shadowColor: Palette.ink,
    shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.08,
    shadowRadius: 18,
  },
  tabItem: {
    borderRadius: 18,
  },
  tabLabel: {
    fontFamily: Fonts?.rounded,
    fontSize: 11,
    fontWeight: '700',
  },
});
