import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Building2, Eye, EyeOff } from 'lucide-react';
import { supabase } from '../lib/supabase';

export function Auth() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const [showConfirmBanner, setShowConfirmBanner] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [infoMsg, setInfoMsg] = useState<string | null>(null);

  const { signIn, signUp } = useAuth();

  // Prefill email and handle return from hosted confirm page
  useEffect(() => {
    const cached = localStorage.getItem('signup_email');
    if (cached) setEmail(cached);

    const params = new URLSearchParams(window.location.search);
    if (params.get('confirmed') === '1') {
      setIsLogin(true);
      setShowConfirmBanner(false);
      setInfoMsg('Your email is confirmed. You can now sign in with your email and password.');
      localStorage.removeItem('signup_email');
      // Clean the URL
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  const looksLikeUnconfirmed = (err: any) =>
    typeof err?.message === 'string' &&
    /confirm|confirmation|not.*verified|not.*confirmed/i.test(err.message);

  const normalizeEmail = (e: string) => e.trim().toLowerCase();

  // Resend the confirmation email using Supabase client 
const resendConfirmation = async () => {
  setLoading(true);
  setError(null);
  setInfoMsg(null);

  try {
    const cleanEmail = normalizeEmail(email);

    // Supabase built-in resend
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email: cleanEmail,
      options: {
        // match your signup redirect (?confirmed=1)
        emailRedirectTo: `${window.location.origin}/?confirmed=1`,
      },
    });

    if (error) {
      const msg = (error.message || '').toLowerCase();

      // Common cases: no such user / already confirmed / generic error
      if (msg.includes('not found') || msg.includes('user')) {
        setError('No account found for this email. Please sign up first.');
      } else if (msg.includes('already') && msg.includes('confirmed')) {
        setInfoMsg('Your email is already confirmed. Please sign in with your password.');
        setIsLogin(true);
      } else {
        setError(`Could not resend confirmation email: ${error.message}`);
      }
    } else {
      setInfoMsg('We’ve sent another confirmation email. Please check your inbox (and spam).');
    }
  } catch (e: any) {
    setError(e?.message ?? 'Could not resend the confirmation email.');
  } finally {
    setLoading(false);
  }
};


  // Send password reset (only if profile exists; server enforces this)
  const sendPasswordReset = async () => {
    setLoading(true);
    setError(null);
    setInfoMsg(null);
    try {
      const cleanEmail = normalizeEmail(email);
      const resp = await fetch('/api/request-password-reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: cleanEmail }),
      });
      const result = await resp.json();

      if (result?.ok && result?.resetSent) {
        setInfoMsg('We’ve sent a password reset link to your email.');
      } else if (result?.reason === 'no_profile') {
        setError('No profile found for that email.');
      } else if (result?.reason === 'no_auth_user') {
        setError('This email is registered in Taldaor but not yet activated. Please sign up first or contact support.');
      } else if (result?.error) {
        setError(`Server error: ${result.error}`);
      } else {
        setError('Could not send the reset email.');
      }
    } catch (e: any) {
      setError(e?.message ?? 'Could not send the reset email.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setInfoMsg(null);
    setShowConfirmBanner(false);

    try {
      const cleanEmail = normalizeEmail(email);

      if (isLogin) {
        // LOGIN
        const { error } = await signIn(cleanEmail, password);
        if (error) {
          if (looksLikeUnconfirmed(error)) {
            setShowConfirmBanner(true);
            return; // handled by banner + resend button
          }
          throw error;
        }
      } else {
        // SIGN UP: use AuthContext.signUp (checks approved_emails, assigns role, creates profile)
        localStorage.setItem('signup_email', cleanEmail);

        const { error } = await signUp(cleanEmail, password);

        if (error) {
          const msg = String(error.message || '').toLowerCase();

          // Custom allowlist error from signUp
          if (msg.includes('not approved for signup')) {
            setShowConfirmBanner(false);
            setInfoMsg(null);
            setError('Your email is not approved, contact Taldaor for approval');
            return;
          }

          // Typical "already registered" error from Supabase
          if (msg.includes('already registered') || msg.includes('user already exists')) {
            setShowConfirmBanner(false);
            setInfoMsg('This email is already registered. Please sign in or reset your password.');
            setIsLogin(true);
            return;
          }

          // Anything else → generic
          throw error;
        }

        // If signUp succeeded:
        // Supabase will send them a confirmation email if email confirmation is enabled.
        setShowConfirmBanner(true);
        setError(null);
        setInfoMsg(null);
        setIsLogin(true);
      }
    } catch (err: any) {
      setError(err?.message ?? 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <Building2 className="mx-auto h-16 w-16 text-blue-600" />
          <h2 className="mt-6 text-3xl font-bold text-gray-900">
            Building Management
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            {isLogin ? 'Sign in to your account' : 'Create your account'}
          </p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="bg-white p-8 rounded-lg shadow-md space-y-6">

            {/* Confirmation sent banner */}
            {showConfirmBanner && (
              <div className="border border-emerald-200 bg-emerald-50 text-emerald-800 px-4 py-3 rounded-md text-sm">
                <p className="font-medium mb-1">Confirmation email sent</p>
                <p className="mb-3">
                  We’ve sent a confirmation link to <span className="font-mono">{normalizeEmail(email)}</span>.
                  Please check your inbox (and spam) to complete your sign up.
                </p>
                <button
                  type="button"
                  onClick={resendConfirmation}
                  disabled={loading}
                  className="inline-flex items-center px-3 py-1.5 rounded-md bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50"
                >
                  {loading ? 'Sending…' : 'Resend confirmation email'}
                </button>
              </div>
            )}

            {/* Info banner */}
            {infoMsg && (
              <div className="border border-blue-200 bg-blue-50 text-blue-800 px-4 py-3 rounded-md text-sm">
                {infoMsg}
              </div>
            )}

            {/* Error banner */}
            {error && !showConfirmBanner && (
              <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-md text-sm">
                {error}
              </div>
            )}

            {/* Email */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                Email address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="Enter your email"
              />
            </div>

            {/* Password: used for both sign-in and sign-up */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                Password
              </label>
              <div className="mt-1 relative">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete={isLogin ? 'current-password' : 'new-password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full px-3 py-2 pr-10 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  placeholder={isLogin ? 'Enter your password' : 'Choose a password'}
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5 text-gray-400" />
                  ) : (
                    <Eye className="h-5 w-5 text-gray-400" />
                  )}
                </button>
              </div>
            </div>

            {/* Forgot password: only in login mode */}
            {isLogin && (
              <div className="flex items-center justify-end">
                <button
                  type="button"
                  onClick={sendPasswordReset}
                  className="text-sm text-blue-600 hover:text-blue-500"
                  disabled={loading || !email}
                  title={!email ? 'Enter your email first' : ''}
                >
                  Forgot your password?
                </button>
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
            >
              {loading ? 'Please wait...' : (isLogin ? 'Sign in' : 'Sign up')}
            </button>

            {/* Toggle */}
            <div className="text-center">
              <button
                type="button"
                onClick={() => {
                  setIsLogin(!isLogin);
                  setError(null);
                  setInfoMsg(null);
                  setShowConfirmBanner(false);
                }}
                className="text-blue-600 hover:text-blue-500 text-sm font-medium"
              >
                {isLogin ? "Don't have an account? Sign up" : 'Already have an account? Sign in'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
