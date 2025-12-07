// api/request-signup.ts

import { createClient } from '@supabase/supabase-js';

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') return res.status(405).send('Method Not Allowed');

  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY! // SERVER ONLY
  );

  const email = String(req.body?.email ?? '').toLowerCase().trim();
  if (!email) return res.status(400).json({ error: 'Missing email' });

  // 1) check allowlist (don’t leak whether approved/not)
  const { data: ok, error: checkErr } = await supabase
    .from('approved_emails')
    .select('email')
    .eq('email', email)
    .single();

  if (checkErr || !ok) {
    // Neutral response: we don't say "not approved"
    return res.status(200).json({ ok: true, sent: false });
  }

  // 2) send the official invite (emails the verification link)
  const { data, error } = await supabase.auth.admin.inviteUserByEmail(email, {
    data: { role: 'tenant' }, // metadata used by your trigger to set profiles.role
  });

  if (error) return res.status(400).json({ error: error.message });

  return res.status(200).json({ ok: true, sent: true, userId: data.user?.id });
}
