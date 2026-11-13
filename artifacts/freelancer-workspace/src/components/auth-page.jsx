import { useState } from 'react';
import { Link, useLocation } from 'wouter';
import {
  isSupabaseConfigured,
  signInWithEmail,
  signInWithGoogle,
  signUpWithEmail,
} from '@/lib/supabase';

export default function AuthPage() {
  const [location, setLocation] = useLocation();
  const isSignUp = location === '/signup';
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [pending, setPending] = useState(false);

  async function submit(event) {
    event.preventDefault();
    setMessage('');
    setError('');
    setPending(true);

    try {
      const data = isSignUp
        ? await signUpWithEmail(email, password)
        : await signInWithEmail(email, password);

      if (!isSignUp || data.session) {
        setLocation('/dashboard');
      } else {
        setMessage('Check your email for a confirmation link, then sign in.');
      }
    } catch (authError) {
      setError(authError.message || 'Authentication failed. Please try again.');
    } finally {
      setPending(false);
    }
  }

  async function continueWithGoogle() {
    setMessage('');
    setError('');
    setPending(true);
    try {
      await signInWithGoogle();
    } catch (authError) {
      setError(authError.message || 'Google sign-in failed. Please try again.');
      setPending(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[hsl(var(--background))] px-5 py-12 text-[hsl(var(--foreground))]">
      <section className="content-card w-full max-w-md p-7 sm:p-9">
        <Link href="/" className="eyebrow text-[hsl(var(--primary))]">
          SyncFlow
        </Link>
        <h1 className="mt-4 font-display text-3xl font-semibold">
          {isSignUp ? 'Create your workspace' : 'Welcome back'}
        </h1>
        <p className="mt-2 text-sm leading-6 text-[hsl(var(--muted-foreground))]">
          {isSignUp
            ? 'Set up your account to keep your client work moving.'
            : 'Sign in to return to your workspace.'}
        </p>

        {!isSupabaseConfigured && (
          <p role="status" className="mt-6 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-sm leading-5">
            Authentication needs configuration. Add VITE_SUPABASE_URL and
            VITE_SUPABASE_ANON_KEY to the app environment.
          </p>
        )}

        {error && (
          <p role="alert" className="mt-6 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm leading-5">
            {error}
          </p>
        )}
        {message && (
          <p role="status" className="mt-6 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm leading-5">
            {message}
          </p>
        )}

        <form onSubmit={submit} className="mt-7 space-y-4">
          <label className="block space-y-2 text-sm font-medium">
            Email
            <input
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="w-full rounded-lg border border-[hsl(var(--input))] bg-[hsl(var(--background))] px-3.5 py-3 text-sm outline-none focus:border-[hsl(var(--primary))]"
            />
          </label>
          <label className="block space-y-2 text-sm font-medium">
            Password
            <input
              type="password"
              autoComplete={isSignUp ? 'new-password' : 'current-password'}
              minLength={6}
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="w-full rounded-lg border border-[hsl(var(--input))] bg-[hsl(var(--background))] px-3.5 py-3 text-sm outline-none focus:border-[hsl(var(--primary))]"
            />
          </label>
          <button
            type="submit"
            disabled={!isSupabaseConfigured || pending}
            className="primary-button w-full justify-center disabled:cursor-not-allowed disabled:opacity-50"
          >
            {pending
              ? 'Please wait…'
              : isSignUp
                ? 'Create account'
                : 'Sign in'}
          </button>
        </form>

        <div className="my-5 flex items-center gap-3 text-xs text-[hsl(var(--muted-foreground))]">
          <span className="h-px flex-1 bg-[hsl(var(--border))]" />
          or
          <span className="h-px flex-1 bg-[hsl(var(--border))]" />
        </div>

        <button
          type="button"
          disabled={!isSupabaseConfigured || pending}
          onClick={continueWithGoogle}
          className="secondary-button w-full justify-center disabled:cursor-not-allowed disabled:opacity-50"
        >
          Continue with Google
        </button>

        <p className="mt-6 text-center text-sm text-[hsl(var(--muted-foreground))]">
          {isSignUp ? 'Already have an account?' : 'New to SyncFlow?'}{' '}
          <button
            type="button"
            onClick={() => {
              setError('');
              setMessage('');
              setLocation(isSignUp ? '/login' : '/signup');
            }}
            className="font-semibold text-[hsl(var(--primary))] hover:underline"
          >
            {isSignUp ? 'Sign in' : 'Create an account'}
          </button>
        </p>
      </section>
    </main>
  );
}
