import { MediaImage as Image } from '@/components/media-image';
import { useFocusEffect, useRouter } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useCallback, useRef, useState } from 'react';
import {
  Linking,
  AppState,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BottomTabInset, Fonts, MaxContentWidth, Palette, Radius } from '@/constants/theme';
import { useEvents } from '@/context/events-context';
import { useNews } from '@/context/news-context';
import { useVenue } from '@/context/venue-context';
import { formatRupiah } from '@/data/events';

const quickActions = [
  { label: 'Booking', caption: 'Pilih event', icon: 'ticket' as const, color: Palette.orange },
  { label: '82 Lapak', caption: 'Lihat posisi', icon: 'spot' as const, color: Palette.gold },
  { label: 'Galeri', caption: 'Momen strike', icon: 'gallery' as const, color: Palette.sky },
  { label: 'Lokasi', caption: 'Buka Maps', icon: 'location' as const, color: Palette.mint },
];

type QuickIconName = (typeof quickActions)[number]['icon'];

function QuickIcon({ name }: { name: QuickIconName }) {
  const symbols = {
    ticket: { ios: 'ticket.fill', android: 'confirmation_number', web: 'confirmation_number' },
    spot: { ios: 'mappin.and.ellipse', android: 'pin_drop', web: 'pin_drop' },
    gallery: { ios: 'photo.on.rectangle.angled', android: 'collections', web: 'collections' },
    location: { ios: 'location.fill', android: 'location_on', web: 'location_on' },
  } as const;

  return <SymbolView name={symbols[name]} tintColor={Palette.ink} size={23} />;
}

export default function HomeScreen() {
  const router = useRouter();
  const { events, loading, error, refreshEvents } = useEvents();
  const { newsItems, refreshNews } = useNews();
  const { venue } = useVenue();
  const { width } = useWindowDimensions();
  const carouselRef = useRef<ScrollView>(null);
  const [slideIndex, setActiveSlide] = useState(0);
  const activeSlide = Math.min(slideIndex, Math.max(0, events.length - 1));
  const contentWidth = Math.min(width, MaxContentWidth);
  const heroWidth = contentWidth - 32;
  const heroEvents = events;
  const featuredEvent = events.find((item) => item.featured) ?? events[0];

  useFocusEffect(useCallback(() => {
    if (heroEvents.length < 2) return;
    const timer = setInterval(() => {
      if (AppState.currentState !== 'active') return;
      const next = (activeSlide + 1) % heroEvents.length;
      setActiveSlide(next);
      carouselRef.current?.scrollTo({ x: next * heroWidth, animated: true });
    }, 4500);

    return () => clearInterval(timer);
  }, [activeSlide, heroEvents.length, heroWidth]));

  const handleSlideEnd = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    setActiveSlide(Math.max(0, Math.min(heroEvents.length - 1, Math.round(event.nativeEvent.contentOffset.x / heroWidth))));
  };

  const handleQuickAction = (icon: QuickIconName) => {
    if (icon === 'location') {
      Linking.openURL(venue.map_url);
      return;
    }
    if (icon === 'gallery') {
      router.push('/gallery');
      return;
    }
    if (icon === 'spot') {
      if (!events[0]) return;
      router.push({ pathname: '/booking/[eventId]/spots', params: { eventId: events[0].id } });
      return;
    }
    router.push('/agenda');
  };

  return (
    <View style={styles.screen}>
      <SafeAreaView edges={['top']} style={styles.safeArea}>
        <ScrollView showsVerticalScrollIndicator={false} refreshControl={<RefreshControl refreshing={loading} onRefresh={() => { void Promise.all([refreshEvents(), refreshNews()]).catch(() => undefined); }} tintColor={Palette.orange} />} contentContainerStyle={styles.pageContent}>
          {error || (!loading && !events.length) ? <View style={{ padding: 18, backgroundColor: Palette.gold }}><Text style={{ color: Palette.ink, fontSize: 14, lineHeight: 21 }}>{error ? `Agenda belum tersinkron: ${error}` : 'Belum ada event terbit. Jadwal baru akan tampil setelah dipublikasikan pengelola.'}</Text></View> : null}
          <View style={styles.topSection}>
            <View style={styles.header}>
              <View style={styles.brandRow}>
                <Image
                  source={require('../../assets/images/nila/brand-adem-ayem-icon.png')}
                  contentFit="cover"
                  style={styles.logoMark}
                />
                <View>
                  <Text style={styles.brandName}>ADEM AYEM</Text>
                  <Text style={styles.brandCaption}>Dlopo · Kolam khusus nila</Text>
                </View>
              </View>
              <Pressable onPress={() => router.push('/news')} style={styles.notificationButton}>
                <SymbolView
                  name={{ ios: 'bell.fill', android: 'notifications', web: 'notifications' }}
                  tintColor={Palette.white}
                  size={20}
                />
                <View style={styles.notificationDot} />
              </Pressable>
            </View>

            <View style={styles.heroFrame}>
              <ScrollView
                ref={carouselRef}
                horizontal
                pagingEnabled
                bounces={false}
                showsHorizontalScrollIndicator={false}
                onMomentumScrollEnd={handleSlideEnd}
                scrollEventThrottle={16}>
                {heroEvents.map((event, index) => (
                  <View key={event.id} style={[styles.heroSlide, { width: heroWidth }]}>
                    <Image source={event.image} contentFit="cover" style={StyleSheet.absoluteFill} transition={350} />
                    <View style={styles.heroShade} />
                    <View style={styles.heroWarmGlow} />
                    <View style={styles.heroContent}>
                      <View style={styles.heroTopLine}>
                        <Text style={styles.heroLabel}>{index === 0 ? 'PALING DITUNGGU' : event.label}</Text>
                        <View style={styles.liveBadge}>
                          <View style={styles.liveDot} />
                          <Text style={styles.liveText}>{event.availableSpots} LAPAK</Text>
                        </View>
                      </View>
                      <View style={styles.heroCopy}>
                        <Text style={styles.heroKicker}>{event.fishKg} KG IKAN NILA</Text>
                        <Text style={styles.heroTitle}>{event.title}</Text>
                        <Text style={styles.heroMeta}>{event.shortDate}  •  {event.time}</Text>
                        <View style={styles.heroBottom}>
                          <View>
                            <Text style={styles.heroPriceLabel}>TIKET MULAI</Text>
                            <Text style={styles.heroPrice}>{formatRupiah(event.price)}</Text>
                          </View>
                          <Pressable
                            onPress={() => router.push({ pathname: '/event/[id]', params: { id: event.id } })}
                            style={({ pressed }) => [styles.heroButton, pressed && styles.pressed]}>
                            <Text style={styles.heroButtonText}>Pesan lapak</Text>
                            <Text style={styles.heroButtonArrow}>→</Text>
                          </Pressable>
                        </View>
                      </View>
                    </View>
                  </View>
                ))}
              </ScrollView>
              <View style={styles.pagination}>
                {heroEvents.map((event, index) => (
                  <Pressable
                    key={event.id}
                    onPress={() => {
                      setActiveSlide(index);
                      carouselRef.current?.scrollTo({ x: index * heroWidth, animated: true });
                    }}
                    style={[styles.pageDot, activeSlide === index && styles.pageDotActive]}
                  />
                ))}
              </View>
            </View>
          </View>

          <View style={styles.infoRail}>
            <View style={styles.infoCell}>
              <Text style={styles.infoValue}>82</Text>
              <Text style={styles.infoLabel}>TOTAL LAPAK</Text>
            </View>
            <View style={styles.infoDivider} />
            <View style={styles.infoCell}>
              <Text style={styles.infoValue}>NILA</Text>
              <Text style={styles.infoLabel}>KHUSUS KOLAM</Text>
            </View>
            <View style={styles.infoDivider} />
            <View style={styles.infoCell}>
              <Text style={styles.infoValue}>{venue.opens_at.slice(0, 5).replace(':', '.')}</Text>
              <Text style={styles.infoLabel}>MULAI BUKA</Text>
            </View>
          </View>

          <View style={styles.section}>
            <View style={styles.sectionHeading}>
              <View>
                <Text style={styles.sectionKicker}>MAU KE MANA?</Text>
                <Text style={styles.sectionTitle}>Akses cepat</Text>
              </View>
              <Text style={styles.sectionNumber}>01</Text>
            </View>
            <View style={styles.quickGrid}>
              {quickActions.map((action) => (
                <Pressable
                  key={action.label}
                  onPress={() => handleQuickAction(action.icon)}
                  style={({ pressed }) => [styles.quickCard, { backgroundColor: action.color }, pressed && styles.pressed]}>
                  <View style={styles.quickIcon}>
                    <QuickIcon name={action.icon} />
                  </View>
                  <View style={styles.quickCopy}>
                    <Text style={styles.quickLabel}>{action.label}</Text>
                    <Text style={styles.quickCaption}>{action.caption}</Text>
                  </View>
                  <Text style={styles.quickArrow}>↗</Text>
                </Pressable>
              ))}
            </View>
          </View>

          {featuredEvent ? <View style={styles.section}>
            <View style={styles.sectionHeading}>
              <View>
                <Text style={styles.sectionKicker}>BERIKUTNYA DI KOLAM</Text>
                <Text style={styles.sectionTitle}>Jangan lewatkan</Text>
              </View>
              <Pressable onPress={() => router.push('/agenda')}>
                <Text style={styles.seeAll}>Semua agenda →</Text>
              </Pressable>
            </View>

            <View style={styles.featuredEvent}>
              <Image source={featuredEvent.image} contentFit="cover" style={styles.featuredImage} />
              <View style={styles.featuredDate}>
                <Text style={styles.featuredDay}>{featuredEvent.shortDate.split(' ')[0]}</Text>
                <Text style={styles.featuredMonth}>{featuredEvent.shortDate.split(' ')[1]}</Text>
              </View>
              <View style={styles.featuredBody}>
                <Text style={styles.featuredLabel}>{featuredEvent.label} • {featuredEvent.fishKg} KG</Text>
                <Text style={styles.featuredTitle}>{featuredEvent.title}</Text>
                <Text style={styles.featuredMeta}>{featuredEvent.time}  •  Sisa {featuredEvent.availableSpots} lapak</Text>
                <View style={styles.featuredFooter}>
                  <Text style={styles.featuredPrice}>{formatRupiah(featuredEvent.price)}</Text>
                  <View style={styles.capacityBar}>
                    <View
                      style={[
                        styles.capacityFill,
                        { width: `${((featuredEvent.totalSpots - featuredEvent.availableSpots) / featuredEvent.totalSpots) * 100}%` },
                      ]}
                    />
                  </View>
                </View>
              </View>
            </View>
          </View> : null}

          <View style={styles.newsSection}>
            <View style={[styles.sectionHeading, styles.newsHeading]}>
              <View style={styles.newsHeadingCopy}>
                <Text style={styles.sectionKicker}>KABAR DARI PENGELOLA</Text>
                <Text style={styles.sectionTitle}>Terbaru di Adem Ayem</Text>
              </View>
              <Pressable onPress={() => router.push('/news')}>
                <Text style={styles.seeAll}>Semua kabar →</Text>
              </Pressable>
            </View>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.homeNewsRow}>
              {newsItems.slice(0, 3).map((item, index) => (
                <Pressable
                  key={item.id}
                  onPress={() => router.push({ pathname: '/news/[id]', params: { id: item.id } })}
                  style={({ pressed }) => [styles.homeNewsCard, index === 0 && styles.homeNewsCardFeatured, pressed && styles.pressed]}>
                  <Image source={item.image} contentFit="cover" transition={250} style={styles.homeNewsImage} />
                  <View style={styles.homeNewsShade} />
                  <View style={styles.homeNewsBadge}>
                    <Text style={styles.homeNewsBadgeText}>{item.category.toUpperCase()}</Text>
                  </View>
                  <View style={styles.homeNewsCopy}>
                    <Text style={styles.homeNewsDate}>{item.date}</Text>
                    <Text numberOfLines={2} style={styles.homeNewsTitle}>{item.title}</Text>
                    <Text style={styles.homeNewsRead}>Baca {item.readTime}  →</Text>
                  </View>
                </Pressable>
              ))}
            </ScrollView>
          </View>

          <View style={styles.splitSection}>
            <View style={styles.moodCard}>
              <View style={styles.moodTop}>
                <Text style={styles.moodEmoji}>≈</Text>
                <Text style={styles.moodBadge}>HARI INI</Text>
              </View>
              <Text style={styles.moodTitle}>Mood ikan{`\n`}{venue.fish_mood}!</Text>
              <Text style={styles.moodText}>{venue.fish_mood_note}</Text>
              <View style={styles.moodMeter}>
                <View style={styles.moodMeterFill} />
              </View>
              <Text style={styles.moodScore}>UPDATE DARI PENGELOLA</Text>
            </View>

            <View style={styles.ruleCard}>
              <Text style={styles.ruleIndex}>ATURAN #01</Text>
              <Text style={styles.ruleTitle}>Umpan wajib alami.</Text>
              <Text style={styles.ruleText}>{venue.natural_bait_rule}</Text>
              <View style={styles.ruleStamp}>
                <Text style={styles.ruleStampText}>WAJIB</Text>
              </View>
            </View>
          </View>

          <Pressable
            onPress={() => Linking.openURL(venue.map_url)}
            style={({ pressed }) => [styles.locationCard, pressed && styles.pressed]}>
            <Image
              source={require('../../assets/images/nila/venue-nila.png')}
              contentFit="cover"
              style={StyleSheet.absoluteFill}
            />
            <View style={styles.locationShade} />
            <View style={styles.locationPin}>
              <SymbolView
                name={{ ios: 'location.fill', android: 'location_on', web: 'location_on' }}
                tintColor={Palette.orange}
                size={22}
              />
            </View>
            <View style={styles.locationCopy}>
              <Text style={styles.locationKicker}>PETUNJUK DARI PUSAT KOTA KEDIRI</Text>
              <Text style={styles.locationTitle}>Temukan kolam kami</Text>
              <Text style={styles.locationText}>Buka rute asli di Google Maps  →</Text>
            </View>
          </Pressable>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Palette.paper, alignItems: 'center' },
  safeArea: { flex: 1, width: '100%', maxWidth: MaxContentWidth, backgroundColor: Palette.ink },
  pageContent: { backgroundColor: Palette.paper, paddingBottom: BottomTabInset + 26 },
  topSection: { backgroundColor: Palette.ink, paddingBottom: 22 },
  header: {
    height: 72,
    paddingHorizontal: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  logoMark: {
    width: 40,
    height: 40,
    borderRadius: 13,
    backgroundColor: Palette.gold,
    alignItems: 'center',
    justifyContent: 'center',
    transform: [{ rotate: '-5deg' }],
  },
  brandName: { color: Palette.white, fontFamily: Fonts?.display, fontWeight: '900', fontSize: 16, letterSpacing: 1.3 },
  brandCaption: { color: '#B8D1CD', fontFamily: Fonts?.sans, fontSize: 10, marginTop: 1 },
  notificationButton: {
    width: 42,
    height: 42,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#356064',
    alignItems: 'center',
    justifyContent: 'center',
  },
  notificationDot: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 7,
    height: 7,
    borderRadius: 7,
    backgroundColor: Palette.orange,
    borderWidth: 1.5,
    borderColor: Palette.ink,
  },
  heroFrame: { marginHorizontal: 16, borderRadius: 28, overflow: 'hidden', backgroundColor: Palette.inkSoft },
  heroSlide: { height: 405, overflow: 'hidden' },
  heroShade: { position: 'absolute', inset: 0, backgroundColor: 'rgba(2, 24, 26, 0.43)' },
  heroWarmGlow: {
    position: 'absolute',
    left: -70,
    bottom: -110,
    width: 330,
    height: 300,
    borderRadius: 180,
    backgroundColor: 'rgba(228, 81, 46, 0.48)',
  },
  heroContent: { flex: 1, padding: 20, justifyContent: 'space-between' },
  heroTopLine: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  heroLabel: {
    color: Palette.ink,
    backgroundColor: Palette.gold,
    overflow: 'hidden',
    paddingHorizontal: 11,
    paddingVertical: 7,
    borderRadius: 8,
    fontFamily: Fonts?.rounded,
    fontWeight: '900',
    fontSize: 9,
    letterSpacing: 1.2,
  },
  liveBadge: {
    flexDirection: 'row',
    gap: 6,
    alignItems: 'center',
    backgroundColor: 'rgba(8, 47, 51, 0.74)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.28)',
    borderRadius: Radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  liveDot: { width: 6, height: 6, borderRadius: 6, backgroundColor: Palette.mint },
  liveText: { color: Palette.white, fontFamily: Fonts?.rounded, fontWeight: '800', fontSize: 9, letterSpacing: 0.8 },
  heroCopy: { paddingBottom: 15 },
  heroKicker: { color: Palette.gold, fontFamily: Fonts?.rounded, fontWeight: '900', fontSize: 11, letterSpacing: 1.8 },
  heroTitle: {
    maxWidth: 330,
    color: Palette.white,
    fontFamily: Fonts?.display,
    fontWeight: '900',
    fontSize: 41,
    lineHeight: 43,
    letterSpacing: -1.1,
    marginTop: 7,
  },
  heroMeta: { color: '#DCE8E6', fontFamily: Fonts?.sans, fontSize: 11, marginTop: 9 },
  heroBottom: {
    marginTop: 20,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  heroPriceLabel: { color: '#C4D7D4', fontFamily: Fonts?.rounded, fontWeight: '800', fontSize: 8, letterSpacing: 1.2 },
  heroPrice: { color: Palette.white, fontFamily: Fonts?.display, fontWeight: '900', fontSize: 24, marginTop: 2 },
  heroButton: {
    height: 48,
    paddingHorizontal: 17,
    borderRadius: 15,
    backgroundColor: Palette.orange,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  heroButtonText: { color: Palette.white, fontFamily: Fonts?.rounded, fontSize: 12, fontWeight: '900' },
  heroButtonArrow: { color: Palette.white, fontSize: 19, marginTop: -2 },
  pagination: { position: 'absolute', left: 20, top: 59, flexDirection: 'row', gap: 5 },
  pageDot: { width: 7, height: 4, borderRadius: 5, backgroundColor: 'rgba(255,255,255,0.48)' },
  pageDotActive: { width: 26, backgroundColor: Palette.white },
  infoRail: {
    marginHorizontal: 16,
    marginTop: -1,
    borderBottomLeftRadius: 22,
    borderBottomRightRadius: 22,
    backgroundColor: Palette.surface,
    minHeight: 76,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    shadowColor: Palette.ink,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.07,
    shadowRadius: 22,
    elevation: 3,
  },
  infoCell: { flex: 1, alignItems: 'center' },
  infoValue: { color: Palette.ink, fontFamily: Fonts?.display, fontWeight: '900', fontSize: 17 },
  infoLabel: { color: Palette.muted, fontFamily: Fonts?.rounded, fontWeight: '800', fontSize: 7, letterSpacing: 0.7, marginTop: 3 },
  infoDivider: { width: 1, height: 30, backgroundColor: Palette.line },
  section: { paddingHorizontal: 16, marginTop: 34 },
  sectionHeading: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 15 },
  sectionKicker: { color: Palette.orange, fontFamily: Fonts?.rounded, fontWeight: '900', fontSize: 9, letterSpacing: 1.5 },
  sectionTitle: { color: Palette.ink, fontFamily: Fonts?.display, fontWeight: '900', fontSize: 27, letterSpacing: -0.5, marginTop: 2 },
  sectionNumber: { color: '#D8DDD5', fontFamily: Fonts?.serif, fontStyle: 'italic', fontWeight: '900', fontSize: 32 },
  seeAll: { color: Palette.inkSoft, fontFamily: Fonts?.rounded, fontSize: 10, fontWeight: '900', paddingBottom: 4 },
  quickGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  quickCard: {
    width: '48.5%',
    minHeight: 104,
    borderRadius: Radius.medium,
    padding: 13,
    flexDirection: 'row',
    alignItems: 'center',
  },
  quickIcon: { width: 42, height: 42, borderRadius: 13, backgroundColor: 'rgba(255,255,255,0.58)', alignItems: 'center', justifyContent: 'center' },
  quickCopy: { marginLeft: 9, flex: 1 },
  quickLabel: { color: Palette.ink, fontFamily: Fonts?.display, fontWeight: '900', fontSize: 16 },
  quickCaption: { color: Palette.inkSoft, fontFamily: Fonts?.sans, fontSize: 9, marginTop: 2 },
  quickArrow: { position: 'absolute', right: 9, top: 7, color: Palette.inkSoft, fontSize: 14 },
  featuredEvent: { borderRadius: Radius.large, overflow: 'hidden', backgroundColor: Palette.ink, minHeight: 355 },
  featuredImage: { width: '100%', height: 186, backgroundColor: Palette.inkSoft },
  featuredDate: {
    position: 'absolute',
    top: 14,
    left: 14,
    width: 54,
    height: 58,
    borderRadius: 13,
    backgroundColor: Palette.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  featuredDay: { color: Palette.orange, fontFamily: Fonts?.display, fontWeight: '900', fontSize: 25, lineHeight: 27 },
  featuredMonth: { color: Palette.ink, fontFamily: Fonts?.rounded, fontWeight: '900', fontSize: 8, letterSpacing: 1 },
  featuredBody: { padding: 17 },
  featuredLabel: { color: Palette.gold, fontFamily: Fonts?.rounded, fontWeight: '900', fontSize: 9, letterSpacing: 1.3 },
  featuredTitle: { color: Palette.white, fontFamily: Fonts?.display, fontWeight: '900', fontSize: 26, marginTop: 5 },
  featuredMeta: { color: '#BFD0CD', fontFamily: Fonts?.sans, fontSize: 10, marginTop: 5 },
  featuredFooter: { flexDirection: 'row', alignItems: 'center', gap: 14, marginTop: 15 },
  featuredPrice: { color: Palette.white, fontFamily: Fonts?.display, fontWeight: '900', fontSize: 20 },
  capacityBar: { height: 5, flex: 1, borderRadius: 5, backgroundColor: '#356064', overflow: 'hidden' },
  capacityFill: { height: '100%', backgroundColor: Palette.orange, borderRadius: 5 },
  newsSection: { marginTop: 34 },
  newsHeading: { paddingHorizontal: 16, alignItems: 'flex-start' },
  newsHeadingCopy: { flex: 1, paddingRight: 10 },
  homeNewsRow: { paddingHorizontal: 16, gap: 10 },
  homeNewsCard: { width: 245, height: 232, borderRadius: Radius.large, overflow: 'hidden', backgroundColor: Palette.inkSoft },
  homeNewsCardFeatured: { width: 285 },
  homeNewsImage: { width: '100%', height: '100%' },
  homeNewsShade: { position: 'absolute', inset: 0, backgroundColor: 'rgba(3,29,31,0.46)' },
  homeNewsBadge: { position: 'absolute', top: 13, left: 13, backgroundColor: Palette.gold, borderRadius: Radius.pill, paddingHorizontal: 9, paddingVertical: 6 },
  homeNewsBadgeText: { color: Palette.ink, fontFamily: Fonts?.rounded, fontSize: 7, fontWeight: '900', letterSpacing: 0.8 },
  homeNewsCopy: { position: 'absolute', left: 15, right: 15, bottom: 15 },
  homeNewsDate: { color: Palette.gold, fontFamily: Fonts?.rounded, fontSize: 8, fontWeight: '800' },
  homeNewsTitle: { color: Palette.white, fontFamily: Fonts?.display, fontSize: 20, lineHeight: 22, fontWeight: '900', marginTop: 4 },
  homeNewsRead: { color: '#D8E6E3', fontFamily: Fonts?.sans, fontSize: 9, marginTop: 7 },
  splitSection: { paddingHorizontal: 16, marginTop: 16, flexDirection: 'row', gap: 10 },
  moodCard: { flex: 1, minHeight: 244, borderRadius: Radius.large, backgroundColor: Palette.sky, padding: 16 },
  moodTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  moodEmoji: { color: Palette.ink, fontFamily: Fonts?.serif, fontSize: 34, fontWeight: '900' },
  moodBadge: { color: Palette.ink, backgroundColor: 'rgba(255,255,255,0.46)', borderRadius: 7, overflow: 'hidden', paddingHorizontal: 7, paddingVertical: 5, fontFamily: Fonts?.rounded, fontWeight: '900', fontSize: 7, letterSpacing: 0.8 },
  moodTitle: { color: Palette.ink, fontFamily: Fonts?.display, fontWeight: '900', fontSize: 24, lineHeight: 25, marginTop: 13 },
  moodText: { color: Palette.inkSoft, fontFamily: Fonts?.sans, fontSize: 10, lineHeight: 15, marginTop: 8 },
  moodMeter: { height: 6, borderRadius: 6, backgroundColor: 'rgba(8,47,51,0.18)', overflow: 'hidden', marginTop: 16 },
  moodMeterFill: { width: '82%', height: '100%', borderRadius: 6, backgroundColor: Palette.ink },
  moodScore: { color: Palette.ink, fontFamily: Fonts?.rounded, fontWeight: '900', fontSize: 7, letterSpacing: 0.8, marginTop: 6 },
  ruleCard: { flex: 1, minHeight: 244, borderRadius: Radius.large, backgroundColor: Palette.gold, padding: 16, overflow: 'hidden' },
  ruleIndex: { color: Palette.orangeDark, fontFamily: Fonts?.rounded, fontWeight: '900', fontSize: 8, letterSpacing: 1.1 },
  ruleTitle: { color: Palette.ink, fontFamily: Fonts?.display, fontWeight: '900', fontSize: 24, lineHeight: 25, marginTop: 15 },
  ruleText: { color: Palette.inkSoft, fontFamily: Fonts?.sans, fontSize: 10, lineHeight: 15, marginTop: 9 },
  ruleStamp: { position: 'absolute', right: -8, bottom: 12, borderWidth: 3, borderColor: 'rgba(200,62,32,0.3)', borderRadius: 9, paddingHorizontal: 11, paddingVertical: 6, transform: [{ rotate: '-8deg' }] },
  ruleStampText: { color: 'rgba(200,62,32,0.42)', fontFamily: Fonts?.rounded, fontWeight: '900', fontSize: 14, letterSpacing: 1.4 },
  locationCard: { height: 190, marginHorizontal: 16, marginTop: 16, borderRadius: Radius.large, overflow: 'hidden', justifyContent: 'flex-end' },
  locationShade: { position: 'absolute', inset: 0, backgroundColor: 'rgba(4,36,39,0.62)' },
  locationPin: { position: 'absolute', top: 16, right: 16, width: 45, height: 45, borderRadius: 15, backgroundColor: Palette.surface, alignItems: 'center', justifyContent: 'center' },
  locationCopy: { padding: 18 },
  locationKicker: { color: Palette.gold, fontFamily: Fonts?.rounded, fontWeight: '900', fontSize: 8, letterSpacing: 1.2 },
  locationTitle: { color: Palette.white, fontFamily: Fonts?.display, fontWeight: '900', fontSize: 26, marginTop: 4 },
  locationText: { color: '#D6E3E1', fontFamily: Fonts?.sans, fontSize: 10, marginTop: 4 },
  pressed: { opacity: 0.82, transform: [{ scale: 0.985 }] },
});
