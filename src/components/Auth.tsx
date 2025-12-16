import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Building2, Eye, EyeOff } from 'lucide-react';
import { supabase } from '../lib/supabase';

export function Auth() {
  const { signIn, signUp } = useAuth();

  // Form mode + fields
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Loading states
  const [loadingSubmit, setLoadingSubmit] = useState(false);
  const [loadingResend, setLoadingResend] = useState(false);
  const [loadingReset, setLoadingReset] = useState(false);

  // Messages
  const [error, setError] = useState<string | null>(null);
  const [infoMsg, setInfoMsg] = useState<string | null>(null);

  // Banner for "unconfirmed email on login"
  const [showUnconfirmedBanner, setShowUnconfirmedBanner] = useState(false);

  const normalizeEmail = (e: string) => e.trim().toLowerCase();

  const clearMessages = () => {
    setError(null);
    setInfoMsg(null);
    setShowUnconfirmedBanner(false);
  };

  // Detect Supabase "email not confirmed" type errors (text-based, can vary)
  const looksLikeUnconfirmed = (err: any) =>
    typeof err?.message === 'string' &&
    /confirm|confirmation|not.*verified|not.*confirmed/i.test(err.message);

  // Resend confirmation email (Supabase-native)
  const resendConfirmation = async () => {
    clearMessages();
    setLoadingResend(true);

    try {
      const cleanEmail = normalizeEmail(email);

      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: cleanEmail,
        // optional:
        // options: { emailRedirectTo: `${window.location.origin}/` },
      });

      if (error) {
        setError(`Could not resend confirmation email: ${error.message}`);
        return;
      }

      setInfoMsg(
        'If this email is registered and not yet confirmed, we sent a new confirmation email. Check inbox/spam.'
      );
    } catch (e: any) {
      setError(e?.message ?? 'Could not resend the confirmation email.');
    } finally {
      setLoadingResend(false);
    }
  };

  // Password reset (Supabase-native)
  const sendPasswordReset = async () => {
    clearMessages();
    setLoadingReset(true);

    try {
      const cleanEmail = normalizeEmail(email);

      const { error } = await supabase.auth.resetPasswordForEmail(cleanEmail, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) {
        setError(`Could not send reset email: ${error.message}`);
        return;
      }

      setInfoMsg('If an account exists for this email, we sent a password reset link.');
    } catch (e: any) {
      setError(e?.message ?? 'Could not send the reset email.');
    } finally {
      setLoadingReset(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearMessages();
    setLoadingSubmit(true);

    try {
      const cleanEmail = normalizeEmail(email);

      if (isLogin) {
        // LOGIN
        const { error } = await signIn(cleanEmail, password);
        if (error) {
          if (looksLikeUnconfirmed(error)) {
            setShowUnconfirmedBanner(true);
            return;
          }
          throw error;
        }
      } else {
        // SIGN UP
        const { error } = await signUp(cleanEmail, password);

        if (error) {
          const msg = String(error.message || '').toLowerCase();

          if (msg.includes('not approved for signup')) {
            setError('Your email is not approved. Contact Taldaor for approval.');
            return;
          }

          if (msg.includes('already registered') || msg.includes('user already exists')) {
            setInfoMsg('This email is already registered. Please sign in or reset your password.');
            setIsLogin(true);
            return;
          }

          throw error;
        }

        // Success: Supabase will send confirmation email if required.
        // If Supabase auto-signs-in after confirmation, user will become logged in after clicking link.
        setInfoMsg('Signup successful. Please check your email to confirm your account.');
        setIsLogin(true);
        setPassword('');
      }
    } catch (err: any) {
      setError(err?.message ?? 'Something went wrong.');
    } finally {
      setLoadingSubmit(false);
    }
  };

  const submitDisabled = loadingSubmit || loadingResend || loadingReset;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <Building2 className="mx-auto h-16 w-16 text-blue-600" />
          <h2 className="mt-6 text-3xl font-bold text-gray-900">Building Management</h2>
          <p className="mt-2 text-sm text-gray-600">
            {isLogin ? 'Sign in to your account' : 'Create your account'}
          </p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="bg-white p-8 rounded-lg shadow-md space-y-6">
            {/* Unconfirmed login banner */}
            {showUnconfirmedBanner && (
              <div className="border border-amber-200 bg-amber-50 text-amber-900 px-4 py-3 rounded-md text-sm">
                <p className="font-medium mb-1">Email not confirmed</p>
                <p className="mb-3">
                  This account exists but the email is not confirmed yet. Please check your inbox (and spam).
                </p>
                <button
                  type="button"
                  onClick={resendConfirmation}
                  disabled={loadingResend || !email}
                  className="inline-flex items-center px-3 py-1.5 rounded-md bg-amber-600 text-white hover:bg-amber-700 disabled:opacity-50"
                >
                  {loadingResend ? 'Sending…' : 'Resend confirmation email'}
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
            {error && !showUnconfirmedBanner && (
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

            {/* Password */}
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
                  onClick={() => setShowPassword((v) => !v)}
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5 text-gray-400" />
                  ) : (
                    <Eye className="h-5 w-5 text-gray-400" />
                  )}
                </button>
              </div>
            </div>

            {/* Forgot password (login mode only) */}
            {isLogin && (
              <div className="flex items-center justify-end">
                <button
                  type="button"
                  onClick={sendPasswordReset}
                  className="text-sm text-blue-600 hover:text-blue-500"
                  disabled={loadingReset || !email}
                  title={!email ? 'Enter your email first' : ''}
                >
                  {loadingReset ? 'Sending…' : 'Forgot your password?'}
                </button>
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={submitDisabled}
              className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
            >
              {loadingSubmit ? 'Please wait…' : isLogin ? 'Sign in' : 'Sign up'}
            </button>

            {/* Toggle */}
            <div className="text-center">
              <button
                type="button"
                onClick={() => {
                  setIsLogin((v) => !v);
                  clearMessages();
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
