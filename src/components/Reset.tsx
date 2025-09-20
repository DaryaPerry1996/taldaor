// src/components/Reset.tsx  (or src/pages/Reset.tsx)
import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabase'; // <-- adjust if your client lives elsewhere

type Status = 'checking' | 'ready' | 'error' | 'done';

function parseHash(hash: string) {
  const params = new URLSearchParams(hash.replace(/^#/, ''));
  return {
    type: params.get('type'),
    access_token: params.get('access_token'),
    refresh_token: params.get('refresh_token'),
    error: params.get('error'),
    error_code: params.get('error_code'),
    error_description: params.get('error_description'),
  };
}

export default function Reset() {
  const [status, setStatus] = useState<Status>('checking');
  const [error, setError] = useState<string | null>(null);
  const [pw1, setPw1] = useState('');
  const [pw2, setPw2] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const hash = typeof window !== 'undefined' ? window.location.hash : '';
  const h = useMemo(() => parseHash(hash), [hash]);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      // 1) URL-level error coming from Supabase
      if (h.error) {
        if (!cancelled) {
          setError((`${h.error_code ?? ''} ${h.error_description ?? 'Reset link error'}`).trim());
          setStatus('error');
        }
        return;
      }

      // 2) Require the recovery tokens
      if (h.type !== 'recovery' || !h.access_token || !h.refresh_token) {
        if (!cancelled) {
          setError('Reset link is invalid or missing tokens.');
          setStatus('error');
        }
        return;
      }

      // 3) Establish a session from URL tokens
      const { error } = await supabase.auth.setSession({
        access_token: h.access_token,
        refresh_token: h.refresh_token,
      });
      if (cancelled) return;

      if (error) {
        setError(error.message || 'Could not establish session from reset link (it may have expired).');
        setStatus('error');
        return;
      }

      setStatus('ready');
    })();

    return () => {
      cancelled = true;
    };
  }, [h]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (pw1.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    if (pw1 !== pw2) {
      setError('Passwords do not match.');
      return;
    }

    setSubmitting(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: pw1 });
      if (error) {
        setError(error.message);
        return;
      }
      setStatus('done');
    } finally {
      setSubmitting(false);
    }
  };

  if (status === 'checking') {
    return <div className="p-6 text-center">Please wait…</div>;
  }

  if (status === 'done') {
    return (
      <div className="max-w-md mx-auto p-6">
        <h1 className="text-xl font-semibold mb-2">Password updated</h1>
        <p className="mb-4">You can now sign in with your new password.</p>
        <a className="text-blue-600 underline" href="/">Go to Sign in</a>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="max-w-md mx-auto p-6">
        <h1 className="text-xl font-semibold mb-2">Reset link problem</h1>
        <p className="text-red-600 mb-4">{error}</p>
        <a className="text-blue-600 underline" href="/">Back to Sign in</a>
      </div>
    );
  }

  // status === 'ready'
  return (
    <div className="max-w-md mx-auto p-6">
      <h1 className="text-xl font-semibold mb-4">Set a new password</h1>
      {error && <div className="mb-3 text-red-600">{error}</div>}

      <form onSubmit={submit} className="space-y-3">
        <div>
          <label className="block text-sm font-medium" htmlFor="pw1">New password</label>
          <input
            id="pw1"
            type="password"
            required
            minLength={8}
            autoComplete="new-password"
            className="mt-1 w-full border rounded px-3 py-2"
            value={pw1}
            onChange={(e) => setPw1(e.target.value)}
          />
        </div>

        <div>
          <label className="block text-sm font-medium" htmlFor="pw2">Confirm password</label>
          <input
            id="pw2"
            type="password"
            required
            minLength={8}
            autoComplete="new-password"
            className="mt-1 w-full border rounded px-3 py-2"
            value={pw2}
            onChange={(e) => setPw2(e.target.value)}
          />
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="w-full bg-blue-600 text-white rounded py-2 disabled:opacity-60"
        >
          {submitting ? 'Updating…' : 'Update password'}
        </button>
      </form>
    </div>
  );
}
