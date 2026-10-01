import { Image, ImageProps } from 'expo-image';
import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';

import { Palette } from '@/constants/theme';

type Props = ImageProps & { fallbackLabel?: string; showRetry?: boolean; reloadKey?: string | number };

export function MediaImage(props: Props) {
  const identity = JSON.stringify(props.source ?? null) + String(props.reloadKey ?? '');
  return <Picture key={identity} {...props} />;
}

function Picture({ style, source, fallbackLabel = 'Foto belum tersedia', showRetry = false, reloadKey: _reloadKey, onError, ...props }: Props) {
  const present = Boolean(typeof source === 'number' || (typeof source === 'string' && source) || (source && typeof source === 'object' && ('uri' in source ? source.uri : 'nativeRefType' in source)));
  const [failed, setFailed] = useState(!present);
  const [loading, setLoading] = useState(present);
  const [attempt, setAttempt] = useState(0);
  return (
    <View style={[styles.container, style as StyleProp<ViewStyle>]}>
      {!failed ? <Image {...props} key={attempt} source={source} style={StyleSheet.absoluteFill} contentFit={props.contentFit ?? 'cover'} cachePolicy={props.cachePolicy ?? 'memory-disk'}
        onLoadEnd={() => setLoading(false)} onError={(event) => { setFailed(true); setLoading(false); onError?.(event); }} /> : (
        <View style={styles.fallback} accessibilityLabel={fallbackLabel}>
          <Text style={styles.mark}>AA</Text>
          {showRetry ? <><Text style={styles.label}>{fallbackLabel}</Text>{present ? <Pressable accessibilityRole="button" onPress={() => { setFailed(false); setLoading(true); setAttempt((value) => value + 1); }} style={styles.retry}><Text style={styles.retryText}>Muat ulang foto</Text></Pressable> : null}</> : null}
        </View>
      )}
      {loading && !failed ? <View pointerEvents="none" style={styles.spinner}><ActivityIndicator color={Palette.gold} /></View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { backgroundColor: Palette.inkSoft, overflow: 'hidden' },
  fallback: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 8, gap: 8 },
  mark: { color: Palette.gold, fontSize: 20, fontWeight: '900' },
  label: { color: Palette.white, textAlign: 'center', fontSize: 12 },
  retry: { minHeight: 44, justifyContent: 'center', paddingHorizontal: 12, borderRadius: 12, backgroundColor: Palette.mint },
  retryText: { color: Palette.ink, fontSize: 12, fontWeight: '700' },
  spinner: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, justifyContent: 'center', alignItems: 'center' },
});
