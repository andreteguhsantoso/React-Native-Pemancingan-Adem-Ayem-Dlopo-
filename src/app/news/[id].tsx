import { MediaImage as Image } from '@/components/media-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Fonts, MaxContentWidth, Palette, Radius } from '@/constants/theme';
import { useNews } from '@/context/news-context';

export default function NewsDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { newsItems } = useNews();
  const article = newsItems.find((item) => item.id === id);

  if (!article) {
    return (
      <SafeAreaView style={styles.notFound}>
        <Text style={styles.notFoundTitle}>Kabar tidak ditemukan</Text>
        <Text style={styles.notFoundText}>Artikel mungkin sudah diperbarui atau tidak lagi tersedia.</Text>
        <Pressable onPress={() => router.replace('/news')} style={styles.notFoundButton}>
          <Text style={styles.notFoundButtonText}>Kembali ke berita</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  const openRelatedEvent = () => {
    if (article.relatedEventId) {
      router.push({ pathname: '/event/[id]', params: { id: article.relatedEventId } });
    }
  };

  return (
    <View style={styles.screen}>
      <SafeAreaView edges={['top']} style={styles.safeArea}>
        <View style={styles.topBar}>
          <Pressable onPress={() => router.back()} style={styles.backButton}>
            <Text style={styles.backText}>‹</Text>
          </Pressable>
          <View style={styles.brandCopy}>
            <Text style={styles.brandName}>ADEM AYEM DLOPO</Text>
            <Text style={styles.brandCaption}>KABAR RESMI PEMANCINGAN</Text>
          </View>
          <View style={styles.verifiedButton}>
            <SymbolView
              name={{ ios: 'checkmark.seal.fill', android: 'verified', web: 'verified' }}
              tintColor={Palette.gold}
              size={22}
            />
          </View>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
          <View style={styles.hero}>
            <Image source={article.image} contentFit="cover" transition={300} style={styles.heroImage} />
            <View style={styles.heroShade} />
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{article.badge}</Text>
            </View>
          </View>

          <View style={styles.articleBody}>
            <View style={styles.metaRow}>
              <Text style={styles.category}>{article.category.toUpperCase()}</Text>
              <View style={styles.metaDot} />
              <Text style={styles.metaText}>{article.date}</Text>
              <View style={styles.metaDot} />
              <Text style={styles.metaText}>{article.readTime}</Text>
            </View>

            <Text style={styles.title}>{article.title}</Text>
            <Text style={styles.summary}>{article.summary}</Text>

            {article.facts?.length ? (
              <View style={styles.factRow}>
                {article.facts.map((fact) => (
                  <View key={fact.label} style={styles.factCard}>
                    <Text style={styles.factLabel}>{fact.label}</Text>
                    <Text style={styles.factValue}>{fact.value}</Text>
                  </View>
                ))}
              </View>
            ) : null}

            <View style={styles.articleDivider}>
              <View style={styles.dividerLine} />
              <View style={styles.dividerMark}>
                <Text style={styles.dividerMarkText}>AA</Text>
              </View>
              <View style={styles.dividerLine} />
            </View>

            <View style={styles.paragraphs}>
              {article.paragraphs.map((paragraph, index) => (
                <View key={paragraph} style={styles.paragraphRow}>
                  {index === 0 ? <Text style={styles.dropCap}>{paragraph.charAt(0)}</Text> : null}
                  <Text style={styles.paragraph}>{index === 0 ? paragraph.slice(1) : paragraph}</Text>
                </View>
              ))}
            </View>

            {article.relatedEventId ? (
              <Pressable onPress={openRelatedEvent} style={({ pressed }) => [styles.eventCta, pressed && styles.pressed]}>
                <View style={styles.eventCtaIcon}>
                  <SymbolView
                    name={{ ios: 'ticket.fill', android: 'confirmation_number', web: 'confirmation_number' }}
                    tintColor={Palette.ink}
                    size={23}
                  />
                </View>
                <View style={styles.eventCtaCopy}>
                  <Text style={styles.eventCtaKicker}>EVENT TERKAIT</Text>
                  <Text style={styles.eventCtaTitle}>Lihat detail & pilih lapak</Text>
                </View>
                <Text style={styles.eventCtaArrow}>→</Text>
              </Pressable>
            ) : null}

            <View style={styles.sourceCard}>
              <View style={styles.sourceMark}>
                <Text style={styles.sourceMarkText}>AA</Text>
              </View>
              <View style={styles.sourceCopy}>
                <Text style={styles.sourceTitle}>Pemancingan Adem Ayem Dlopo</Text>
                <Text style={styles.sourceText}>Diterbitkan langsung oleh pengelola pemancingan.</Text>
              </View>
              <SymbolView
                name={{ ios: 'checkmark.seal.fill', android: 'verified', web: 'verified' }}
                tintColor={Palette.success}
                size={20}
              />
            </View>

            <Pressable onPress={() => router.replace('/news')} style={styles.allNewsButton}>
              <Text style={styles.allNewsButtonText}>Lihat semua kabar</Text>
            </Pressable>
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Palette.paper, alignItems: 'center' },
  safeArea: { flex: 1, width: '100%', maxWidth: MaxContentWidth },
  topBar: { minHeight: 70, backgroundColor: Palette.ink, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center' },
  backButton: { width: 42, height: 42, borderRadius: 14, backgroundColor: Palette.inkSoft, alignItems: 'center', justifyContent: 'center' },
  backText: { color: Palette.white, fontFamily: Fonts?.sans, fontSize: 31, lineHeight: 32, marginTop: -3 },
  brandCopy: { flex: 1, paddingHorizontal: 11 },
  brandName: { color: Palette.white, fontFamily: Fonts?.display, fontSize: 14, fontWeight: '900', letterSpacing: 1.1 },
  brandCaption: { color: '#AFC8C5', fontFamily: Fonts?.rounded, fontSize: 7, fontWeight: '800', letterSpacing: 0.7, marginTop: 2 },
  verifiedButton: { width: 42, height: 42, borderRadius: 14, backgroundColor: Palette.inkSoft, alignItems: 'center', justifyContent: 'center' },
  content: { paddingBottom: 34 },
  hero: { height: 315, backgroundColor: Palette.inkSoft },
  heroImage: { width: '100%', height: '100%' },
  heroShade: { position: 'absolute', inset: 0, backgroundColor: 'rgba(3,29,31,0.18)' },
  badge: { position: 'absolute', left: 17, bottom: 17, backgroundColor: Palette.gold, borderRadius: Radius.pill, paddingHorizontal: 12, paddingVertical: 8 },
  badgeText: { color: Palette.ink, fontFamily: Fonts?.rounded, fontSize: 8, fontWeight: '900', letterSpacing: 0.9 },
  articleBody: { paddingHorizontal: 18, paddingTop: 20 },
  metaRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 7 },
  category: { color: Palette.orange, fontFamily: Fonts?.rounded, fontSize: 9, fontWeight: '900', letterSpacing: 1 },
  metaDot: { width: 3, height: 3, borderRadius: 2, backgroundColor: Palette.gold },
  metaText: { color: Palette.muted, fontFamily: Fonts?.sans, fontSize: 9 },
  title: { color: Palette.ink, fontFamily: Fonts?.display, fontSize: 34, lineHeight: 36, fontWeight: '900', letterSpacing: -0.8, marginTop: 11 },
  summary: { color: Palette.inkSoft, fontFamily: Fonts?.serif, fontSize: 14, lineHeight: 21, fontStyle: 'italic', marginTop: 11 },
  factRow: { flexDirection: 'row', gap: 7, marginTop: 22 },
  factCard: { flex: 1, minHeight: 75, borderRadius: 15, backgroundColor: Palette.mint, padding: 10, justifyContent: 'space-between' },
  factLabel: { color: Palette.muted, fontFamily: Fonts?.rounded, fontSize: 6, fontWeight: '900', letterSpacing: 0.65 },
  factValue: { color: Palette.ink, fontFamily: Fonts?.display, fontSize: 12, lineHeight: 14, fontWeight: '900' },
  articleDivider: { flexDirection: 'row', alignItems: 'center', gap: 10, marginVertical: 25 },
  dividerLine: { flex: 1, height: 1, backgroundColor: '#D6D7CF' },
  dividerMark: { width: 31, height: 31, borderRadius: 11, backgroundColor: Palette.orange, alignItems: 'center', justifyContent: 'center', transform: [{ rotate: '-3deg' }] },
  dividerMarkText: { color: Palette.white, fontFamily: Fonts?.display, fontSize: 10, fontWeight: '900' },
  paragraphs: { gap: 16 },
  paragraphRow: { flexDirection: 'row', alignItems: 'flex-start' },
  dropCap: { color: Palette.orange, fontFamily: Fonts?.serif, fontSize: 45, lineHeight: 39, fontWeight: '900', marginRight: 5 },
  paragraph: { flex: 1, color: Palette.inkSoft, fontFamily: Fonts?.sans, fontSize: 12, lineHeight: 20 },
  eventCta: { marginTop: 25, borderRadius: Radius.medium, backgroundColor: Palette.gold, padding: 14, flexDirection: 'row', alignItems: 'center' },
  eventCtaIcon: { width: 46, height: 46, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.5)', alignItems: 'center', justifyContent: 'center' },
  eventCtaCopy: { flex: 1, paddingHorizontal: 11 },
  eventCtaKicker: { color: Palette.orangeDark, fontFamily: Fonts?.rounded, fontSize: 7, fontWeight: '900', letterSpacing: 0.8 },
  eventCtaTitle: { color: Palette.ink, fontFamily: Fonts?.rounded, fontSize: 12, fontWeight: '900', marginTop: 3 },
  eventCtaArrow: { color: Palette.ink, fontSize: 20, fontWeight: '900' },
  sourceCard: { marginTop: 16, borderRadius: Radius.medium, backgroundColor: Palette.surface, borderWidth: 1, borderColor: '#E4DED2', padding: 13, flexDirection: 'row', alignItems: 'center' },
  sourceMark: { width: 43, height: 43, borderRadius: 14, backgroundColor: Palette.ink, alignItems: 'center', justifyContent: 'center' },
  sourceMarkText: { color: Palette.gold, fontFamily: Fonts?.display, fontSize: 13, fontWeight: '900' },
  sourceCopy: { flex: 1, paddingHorizontal: 10 },
  sourceTitle: { color: Palette.ink, fontFamily: Fonts?.rounded, fontSize: 11, fontWeight: '900' },
  sourceText: { color: Palette.muted, fontFamily: Fonts?.sans, fontSize: 8, marginTop: 3 },
  allNewsButton: { marginTop: 14, height: 48, borderRadius: 15, borderWidth: 1, borderColor: Palette.ink, alignItems: 'center', justifyContent: 'center' },
  allNewsButtonText: { color: Palette.ink, fontFamily: Fonts?.rounded, fontSize: 11, fontWeight: '900' },
  pressed: { opacity: 0.82, transform: [{ scale: 0.985 }] },
  notFound: { flex: 1, backgroundColor: Palette.paper, alignItems: 'center', justifyContent: 'center', padding: 24 },
  notFoundTitle: { color: Palette.ink, fontFamily: Fonts?.display, fontSize: 25, fontWeight: '900' },
  notFoundText: { color: Palette.muted, fontFamily: Fonts?.sans, fontSize: 11, textAlign: 'center', marginTop: 6 },
  notFoundButton: { marginTop: 18, backgroundColor: Palette.orange, borderRadius: 14, paddingHorizontal: 17, paddingVertical: 12 },
  notFoundButtonText: { color: Palette.white, fontFamily: Fonts?.rounded, fontSize: 11, fontWeight: '900' },
});
