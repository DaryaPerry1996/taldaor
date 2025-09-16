// /api/request-signup.ts
import { createClient } from '@supabase/supabase-js';

export default async function handler(req: any, res: any) {
  try {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

    const url = process.env.SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !serviceKey) return res.status(500).json({ error: 'Server not configured' });

    const supabase = createClient(url, serviceKey);
    const email = String(req.body?.email ?? '').toLowerCase().trim();
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
      // Tell the client explicitly so it can show the reset-password option
      return res.status(200).json({
        ok: true,
        profileExists: true,
        message: 'A user already exists with that profile.',
      });
    }

    // (B) If no profile, check allowlist
    const { data: approved, error: allowErr } = await supabase
      .from('approved_emails')
      .select('email')
      .eq('email', email)
      .maybeSingle();

    if (allowErr) {
      console.error('[request-signup] allowlist check error', allowErr);
      return res.status(500).json({ error: 'Allowlist check failed' });
    }

    if (!approved) {
      // Neutral reply (don’t leak allowlist)
      return res.status(200).json({ ok: true, sent: false });
    }

    // (C) Send invite (verification email). Password will be set on hosted page.
    const redirectBase = process.env.APP_BASE_URL; // optional
    const redirectTo = redirectBase ? `${redirectBase}/?confirmed=1` : undefined;

    const { data, error } = await supabase.auth.admin.inviteUserByEmail(email, {
      data: { role: 'tenant' },
      redirectTo,
    });

    if (error) {
      // If user exists in Auth but no profile (rare), surface clearly:
      const msg = String(error.message || '').toLowerCase();
      if (msg.includes('already registered')) {
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
