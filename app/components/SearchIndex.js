'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import gsap from 'gsap';
import { useLikes } from './useLikes';
import LikeButton from './LikeButton';
import { useStagePublisher } from './stage';

/**
 * Search results as a typographic index rather than a grid of cards: numbered
 * rows, hairline rules, and a still that floats to the cursor on hover.
 *
 * Fully keyboard-driven — arrows move the cursor, Enter opens, L likes — so the
 * hover preview is never the only way to use it.
 */
export default function SearchIndex() {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [total, setTotal] = useState(0);
  const [state, setState] = useState('idle'); // idle | loading | done | error
  const [error, setError] = useState(null);
  const [cursor, setCursor] = useState(-1);

  const { user, isLiked, toggleLike } = useLikes();

  // `results` is replaced wholesale per search, so its identity is already stable.
  useStagePublisher('search', results);

  const previewRef = useRef(null);
  const previewImgRef = useRef(null);
  const quickRef = useRef(null);
  const listRef = useRef(null);
  const requestId = useRef(0);

  // --- fetching ----------------------------------------------------------
  const run = useCallback(async value => {
    const trimmed = value.trim();
    const id = ++requestId.current;

    if (trimmed.length < 2) {
      setResults([]);
      setTotal(0);
      setState('idle');
      setError(null);
      return;
    }

    setState('loading');
    setError(null);

    try {
      const res = await fetch(`/api/movies/search?q=${encodeURIComponent(trimmed)}`);
      const data = await res.json();
      // A slower earlier request must not overwrite a newer one's results.
      if (id !== requestId.current) return;

      if (!res.ok) {
        setError(data.error ?? 'Search failed.');
        setResults([]);
        setState('error');
        return;
      }
      setResults(data.results ?? []);
      setTotal(data.total ?? 0);
      setCursor(-1);
      setState('done');
    } catch {
      if (id !== requestId.current) return;
      setError('Could not reach the server.');
      setState('error');
    }
  }, []);

  // Search as you type, settled.
  useEffect(() => {
    const timer = setTimeout(() => run(query), 320);
    return () => clearTimeout(timer);
  }, [query, run]);

  // --- cursor-following preview ------------------------------------------
  useEffect(() => {
    const el = previewRef.current;
    if (!el) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    if (window.matchMedia('(hover: none)').matches) return;

    // quickTo keeps the follow on GSAP's ticker instead of allocating a tween per
    // mousemove, which is what makes a cursor-follower feel heavy.
    const xTo = gsap.quickTo(el, 'x', { duration: 0.55, ease: 'power3' });
    const yTo = gsap.quickTo(el, 'y', { duration: 0.55, ease: 'power3' });
    quickRef.current = { xTo, yTo };

    const onMove = event => {
      xTo(event.clientX + 28);
      yTo(event.clientY - 140);
    };

    window.addEventListener('pointermove', onMove, { passive: true });
    return () => {
      window.removeEventListener('pointermove', onMove);
      quickRef.current = null;
    };
  }, []);

  const showPreview = movie => {
    const el = previewRef.current;
    const img = previewImgRef.current;
    if (!el || !img || !quickRef.current) return;
    const src = movie.backdrop ?? movie.poster;
    if (!src) return;
    img.src = src;
    gsap.to(el, { autoAlpha: 1, scale: 1, duration: 0.5, ease: 'expo.out', overwrite: true });
  };

  const hidePreview = () => {
    const el = previewRef.current;
    if (!el || !quickRef.current) return;
    gsap.to(el, { autoAlpha: 0, scale: 0.94, duration: 0.3, ease: 'power2.out', overwrite: true });
  };

  // --- keyboard ----------------------------------------------------------
  const onKeyDown = event => {
    if (!results.length) return;

    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      const next =
        event.key === 'ArrowDown'
          ? Math.min(results.length - 1, cursor + 1)
          : Math.max(0, cursor - 1);
      setCursor(next);
      listRef.current
        ?.querySelectorAll('[data-row]')
        ?.[next]?.scrollIntoView({ block: 'nearest' });
      return;
    }

    if (event.key === 'Enter' && cursor >= 0) {
      event.preventDefault();
      router.push(`/movie/${results[cursor].imdbId}`);
      return;
    }

    if ((event.key === 'l' || event.key === 'L') && cursor >= 0 && user) {
      event.preventDefault();
      toggleLike(results[cursor]);
    }
  };

  return (
    <section id="search" className="relative scroll-mt-24">
      <div className="ch-shell">
        {/* Search line -------------------------------------------------- */}
        <div className="flex items-baseline gap-4 border-t border-hairline pt-6">
          <span className="ch-tag shrink-0">01 / Search</span>
          <span className="ch-tag ml-auto tabular-nums">
            {state === 'done' && total > 0 ? `${total} titles` : state === 'loading' ? 'Searching' : '—'}
          </span>
        </div>

        <div className="relative mt-6">
          <input
            type="search"
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Type a film — Solaris, Heat, Paddington…"
            aria-label="Search films"
            autoComplete="off"
            className="ch-field ch-display !text-[clamp(1.75rem,4vw,3.5rem)] !leading-[1.1]"
          />
          <div className="mt-1 h-px">{state === 'loading' && <div className="ch-thinking" />}</div>
        </div>

        {error && (
          <p role="alert" className="mt-6 font-mono text-fine text-ember">
            {error}
          </p>
        )}

        {state === 'done' && !results.length && query.trim().length >= 2 && (
          <p className="mt-10 ch-lead">
            Nothing for “{query.trim()}”. Try a shorter title, or the original-language one.
          </p>
        )}

        {/* Index -------------------------------------------------------- */}
        {results.length > 0 && (
          <ol ref={listRef} className="mt-12" onMouseLeave={hidePreview}>
            {results.map((movie, index) => {
              const liked = isLiked(movie.imdbId);
              return (
                <li key={movie.imdbId} data-row className="group relative">
                  <div
                    className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-hairline"
                    aria-hidden="true"
                  />
                  <div
                    className={`relative flex items-center gap-4 py-5 transition-colors duration-500 sm:gap-8 ${
                      cursor === index ? 'bg-bone/[0.04]' : ''
                    }`}
                    onMouseEnter={() => showPreview(movie)}
                  >
                    {/* Ember wash that wipes in from the left on hover. */}
                    <span
                      aria-hidden="true"
                      className="pointer-events-none absolute inset-y-0 left-0 w-full origin-left scale-x-0 bg-gradient-to-r from-ember/[0.14] to-transparent transition-transform duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-x-100"
                    />

                    <span className="ch-num relative w-9 shrink-0 text-fine text-ash-dim">
                      {String(index + 1).padStart(2, '0')}
                    </span>

                    <Link
                      href={`/movie/${movie.imdbId}`}
                      className="relative flex min-w-0 flex-1 items-baseline gap-4 no-underline"
                      onFocus={() => setCursor(index)}
                    >
                      <h3 className="ch-title min-w-0 truncate !text-[clamp(1.25rem,3vw,2.25rem)] transition-[transform,color] duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:translate-x-2 group-hover:text-ember">
                        {movie.title}
                      </h3>
                      <span className="ch-num hidden shrink-0 text-fine text-ash sm:block">
                        {movie.year}
                      </span>
                    </Link>

                    <span className="ch-num relative hidden w-12 shrink-0 text-right text-fine text-ash sm:block">
                      {movie.voteAverage ? movie.voteAverage.toFixed(1) : ''}
                    </span>

                    <LikeButton
                      liked={liked}
                      disabled={!user}
                      onToggle={() => toggleLike(movie)}
                      title={movie.title}
                    />
                  </div>
                </li>
              );
            })}
          </ol>
        )}

        {results.length > 0 && (
          <p className="ch-tag mt-8">
            ↑↓ to move · Enter to open{user ? ' · L to like' : ' · sign in to like'}
          </p>
        )}
      </div>

      {/* Floating hover still -------------------------------------------- */}
      <div
        ref={previewRef}
        aria-hidden="true"
        className="pointer-events-none fixed left-0 top-0 z-50 hidden h-[170px] w-[300px] overflow-hidden opacity-0 md:block"
        style={{ visibility: 'hidden' }}
      >
        {/* No src attribute until showPreview() sets one imperatively: an empty
            src makes the browser re-request the current page. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img ref={previewImgRef} alt="" className="h-full w-full object-cover" />
        <span className="absolute inset-0 ring-1 ring-inset ring-bone/20" />
      </div>
    </section>
  );
}
