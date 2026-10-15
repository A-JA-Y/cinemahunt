'use client';

import { useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

/**
 * First-load curtain.
 *
 * Rendered in the server HTML rather than mounted by React, so it covers the page
 * from the very first paint instead of flashing the hero and then hiding it. Three
 * things can take it away:
 *
 *   - the normal path: this component counts up, then wipes it off
 *   - reduced motion: the BOOT script in layout.js hides it before paint
 *   - JS never runs: a pure-CSS failsafe retires it after 6s (see globals.css)
 *
 * The counter is honest about readiness — it eases toward 100 but will not arrive
 * until fonts and the load event are both done, with a floor so a warm cache
 * doesn't produce a 200ms flicker.
 *
 * Once it has lifted it unmounts through state, so React removes the node itself.
 * It must never be pulled out of the DOM by hand: it is the first child React owns
 * in <body>, and Next.js inserts its streaming-metadata <div hidden> in front of it
 * on every client navigation. Against a node that is no longer there, that
 * insertBefore() throws, which took down every film link with "Application error:
 * a client-side exception has occurred".
 */

const MIN_MS = 1100; // never shorter than this, or it reads as a glitch
const MAX_MS = 3600; // never longer than this, however slow the network is

export default function Preloader() {
  const rootRef = useRef(null);
  const [retired, setRetired] = useState(false);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    // Already hidden before paint (reduced motion, or seen this session).
    if (document.documentElement.dataset.preloaded === 'true') {
      setRetired(true);
      return;
    }

    gsap.registerPlugin(ScrollTrigger);

    const counter = root.querySelector('[data-count]');
    const bar = root.querySelector('[data-bar]');
    const inner = root.querySelector('[data-inner]');
    const ring = root.querySelector('[data-ring]');

    // Hold the page still while the curtain is up.
    document.documentElement.style.overflow = 'hidden';

    const state = { value: 0 };
    const started = performance.now();
    let settled = false;
    let killed = false;

    // Real readiness, not a fake timer.
    const ready = Promise.all([
      document.fonts?.ready ?? Promise.resolve(),
      document.readyState === 'complete'
        ? Promise.resolve()
        : new Promise(resolve => window.addEventListener('load', resolve, { once: true }))
    ]);
    ready.then(() => {
      settled = true;
    });

    const ringLength = ring?.getTotalLength?.() ?? 0;
    if (ring && ringLength) {
      gsap.set(ring, { strokeDasharray: ringLength, strokeDashoffset: ringLength });
    }

    const tween = gsap.to(state, {
      value: 100,
      duration: MAX_MS / 1000,
      ease: 'power2.out',
      onUpdate: () => {
        const elapsed = performance.now() - started;
        // Park just short of 100 until the page is genuinely ready, so the number
        // never claims to be done before it is.
        const ceiling = settled && elapsed >= MIN_MS ? 100 : 96;
        const shown = Math.min(state.value, ceiling);

        if (counter) counter.textContent = String(Math.round(shown)).padStart(3, '0');
        if (bar) gsap.set(bar, { scaleX: shown / 100 });
        if (ring && ringLength) gsap.set(ring, { strokeDashoffset: ringLength * (1 - shown / 100) });

        if (shown >= 100 && !killed) {
          killed = true;
          tween.kill();
          exit();
        }
      }
    });

    // Belt and braces: if readiness never resolves, leave anyway.
    const bail = setTimeout(() => {
      if (!killed) {
        killed = true;
        tween.kill();
        exit();
      }
    }, MAX_MS + 600);

    let exitTimeline = null;

    function exit() {
      clearTimeout(bail);

      exitTimeline = gsap
        .timeline({
          onComplete: () => {
            document.documentElement.style.overflow = '';
            setRetired(true);
            // The page laid out under a locked scrollbar; re-measure before any
            // pinned section computes its start position.
            ScrollTrigger.refresh();
          }
        })
        // Contents leave first, so the curtain is empty as it lifts.
        .to(inner, { opacity: 0, y: -28, duration: 0.5, ease: 'power2.in' })
        // Then the curtain itself wipes up off the page.
        .to(root, { clipPath: 'inset(0 0 100% 0)', duration: 0.9, ease: 'expo.inOut' }, '-=0.15');

      try {
        sessionStorage.setItem('ch:preloaded', '1');
      } catch {
        /* private mode — it will simply play again next load */
      }
    }

    return () => {
      clearTimeout(bail);
      tween.kill();
      exitTimeline?.kill();
      document.documentElement.style.overflow = '';
    };
  }, []);

  if (retired) return null;

  return (
    <div ref={rootRef} className="ch-preloader" aria-hidden="true">
      <div data-inner className="ch-preloader-inner">
        {/* The aperture mark, drawing itself as the counter climbs. */}
        <svg viewBox="0 0 120 120" className="ch-preloader-mark">
          <circle cx="60" cy="60" r="46" className="ch-preloader-track" />
          <circle
            data-ring
            cx="60"
            cy="60"
            r="46"
            className="ch-preloader-ring"
            transform="rotate(-90 60 60)"
          />
          <circle cx="60" cy="60" r="13" className="ch-preloader-iris" />
          <g className="ch-preloader-blades">
            <path d="M60 32 V43" />
            <path d="M84 46 L74.5 51.5" />
            <path d="M84 74 L74.5 68.5" />
            <path d="M60 88 V77" />
            <path d="M36 74 L45.5 68.5" />
            <path d="M36 46 L45.5 51.5" />
          </g>
        </svg>

        <p className="ch-preloader-word">
          Cinema<span>Hunt</span>
        </p>
        <p className="ch-preloader-sub">How a film feels, before you press play</p>
      </div>

      <div className="ch-preloader-foot">
        <span className="ch-tag">Threading the projector</span>
        <span className="ch-preloader-bar">
          <span data-bar />
        </span>
        <span data-count className="ch-preloader-count">
          000
        </span>
      </div>
    </div>
  );
}
