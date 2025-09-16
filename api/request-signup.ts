/// api/request-signup.ts
export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed (GET ok for smoke test)' });
  }
  return res.status(200).json({ ok: true, hello: 'world' });
}
