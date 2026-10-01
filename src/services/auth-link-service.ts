import { requireSupabase } from '@/lib/supabase';

function readParameters(url: string) {
  const values: Record<string, string> = {};
  const query = url.includes('?') ? url.split('?')[1].split('#')[0] : '';
  const fragment = url.includes('#') ? url.split('#')[1] : '';

  for (const section of [query, fragment]) {
    for (const pair of section.split('&')) {
      if (!pair) continue;
      const separator = pair.indexOf('=');
      const key = separator >= 0 ? pair.slice(0, separator) : pair;
      const value = separator >= 0 ? pair.slice(separator + 1) : '';
      values[decodeURIComponent(key)] = decodeURIComponent(value.replace(/\+/g, ' '));
    }
  }
  return values;
}

export async function establishRecoverySession(url: string) {
  const params = readParameters(url);
  if (params.error_description) throw new Error(params.error_description);

  const client = requireSupabase();
  if (params.code) {
    const { error } = await client.auth.exchangeCodeForSession(params.code);
    if (error) throw new Error(error.message);
  } else if (params.access_token && params.refresh_token) {
    const { error } = await client.auth.setSession({
      access_token: params.access_token,
      refresh_token: params.refresh_token,
    });
    if (error) throw new Error(error.message);
  }

  const { data, error } = await client.auth.getSession();
  if (error) throw new Error(error.message);
  if (!data.session) throw new Error('Tautan pemulihan tidak valid atau sudah kedaluwarsa.');
}
