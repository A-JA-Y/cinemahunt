'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut
} from 'firebase/auth';
import gsap from 'gsap';
import { auth } from '../FireBase';
import { useLikes } from './useLikes';
import { toast } from './toast';
import Dock from './Dock';

/**
 * Navigation is split in two: a slim wordmark bar at the top that only carries
 * identity, and the dock at the bottom that carries every action. Nothing lives
 * in both places.
 */
export default function Navigation() {
  const { user } = useLikes();
  const [authOpen, setAuthOpen] = useState(false);
  const barRef = useRef(null);

  // Frost the bar once you leave the top of the page.
  useEffect(() => {
    const el = barRef.current;
    if (!el) return;
    const onScroll = () => {
      el.dataset.past = window.scrollY > 80 ? 'true' : 'false';
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <>
      <header ref={barRef} data-past="false" className="ch-dock fixed inset-x-0 top-0 z-[75]">
        <div className="ch-shell flex items-center gap-6 py-4">
          <Link href="/" className="font-mono text-fine tracking-[0.3em] uppercase no-underline">
            Cinema<span className="text-ember">Hunt</span>
          </Link>

          {user && (
            <div className="ml-auto flex items-center gap-6">
              <span className="ch-tag hidden max-w-[16rem] truncate sm:block">{user.email}</span>
              <button
                type="button"
                onClick={async () => {
                  await signOut(auth);
                  toast('Signed out.');
                }}
                className="ch-tag ch-link"
              >
                Sign out
              </button>
            </div>
          )}
        </div>
        <div className="ch-rule" />
      </header>

      <Dock onSignIn={() => setAuthOpen(v => !v)} />

      {authOpen && !user && <AuthPanel onDone={() => setAuthOpen(false)} />}
    </>
  );
}

function AuthPanel({ onDone }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const ref = useRef(null);

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    gsap.fromTo(
      ref.current,
      { yPercent: -100, opacity: 0 },
      { yPercent: 0, opacity: 1, duration: 0.7, ease: 'expo.out' }
    );
  }, []);

  // Escape closes it, like any other transient panel.
  useEffect(() => {
    const onKey = event => event.key === 'Escape' && onDone();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onDone]);

  const run = async mode => {
    setBusy(true);
    setError(null);
    try {
      if (mode === 'signup') await createUserWithEmailAndPassword(auth, email, password);
      else await signInWithEmailAndPassword(auth, email, password);
      toast(mode === 'signup' ? 'Account created.' : 'Welcome back.');
      onDone();
    } catch (err) {
      setError(friendly(err?.code) ?? 'That did not work.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      ref={ref}
      className="fixed inset-x-0 top-[57px] z-[76] border-b border-hairline bg-ink/95 backdrop-blur-xl"
    >
      <form
        className="ch-shell grid gap-6 py-10 sm:grid-cols-[1fr_1fr_auto] sm:items-end"
        onSubmit={e => {
          e.preventDefault();
          run('login');
        }}
      >
        <div>
          <label htmlFor="auth-email" className="ch-tag">
            Email
          </label>
          <input
            id="auth-email"
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            className="ch-field !text-body"
          />
        </div>
        <div>
          <label htmlFor="auth-password" className="ch-tag">
            Password
          </label>
          <input
            id="auth-password"
            type="password"
            required
            minLength={6}
            autoComplete="current-password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            className="ch-field !text-body"
          />
        </div>
        <div className="flex gap-3">
          <button type="submit" disabled={busy} className="ch-btn ch-btn--ember">
            {busy ? '…' : 'Sign in'}
          </button>
          <button type="button" disabled={busy} onClick={() => run('signup')} className="ch-btn ch-btn--ghost">
            Create
          </button>
        </div>

        {error && (
          <p role="alert" className="font-mono text-fine text-ember sm:col-span-3">
            {error}
          </p>
        )}
        <p className="ch-tag sm:col-span-3">
          An account only stores the films you keep, so your list and recommendations survive.
        </p>
      </form>
    </div>
  );
}

// Firebase error codes are not for humans.
function friendly(code) {
  const map = {
    'auth/invalid-email': 'That email address is not valid.',
    'auth/invalid-credential': 'Wrong email or password.',
    'auth/wrong-password': 'Wrong email or password.',
    'auth/user-not-found': 'No account with that email — create one.',
    'auth/email-already-in-use': 'That email already has an account — sign in.',
    'auth/weak-password': 'Use at least six characters.',
    'auth/too-many-requests': 'Too many attempts. Wait a moment.',
    'auth/network-request-failed': 'Network problem. Check your connection.'
  };
  return map[code];
}
