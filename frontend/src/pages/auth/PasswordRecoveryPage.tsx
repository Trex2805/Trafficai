import React, { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';

const inputClass =
  'w-full rounded-lg border border-slate-600 bg-slate-800 px-4 py-3 text-white placeholder-slate-400';

export const PasswordRecoveryPage: React.FC = () => {
  const [params] = useSearchParams();
  const token = params.get('token') || '';
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError('');
    setMessage('');

    try {
      const response = await fetch(
        token ? '/api/v1/auth/reset-password' : '/api/v1/auth/forgot-password',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(
            token
              ? { token, new_password: password }
              : { email: email.trim() },
          ),
        },
      );
      const body = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(body.detail || 'Unable to process the request.');
      }

      setMessage(body.message || 'Request completed.');
      if (token) {
        setPassword('');
        setConfirmPassword('');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to process the request.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="min-h-screen bg-gradient-dark flex items-center justify-center p-4">
      <section className="card w-full max-w-md border border-slate-700 space-y-5">
        <h1 className="text-2xl font-bold text-white">
          {token ? 'Set a new password' : 'Forgot your password?'}
        </h1>
        <p className="text-sm text-slate-300">
          {token
            ? 'Choose a new password with at least 12 characters. Reset links expire after 30 minutes and can only be used once.'
            : 'Enter your registered email. If an active account matches, we will send a password-reset link.'}
        </p>

        <form onSubmit={submit} className="space-y-4">
          {!token ? (
            <label className="block text-sm text-slate-300">
              Email address
              <input
                className={`${inputClass} mt-2`}
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
              />
            </label>
          ) : (
            <>
              <label className="block text-sm text-slate-300">
                New password
                <input
                  className={`${inputClass} mt-2`}
                  type="password"
                  required
                  minLength={12}
                  maxLength={128}
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </label>
              <label className="block text-sm text-slate-300">
                Confirm new password
                <input
                  className={`${inputClass} mt-2`}
                  type="password"
                  required
                  minLength={12}
                  maxLength={128}
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
              </label>
            </>
          )}

          {error && <p role="alert" className="text-sm text-red-300">{error}</p>}
          {message && <p role="status" className="text-sm text-green-300">{message}</p>}

          <button
            type="submit"
            disabled={busy || (Boolean(token) && password !== confirmPassword)}
            className="w-full rounded-lg bg-sky-600 hover:bg-sky-500 disabled:opacity-50 px-4 py-3 font-semibold text-white"
          >
            {busy
              ? 'Please wait…'
              : token
                ? 'Update password'
                : 'Send reset link'}
          </button>
        </form>

        {token && password && confirmPassword && password !== confirmPassword && (
          <p className="text-sm text-amber-300">Passwords do not match.</p>
        )}

        <Link to="/login" className="block text-center text-sm text-sky-300 underline">
          Back to login
        </Link>
      </section>
    </main>
  );
};
