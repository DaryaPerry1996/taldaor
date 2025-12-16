// api/signup-approved.ts
import { createClient } from '@supabase/supabase-js';

const normalize = (s: unknown) => String(s ?? '').trim().toLowerCase();

export default async function handler(req: any, res: any) {
  try {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

    const url = process.env.SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !serviceKey) return res.status(500).json({ error: 'Server not configured' });

    // Vercel sometimes passes body as string
    let body: any = req.body;
    if (typeof body === 'string') {
      try { body = JSON.parse(body); } catch { body = {}; }
    }

    const email = normalize(body?.email);
    const password = String(body?.password ?? '');
    if (!email || !password) return res.status(400).json({ error: 'Missing email or password' });

    const supabaseAdmin = createClient(url, serviceKey);

    // 1) Check approval server-side
    const { data: approval, error: approvalError } = await supabaseAdmin
      .from('approved_emails')
      .select('Admin')
      .eq('email', email)
      .maybeSingle();

    if (approvalError) return res.status(500).json({ error: approvalError.message });
    if (!approval) return res.status(403).json({ error: 'This email is not approved for signup.' });

    const role = approval.Admin ? 'admin' : 'tenant';

    // 2) Create auth user server-side (still normal email verification flow)
    const { data: created, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: false, // user must confirm email like before
      user_metadata: { role }, // optional
      app_metadata: { role },  // server-controlled if you ever want JWT-based role checks
    });

    if (createError) return res.status(400).json({ error: createError.message });
    if (!created?.user) return res.status(500).json({ error: 'User not created' });

    // 3) Upsert profile row (reliable / idempotent)
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .upsert(
        { id: created.user.id, email, role },
        { onConflict: 'id' }
      );

    if (profileError) {
      // Optional cleanup if you want:
      // await supabaseAdmin.auth.admin.deleteUser(created.user.id);
      return res.status(400).json({ error: profileError.message });
    }

    return res.status(200).json({ ok: true });
  } catch (e: any) {
    return res.status(500).json({ error: e?.message ?? 'Unknown error' });
  }
}
