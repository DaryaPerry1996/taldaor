/*
import { createClient } from '@supabase/supabase-js';
//import type { Database } from './database.types';

const url = import.meta.env.VITE_SUPABASE_URL as string;
const anon = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

export const supabase = createClient(url, anon);
//export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);*/

// src/lib/supabase.ts (or wherever your client lives)
import { createClient } from '@supabase/supabase-js';

// Vite envs (must start with VITE_)
const url = import.meta.env.VITE_SUPABASE_URL!;
const anon = import.meta.env.VITE_SUPABASE_ANON_KEY!;

// Wrap fetch to log requests/responses
const loggingFetch: typeof fetch = async (input, init) => {
  const u =
    typeof input === 'string'
      ? input
      : input instanceof URL
      ? input.toString()
      : (input as Request).url;

  if (import.meta.env.DEV) {
    const method = (init?.method ?? 'GET').toUpperCase();
    const headers = new Headers(init?.headers as any);
    if (headers.has('Authorization')) headers.set('Authorization', 'REDACTED');

    console.log('[SUPABASE →]', method, u);
    if (init?.body && method !== 'GET') {
      try { console.log('[BODY]', JSON.parse(init.body as any)); }
      catch { console.log('[BODY]', init.body); }
    }
  }

  const res = await fetch(input as RequestInfo, init as RequestInit);

  if (import.meta.env.DEV) {
    const clone = res.clone();
    let text = '';
    try { text = await clone.text(); } catch {}
    console.log('[SUPABASE ←]', res.status, res.statusText, u);
    if (text) console.log('[RESP BODY]', text.slice(0, 2000)); // avoid huge dumps
  }
  return res;
};

// If you have generated types, you can use createClient<Database>(...)
export const supabase = createClient(url, anon, {
  global: { fetch: loggingFetch },
});
