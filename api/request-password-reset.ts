// /api/request-password-reset.ts
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

    // Only allow reset if a profile exists
    const { data: existingProfile, error: profileErr } = await supabase
      .from('profiles')
      .select('id')
      .eq('email', email)
      .maybeSingle();

    if (profileErr) {
      console.error('[reset] profiles query error', profileErr);
      return res.status(500).json({ error: 'Profiles lookup failed' });
    }
    if (!existingProfile) {
      return res.status(200).json({ ok: true, resetSent: false, reason: 'no_profile' });
    }

    const redirectBase = process.env.APP_BASE_URL; // optional
    const redirectTo = redirectBase ? `${redirectBase}/auth/reset-complete` : undefined;

    // Admin API: generate recovery link (sends email)
    const { data, error } = await supabase.auth.admin.generateLink({
      type: 'recovery',
      email,
      options: { redirectTo },
    });

    if (error) {
      console.error('[reset] generateLink error', error);
      return res.status(400).json({ error: error.message });
    }

    return res.status(200).json({ ok: true, resetSent: true });
  } catch (e: any) {
    console.error('[reset] unhandled', e);
    return res.status(500).json({ error: 'Unexpected server error' });
  }
}
