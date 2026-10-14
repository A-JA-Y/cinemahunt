'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { useStage } from './stage';

/**
 * PIX — a small cyborg perched on the dock.
 *
 * It watches the cursor (pupils track it, the head leans a little, the whole
 * thing is on one gsap.quickTo set so it glides rather than snaps) and tells you
 * things about whichever films are currently on the page.
 *
 * It speaks once on its own after settling, then only when asked, and it can be
 * switched off for good. A character that interrupts is a character you mute.
 */

const EYE_RANGE = 2.6; // px of pupil travel inside the socket
const HEAD_RANGE = 3.2; // px of head lean
const REACH = 520; // px at which tracking saturates
const FIRST_SPEAK_DELAY = 9000;

export default function CyborgBot() {
  const movies = useStage();

  const rootRef = useRef(null);
  const headRef = useRef(null);
  const leftPupilRef = useRef(null);
  const rightPupilRef = useRef(null);
  const quickRef = useRef(null);

  const [bubble, setBubble] = useState(null); // { title, fact }
  const [busy, setBusy] = useState(false);
  const [muted, setMuted] = useState(false);
  const [ready, setReady] = useState(false);

  // Facts already fetched, and the ones already said, so it never repeats itself.
  const cacheRef = useRef(new Map());
  const saidRef = useRef(new Set());
  const spokeForRef = useRef(null);

  // --- mute preference ----------------------------------------------------
  useEffect(() => {
    try {
      setMuted(localStorage.getItem('ch:bot-muted') === '1');
    } catch {
      /* private mode — default to on */
    }
    setReady(true);
  }, []);

  const mute = () => {
    setMuted(true);
    setBubble(null);
    try {
      localStorage.setItem('ch:bot-muted', '1');
    } catch {
      /* ignore */
    }
  };

  // --- cursor tracking ----------------------------------------------------
  useEffect(() => {
    if (!ready || muted) return;
    const root = rootRef.current;
    if (!root) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    if (window.matchMedia('(hover: none)').matches) return;

    const make = (el, prop) => gsap.quickTo(el, prop, { duration: 0.5, ease: 'power3' });
    const q = {
      headX: make(headRef.current, 'x'),
      headY: make(headRef.current, 'y'),
      lx: make(leftPupilRef.current, 'x'),
      ly: make(leftPupilRef.current, 'y'),
      rx: make(rightPupilRef.current, 'x'),
      ry: make(rightPupilRef.current, 'y')
    };
    quickRef.current = q;

    const onMove = event => {
      const box = root.getBoundingClientRect();
      const cx = box.left + box.width / 2;
      const cy = box.top + box.height / 2;

      // Normalise to -1..1 and soften with a square root so the eyes keep
      // responding to small movements near the bot instead of pinning.
      const soften = v => Math.sign(v) * Math.sqrt(Math.min(1, Math.abs(v)));
      const nx = soften((event.clientX - cx) / REACH);
      const ny = soften((event.clientY - cy) / REACH);

      q.lx(nx * EYE_RANGE);
      q.ly(ny * EYE_RANGE);
      q.rx(nx * EYE_RANGE);
      q.ry(ny * EYE_RANGE);
      q.headX(nx * HEAD_RANGE);
      q.headY(ny * HEAD_RANGE * 0.6);
    };

    window.addEventListener('pointermove', onMove, { passive: true });
    return () => {
      window.removeEventListener('pointermove', onMove);
      quickRef.current = null;
    };
  }, [ready, muted]);

  // --- idle blink ---------------------------------------------------------
  useEffect(() => {
    if (!ready || muted) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const root = rootRef.current;
    if (!root) return;

    // Irregular timing — a metronome blink reads as a loading spinner.
    let timer;
    const blink = () => {
      root.dataset.blink = 'true';
      setTimeout(() => {
        if (rootRef.current) rootRef.current.dataset.blink = 'false';
      }, 130);
      timer = setTimeout(blink, 2600 + Math.random() * 4200);
    };
    timer = setTimeout(blink, 1800);
    return () => clearTimeout(timer);
  }, [ready, muted]);

  // --- facts --------------------------------------------------------------
  const speak = useCallback(async () => {
    if (busy || !movies.length) return;

    setBusy(true);
    try {
      // Prefer a film we have no facts for yet, so it works across the page.
      const pool = movies.filter(m => !cacheRef.current.has(key(m)));
      const movie = (pool.length ? pool : movies)[Math.floor(Math.random() * (pool.length || movies.length))];
      const id = key(movie);

      let facts = cacheRef.current.get(id);
      if (!facts) {
        const res = await fetch('/api/ai/fact', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title: movie.title, year: movie.year, imdbId: movie.imdbId })
        });
        const data = await res.json();
        if (!res.ok || !data.facts?.length) {
          setBubble({ title: null, fact: 'My trivia feed just went quiet. Try me again?' });
          return;
        }
        facts = data.facts;
        cacheRef.current.set(id, facts);
      }

      const unsaid = facts.filter(f => !saidRef.current.has(f));
      const fact = (unsaid.length ? unsaid : facts)[
        Math.floor(Math.random() * (unsaid.length || facts.length))
      ];
      saidRef.current.add(fact);

      setBubble({ title: movie.title, fact });
    } catch {
      setBubble({ title: null, fact: 'Lost my connection for a second there.' });
    } finally {
      setBusy(false);
    }
  }, [busy, movies]);

  // Speak once, unprompted, after the page has settled — then stay quiet until
  // asked. Re-arms when the page's films change (a new film, a new search).
  useEffect(() => {
    if (muted || !movies.length) return;
    const signature = movies.map(m => m.title).join('|');
    if (spokeForRef.current === signature) return;

    const timer = setTimeout(() => {
      spokeForRef.current = signature;
      speak();
    }, FIRST_SPEAK_DELAY);

    return () => clearTimeout(timer);
    // `speak` changes identity with every render; the signature guard is what
    // actually controls whether this fires.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [movies, muted]);

  // Animate the bubble in, and let Escape dismiss it.
  useEffect(() => {
    if (!bubble) return;
    if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      gsap.fromTo(
        '.ch-bot-bubble',
        { opacity: 0, y: 8, scale: 0.96 },
        { opacity: 1, y: 0, scale: 1, duration: 0.5, ease: 'expo.out' }
      );
    }
    const onKey = event => event.key === 'Escape' && setBubble(null);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [bubble]);

  if (!ready || muted) return null;

  const hasMovies = movies.length > 0;

  return (
    <div className="ch-bot-row">
      {bubble && (
        <div className="ch-bot-bubble" role="status">
          {bubble.title && <p className="ch-tag mb-1.5">{bubble.title}</p>}
          <p className="text-fine leading-relaxed">{bubble.fact}</p>
          <div className="mt-3 flex items-center gap-4">
            <button type="button" onClick={speak} disabled={busy} className="ch-tag ch-link">
              {busy ? 'thinking…' : 'another'}
            </button>
            <button type="button" onClick={() => setBubble(null)} className="ch-tag ch-link">
              close
            </button>
            <button type="button" onClick={mute} className="ch-tag ch-link ml-auto opacity-60">
              mute pix
            </button>
          </div>
        </div>
      )}

      <button
        ref={rootRef}
        type="button"
        data-blink="false"
        data-busy={busy ? 'true' : 'false'}
        onClick={speak}
        disabled={!hasMovies}
        className="ch-bot"
        aria-label={
          hasMovies
            ? 'Pix the cyborg — tell me something about the films on this page'
            : 'Pix the cyborg — nothing to talk about yet'
        }
        title={hasMovies ? 'Ask Pix for a fact' : 'Pix has nothing to say yet'}
      >
        <svg viewBox="0 0 64 64" className="ch-bot-svg" aria-hidden="true">
          <g ref={headRef}>
            {/* antenna */}
            <line x1="32" y1="14" x2="32" y2="7" className="ch-bot-stroke" />
            <circle cx="32" cy="5" r="2.6" className="ch-bot-led" />

            {/* head */}
            <rect x="12" y="14" width="40" height="32" rx="12" className="ch-bot-shell" />

            {/* the cyborg seam: the right side of the face is plated */}
            <path d="M38 14.6 v30.8" className="ch-bot-seam" />
            <rect x="41" y="20" width="4" height="2" rx="1" className="ch-bot-plate" />
            <rect x="41" y="24" width="7" height="2" rx="1" className="ch-bot-plate" />

            {/* visor */}
            <rect x="17" y="21" width="30" height="17" rx="8.5" className="ch-bot-visor" />

            {/* organic eye */}
            <g className="ch-bot-eye">
              <circle cx="25" cy="29.5" r="4.6" className="ch-bot-eye-white" />
              <circle ref={leftPupilRef} cx="25" cy="29.5" r="2.4" className="ch-bot-pupil" />
            </g>

            {/* cyber eye: ring + pupil */}
            <g className="ch-bot-eye">
              <circle cx="39" cy="29.5" r="4.6" className="ch-bot-eye-white" />
              <circle cx="39" cy="29.5" r="4.6" className="ch-bot-ring" />
              <circle ref={rightPupilRef} cx="39" cy="29.5" r="1.9" className="ch-bot-pupil-cyber" />
            </g>

            {/* mouth — animates while it is talking */}
            <rect x="28" y="40.5" width="8" height="2" rx="1" className="ch-bot-mouth" />

            {/* ears */}
            <rect x="8" y="26" width="4" height="9" rx="2" className="ch-bot-plate" />
            <rect x="52" y="26" width="4" height="9" rx="2" className="ch-bot-plate" />
          </g>
        </svg>

        {/* Something to say, and it hasn't yet. */}
        {hasMovies && !bubble && <span className="ch-bot-ping" aria-hidden="true" />}
      </button>
    </div>
  );
}

const key = movie => movie.imdbId || `${movie.title}:${movie.year ?? ''}`;
