// /api/request-password-reset.ts
import { createClient } from '@supabase/supabase-js';

const normalize = (s: unknown) => String(s ?? '').trim().toLowerCase();

export default async function handler(req: any, res: any) {
  try {
    if (req.method !== 'POST') {
      return res.status(405).json({ ok: false, error: 'Method Not Allowed' });
    }

    const url = process.env.SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !serviceKey) {
      return res.status(500).json({ ok: false, error: 'Server not configured' });
    }

    // Robust body parse (Vercel sometimes gives string)
    let body: any = req.body;
    if (typeof body === 'string') {
      try { body = JSON.parse(body); } catch { body = {}; }
    }

    const email = normalize(body?.email);
    if (!email) return res.status(400).json({ ok: false, error: 'Missing email' });

    const supabase = createClient(url, serviceKey);

    // 1) Profile must exist (case-insensitive)
    const { data: existingProfile, error: profileErr } = await supabase
      .from('profiles')
      .select('id')
      .ilike('email', email)
      .maybeSingle();

    if (profileErr) {
      console.error('[reset] profiles query error', profileErr);
      return res.status(500).json({ ok: false, error: 'Profiles lookup failed' });
    }
    if (!existingProfile) {
      return res.status(200).json({ ok: true, resetSent: false, reason: 'no_profile' });
    }

    // 2) Ensure there is an Auth user for this email
    const { data: users, error: listErr } =
      // @ts-ignore - types vary by package version
      await (supabase as any).auth.admin.listUsers({ page: 1, perPage: 1, email });

    if (listErr) {
      console.error('[reset] listUsers error', listErr);
      return res.status(500).json({ ok: false, error: 'Auth user lookup failed' });
    }
    const hasAuthUser = (users?.users || []).some((u: any) =>
      (u.email || '').toLowerCase() === email
    );
    if (!hasAuthUser) {
      // Don’t attempt recovery if no auth record exists
      return res.status(200).json({ ok: true, resetSent: false, reason: 'no_auth_user' });
    }

    // 3) Generate recovery link (sends email)
    const redirectBase = process.env.APP_BASE_URL; // e.g., https://taldaor.vercel.app
    const redirectTo = redirectBase ? `${redirectBase}/auth/reset-complete` : undefined;

    const { data, error } = await supabase.auth.admin.generateLink({
      type: 'recovery',
      email,
      options: { redirectTo },
    });

    if (error) {
      console.error('[reset] generateLink error', error);
      return res.status(400).json({ ok: false, error: error.message });
    }

    return res.status(200).json({ ok: true, resetSent: true });
  } catch (e: any) {
    console.error('[reset] unhandled', e);
    return res.status(500).json({ ok: false, error: 'Unexpected server error' });
  }
}
