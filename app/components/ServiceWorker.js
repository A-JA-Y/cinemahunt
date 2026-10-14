'use client';

import { useEffect, useState } from 'react';

/**
 * Registers the service worker and offers the install prompt.
 *
 * Registration is deliberately skipped in development: a cached shell makes every
 * code change look like it did not apply.
 */
export default function ServiceWorker() {
  const [installPrompt, setInstallPrompt] = useState(null);
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    if (process.env.NODE_ENV !== 'production') return;
    if (!('serviceWorker' in navigator)) return;

    // After load, so registration never competes with the first render.
    const register = () => {
      navigator.serviceWorker.register('/sw.js').catch(() => {
        /* An unsupported or blocked SW is not worth surfacing. */
      });
    };

    if (document.readyState === 'complete') register();
    else window.addEventListener('load', register, { once: true });

    return () => window.removeEventListener('load', register);
  }, []);

  // Chrome fires this instead of showing its own install UI once we preventDefault.
  useEffect(() => {
    const onPrompt = event => {
      event.preventDefault();
      setInstallPrompt(event);
      try {
        setDismissed(localStorage.getItem('ch:install-dismissed') === '1');
      } catch {
        setDismissed(false);
      }
    };
    window.addEventListener('beforeinstallprompt', onPrompt);
    return () => window.removeEventListener('beforeinstallprompt', onPrompt);
  }, []);

  const dismiss = () => {
    setDismissed(true);
    try {
      localStorage.setItem('ch:install-dismissed', '1');
    } catch {
      /* ignore */
    }
  };

  if (!installPrompt || dismissed) return null;

  return (
    <div className="ch-install" role="dialog" aria-label="Install CinemaHunt">
      <p className="ch-tag">Install</p>
      <p className="mt-1 text-fine">Keep CinemaHunt one tap away, with your list offline.</p>
      <div className="mt-4 flex gap-3">
        <button
          type="button"
          className="ch-btn ch-btn--ember !px-4 !py-2 !text-micro"
          onClick={async () => {
            installPrompt.prompt();
            await installPrompt.userChoice;
            setInstallPrompt(null);
            dismiss();
          }}
        >
          Add to home screen
        </button>
        <button type="button" onClick={dismiss} className="ch-tag ch-link">
          Not now
        </button>
      </div>
    </div>
  );
}
