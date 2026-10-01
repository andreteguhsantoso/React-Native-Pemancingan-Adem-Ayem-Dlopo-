import { useFocusEffect } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { AppState } from 'react-native';

export function useFocusResource<T>(loader: () => Promise<T>, initial: T, enabled = true, intervalMs = 30000) {
  const [data, setData] = useState(initial);
  const [refreshing, setRefreshing] = useState(enabled);
  const [error, setError] = useState<string | null>(null);
  const [updatedAt, setUpdatedAt] = useState<number | null>(null);
  const generation = useRef(0);
  const focused = useRef(false);
  const busy = useRef(false);

  const refresh = useCallback(async () => {
    if (!enabled || busy.current || !focused.current) return;
    busy.current = true;
    const request = ++generation.current;
    setRefreshing(true);
    try {
      const next = await loader();
      if (focused.current && request === generation.current) { setData(next); setError(null); setUpdatedAt(Date.now()); }
    } catch (cause) {
      if (focused.current && request === generation.current) setError(cause instanceof Error ? cause.message : 'Data belum dapat dimuat. Tarik halaman untuk mencoba kembali.');
    } finally {
      if (request === generation.current) { busy.current = false; if (focused.current) setRefreshing(false); }
    }
  }, [enabled, loader]);

  useFocusEffect(useCallback(() => {
    focused.current = true;
    busy.current = false;
    if (!enabled) { setData(initial); setRefreshing(false); setError(null); }
    else void refresh();
    const timer = enabled && intervalMs > 0 ? setInterval(() => { if (AppState.currentState === 'active') void refresh(); }, intervalMs) : null;
    const listener = AppState.addEventListener('change', (state) => { if (state === 'active' && enabled) void refresh(); });
    return () => { focused.current = false; generation.current++; busy.current = false; listener.remove(); if (timer) clearInterval(timer); };
    // Initial is a reset value, not a fetch dependency.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, intervalMs, refresh]));

  return { data, refreshing, error, refresh, updatedAt };
}
