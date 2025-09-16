// /api/request-signup.ts
import { createClient } from '@supabase/supabase-js';

const normalize = (s: unknown) => String(s ?? '').trim().toLowerCase();

export default async function handler(req: any, res: any) {
  try {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

    const url = process.env.SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !serviceKey) return res.status(500).json({ error: 'Server not configured' });

    // Robust body parse (Vercel can pass a string)
    let body: any = req.body;
    if (typeof body === 'string') {
      try { body = JSON.parse(body); } catch { body = {}; }
    }

    const supabase = createClient(url, serviceKey);
    const email = normalize(body?.email);
    if (!email) return res.status(400).json({ error: 'Missing email' });

    // (A) Does a profile already exist for this email?
    const { data: existingProfile, error: profileErr } = await supabase
      .from('profiles')
      .select('id')
      .eq('email', email)
      .maybeSingle();

    if (profileErr) {
      console.error('[request-signup] profiles query error', profileErr);
      return res.status(500).json({ error: 'Profiles lookup failed' });
    }

    if (existingProfile) {
      // Tell client to flip to Sign in / Reset password
      return res.status(200).json({
        ok: true,
        profileExists: true,
        message: 'A user already exists with that profile.',
      });
    }

    // (B) Check allow-list (case-insensitive) and optional is_active
    const { data: approved, error: allowErr } = await supabase
      .from('approved_emails')
      .select('email, is_active')
      .ilike('email', email)
      .maybeSingle();

    if (allowErr) {
      console.error('[request-signup] allowlist check error', allowErr);
      return res.status(500).json({ error: 'Allowlist check failed' });
    }

    if (!approved || approved.is_active === false) {
      // Explicit reason so UI can show correct message
      return res.status(200).json({ ok: true, sent: false, reason: 'not_on_allowlist' });
    }

    // (C) Send invite (Supabase Auth)
    const redirectBase = process.env.APP_BASE_URL; // e.g. https://taldaor.vercel.app
    const redirectTo = redirectBase ? `${redirectBase}/?confirmed=1` : undefined;

    const { data, error } = await supabase.auth.admin.inviteUserByEmail(email, {
      // NOTE: use `redirectTo`; ensure it is allowed in Supabase Auth settings
      redirectTo,
      // You can also stamp custom claims in user_metadata:
      data: { role: 'tenant' },
    });

    if (error) {
      const msg = String(error.message || '').toLowerCase();
      // Supabase often returns 422 / “already registered” if a user exists in Auth
      if (error.status === 422 || msg.includes('already')) {
        return res.status(200).json({
          ok: true,
          profileExists: false,
          alreadyAuth: true,
          message: 'A user already exists in Auth for this email.',
        });
      }
      console.error('[request-signup] invite error', error);
      return res.status(400).json({ error: error.message });
    }

    return res.status(200).json({ ok: true, sent: true, userId: data.user?.id });
  } catch (e: any) {
    console.error('[request-signup] unhandled', e);
    return res.status(500).json({ error: 'Unexpected server error' });
  }
}
