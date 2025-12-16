import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Building2, Eye, EyeOff } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useTranslation } from 'react-i18next';

export function Auth() {
  const { t } = useTranslation();

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
      setInfoMsg(t('auth.confirmedInfo'));
      localStorage.removeItem('signup_email');
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, [t]);

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

      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: cleanEmail,
        options: {
          emailRedirectTo: `${window.location.origin}/?confirmed=1`,
        },
      });

      if (error) {
        const msg = (error.message || '').toLowerCase();

        if (msg.includes('not found') || msg.includes('user')) {
          setError(t('auth.noAccountFound'));
        } else if (msg.includes('already') && msg.includes('confirmed')) {
          setInfoMsg(t('auth.alreadyConfirmed'));
          setIsLogin(true);
        } else {
          setError(t('auth.resendFailed', { message: error.message }));
        }
      } else {
        setInfoMsg(t('auth.resendSent'));
      }
    } catch (e: any) {
      setError(e?.message ?? t('auth.resendGenericFail'));
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
        setInfoMsg(t('auth.resetSent'));
      } else if (result?.reason === 'no_profile') {
        setError(t('auth.noProfile'));
      } else if (result?.reason === 'no_auth_user') {
        setError(t('auth.noAuthUser'));
      } else if (result?.error) {
        setError(t('auth.serverError', { error: result.error }));
      } else {
        setError(t('auth.resetFailed'));
      }
    } catch (e: any) {
      setError(e?.message ?? t('auth.resetGenericFail'));
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
        const { error } = await signIn(cleanEmail, password);
        if (error) {
          if (looksLikeUnconfirmed(error)) {
            setShowConfirmBanner(true);
            return;
          }
          throw error;
        }
      } else {
        localStorage.setItem('signup_email', cleanEmail);

        const { error } = await signUp(cleanEmail, password);

        if (error) {
          const msg = String(error.message || '').toLowerCase();

          if (msg.includes('not approved for signup')) {
            setShowConfirmBanner(false);
            setInfoMsg(null);
            setError(t('auth.notApproved'));
            return;
          }

          if (msg.includes('already registered') || msg.includes('user already exists')) {
            setShowConfirmBanner(false);
            setInfoMsg(t('auth.alreadyRegistered'));
            setIsLogin(true);
            return;
          }

          throw error;
        }

        setShowConfirmBanner(true);
        setError(null);
        setInfoMsg(null);
        setIsLogin(true);
      }
    } catch (err: any) {
      setError(err?.message ?? t('auth.genericError'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <Building2 className="mx-auto h-16 w-16 text-blue-600" />
          <h2 className="mt-6 text-3xl font-bold text-gray-900">{t('appTitle')}</h2>
          <p className="mt-2 text-sm text-gray-600">
            {isLogin ? t('auth.signInSubtitle') : t('auth.signUpSubtitle')}
          </p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="bg-white p-8 rounded-lg shadow-md space-y-6">
            {/* Confirmation sent banner */}
            {showConfirmBanner && (
              <div className="border border-emerald-200 bg-emerald-50 text-emerald-800 px-4 py-3 rounded-md text-sm">
                <p className="font-medium mb-1">{t('auth.confirmationSentTitle')}</p>
                <p className="mb-3">
                  {t('auth.confirmationSentBody')}{' '}
                  <span dir="ltr" className="font-mono">
                    {normalizeEmail(email)}
                  </span>
                  .
                </p>
                <button
                  type="button"
                  onClick={resendConfirmation}
                  disabled={loading}
                  className="inline-flex items-center px-3 py-1.5 rounded-md bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50"
                >
                  {loading ? t('auth.sending') : t('auth.resendConfirmation')}
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
                {t('auth.emailLabel')}
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
                placeholder={t('auth.emailPlaceholder')}
              />
            </div>

            {/* Password */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                {t('auth.passwordLabel')}
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
                  placeholder={isLogin ? t('auth.passwordPlaceholderLogin') : t('auth.passwordPlaceholderSignup')}
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? t('auth.hidePassword') : t('auth.showPassword')}
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5 text-gray-400" />
                  ) : (
                    <Eye className="h-5 w-5 text-gray-400" />
                  )}
                </button>
              </div>
            </div>

            {/* Forgot password */}
            {isLogin && (
              <div className="flex items-center justify-end">
                <button
                  type="button"
                  onClick={sendPasswordReset}
                  className="text-sm text-blue-600 hover:text-blue-500"
                  disabled={loading || !email}
                  title={!email ? t('auth.enterEmailFirst') : ''}
                >
                  {t('auth.forgotPassword')}
                </button>
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
            >
              {loading ? t('auth.pleaseWait') : isLogin ? t('login') : t('signup')}
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
                {isLogin ? t('auth.toggleToSignup') : t('auth.toggleToLogin')}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
