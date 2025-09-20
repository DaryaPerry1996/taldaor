// /api/resend-confirmation.ts
import { createClient } from '@supabase/supabase-js';

const normalize = (s: unknown) => String(s ?? '').trim().toLowerCase();

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Method Not Allowed' });
  }

  const url = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    return res.status(500).json({ ok: false, error: 'Server not configured' });
  }

  // Robust body parse (Vercel can pass string)
  let body: any = req.body;
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch { body = {}; }
  }

  const email = normalize(body?.email);
  if (!email) return res.status(400).json({ ok: false, error: 'Missing email' });

  const supabase = createClient(url, serviceKey);

  // 1) Re-check allowlist (case-insensitive, optionally)
  const { data: approved, error: allowErr } = await supabase
    .from('approved_emails')
    .select('email')
    .ilike('email', email)
    .maybeSingle();

  if (allowErr) {
    console.error('[resend] allowlist error', allowErr);
    return res.status(500).json({ ok: false, error: 'Allowlist check failed' });
  }
  if (!approved) {
    // neutral: don't leak allow-list state to attackers
    return res.status(200).json({ ok: true, resent: false, reason: 'not_on_allowlist' });
  }

  // 2) Make sure an Auth user exists to resend to
  // (Avoid “user not found” surprises)
  // @ts-ignore: versions differ
  const { data: users, error: listErr } = await (supabase as any).auth.admin.listUsers({ page: 1, perPage: 1, email });
  if (listErr) {
    console.error('[resend] listUsers error', listErr);
    return res.status(500).json({ ok: false, error: 'Auth user lookup failed' });
  }
  const user = (users?.users || []).find((u: any) => (u.email || '').toLowerCase() === email);
  if (!user) {
    // Neutral: don’t disclose too much; your UI can decide to suggest Sign Up
    return res.status(200).json({ ok: true, resent: false, reason: 'no_auth_user' });
  }

  const base = process.env.APP_BASE_URL || process.env.SITE_URL; // support either var
  const emailRedirectTo = base ? `${base}/?confirmed=1` : undefined;
  const resetRedirectTo = base ? `${base}/reset` : emailRedirectTo; // tweak to your route

  // 3) If already confirmed, tell the client to show a helpful message

  // 3) If already confirmed → send PASSWORD RESET instead of bailing
  if (user?.email_confirmed_at || user?.confirmed_at) {
    const { error: resetErr } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: resetRedirectTo, // fallback if you don't have a dedicated reset page
    });

    if (resetErr) {
      console.error('[resend] resetPasswordForEmail error', resetErr);
      return res.status(400).json({ ok: false, error: resetErr.message, reason: 'reset_failed' });
    }

    return res.status(200).json({
      ok: true,
      resent: false,
      resetSent: true,
      reason: 'already_confirmed',
      message: 'Password reset email sent',
    });
  }

  // 4) Not confirmed → resend confirmation
  const { error: resendErr } = await supabase.auth.resend({
    type: 'signup',
    email,
    options: { emailRedirectTo },
  });

  if (resendErr) {
    console.error('[resend] auth.resend error', resendErr);
    const msg = String(resendErr.message || '').toLowerCase();
    if (msg.includes('already confirmed')) {
      // Race condition: user just confirmed; fall back to reset
      const { error: resetErr } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: resetRedirectTo || emailRedirectTo,
      });
      if (resetErr) {
        console.error('[resend] reset fallback error', resetErr);
        return res.status(400).json({ ok: false, error: resetErr.message, reason: 'reset_failed' });
      }
      return res.status(200).json({ ok: true, resent: false, resetSent: true, reason: 'already_confirmed' });
    }
    return res.status(400).json({ ok: false, error: resendErr.message });
  }

  return res.status(200).json({ ok: true, resent: true });
}
