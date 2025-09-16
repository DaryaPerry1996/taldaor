// api/resend-confirmation.ts

import { createClient } from '@supabase/supabase-js';

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') return res.status(405).send('Method Not Allowed');

  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY! // SERVER ONLY
  );

  const email = String(req.body?.email ?? '').toLowerCase().trim();
  if (!email) return res.status(400).json({ error: 'Missing email' });

  // re-check allowlist to avoid info leakage
  const { data: ok, error: checkErr } = await supabase
    .from('approved_emails')
    .select('email')
    .eq('email', email)
    .single();

  if (checkErr || !ok) {
    // still neutral
    return res.status(200).json({ ok: true, resent: false });
  }

  // re-send the invite/confirmation
  const { data, error } = await supabase.auth.admin.inviteUserByEmail(email, {
    data: { role: 'tenant' },
  });

  if (error) return res.status(400).json({ error: error.message });

  return res.status(200).json({ ok: true, resent: true, userId: data.user?.id });
}