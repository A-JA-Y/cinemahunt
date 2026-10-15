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

  // Keep the event so the button below can open the browser's install dialog.
  //
  // No preventDefault(): all it does is suppress the browser's own install UI,
  // and Chrome then logs "Banner not shown: beforeinstallpromptevent.
  // preventDefault() called" on every visit where nobody presses Install. The
  // in-page banner is limited to mouse-driven browsers, where Chrome's only
  // install UI is the address-bar icon; phones keep their native install prompt
  // rather than getting two at once.
  useEffect(() => {
    if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;

    const onPrompt = event => {
      setInstallPrompt(event);
      try {
        setDismissed(localStorage.getItem('ch:install-dismissed') === '1');
      } catch {
        setDismissed(false);
      }
    };
    const onInstalled = () => setInstallPrompt(null);

    window.addEventListener('beforeinstallprompt', onPrompt);
    window.addEventListener('appinstalled', onInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt);
      window.removeEventListener('appinstalled', onInstalled);
    };
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
            try {
              await installPrompt.prompt();
              await installPrompt.userChoice;
            } catch {
              /* Already used, or the browser withdrew it — nothing to show. */
            }
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
