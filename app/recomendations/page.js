'use client';

import { useRef, useState } from 'react';
import Link from 'next/link';
import gsap from 'gsap';
import Navigation from '../components/Navigation';
import Toaster from '../components/Toaster';
import LikeButton from '../components/LikeButton';
import Reveal from '../components/motion/Reveal';
import SplitLines from '../components/motion/SplitLines';
import { useLikes } from '../components/useLikes';
import { useStagePublisher } from '../components/stage';

/**
 * Your list, and what it implies.
 *
 * The previous version picked one liked film at random and re-ran an OMDb title
 * search on it, which mostly returned that film's own sequels. This sends the whole
 * list to Groq and asks what connects it.
 */
// Stable empty array: a fresh [] each render would churn the stage store.
const EMPTY = [];

export default function RecommendationsPage() {
  const { user, likedList, isLiked, toggleLike, loading } = useLikes();
  const [result, setResult] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const picksRef = useRef(null);

  useStagePublisher('list', result?.picks ?? EMPTY);

  const generate = async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/ai/recommend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          liked: likedList.map(m => ({ title: m.title, year: m.year }))
        })
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? 'Could not read your taste.');
        return;
      }
      setResult(data);

      requestAnimationFrame(() => {
        if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
        gsap.fromTo(
          picksRef.current?.querySelectorAll('[data-pick]') ?? [],
          { opacity: 0, y: 26 },
          { opacity: 1, y: 0, duration: 0.9, ease: 'expo.out', stagger: 0.06 }
        );
      });
    } catch {
      setError('Could not reach the server.');
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <>
        <Navigation />
        <main className="ch-shell grid min-h-screen place-content-center">
          <p className="ch-tag">Loading your list</p>
          <div className="ch-thinking mt-4 w-48" />
        </main>
      </>
    );
  }

  if (!user) {
    return (
      <>
        <Navigation />
        <main className="ch-shell grid min-h-screen place-content-center">
          <h1 className="ch-display max-w-[18ch]">Sign in to keep a list.</h1>
          <p className="ch-lead mt-6 max-w-[42ch]">
            Films you keep are read back as taste — the more you add, the less obvious the
            recommendations get.
          </p>
          <Link href="/" className="ch-btn ch-btn--ghost mt-10 w-fit">
            Back to search
          </Link>
        </main>
        <Toaster />
      </>
    );
  }

  return (
    <>
      <Navigation />

      <main className="pt-32">
        <section className="ch-shell">
          <div className="flex items-baseline gap-4 border-t border-hairline pt-6">
            <span className="ch-tag shrink-0">Your list</span>
            <span className="ch-tag ml-auto tabular-nums">{likedList.length} kept</span>
          </div>

          <SplitLines
            as="h1"
            onMount
            className="ch-display mt-10 max-w-[18ch]"
            lines={likedList.length ? ['What your list', 'says about you.'] : ['Nothing kept', 'yet.']}
          />

          {likedList.length === 0 ? (
            <>
              <p className="ch-lead mt-8 max-w-[44ch]">
                Search a film and press the heart. Once a few are in here, this page can read
                the thread running through them.
              </p>
              <Link href="/#search" className="ch-btn ch-btn--ember mt-10 w-fit">
                Find something
              </Link>
            </>
          ) : (
            <div className="mt-10 flex flex-wrap items-center gap-6">
              <button type="button" onClick={generate} disabled={busy} className="ch-btn ch-btn--ember">
                {busy ? 'Reading your taste…' : result ? 'Read it again' : 'Read my taste'}
              </button>
              {error && (
                <p role="alert" className="font-mono text-fine text-ember">
                  {error}
                </p>
              )}
            </div>
          )}

          {busy && <div className="ch-thinking mt-10" />}
        </section>

        {/* Recommendations ---------------------------------------------- */}
        {result && (
          <section ref={picksRef} className="ch-shell py-24">
            {result.taste && (
              <p className="ch-display max-w-[26ch] !text-[clamp(1.5rem,3.4vw,2.5rem)] border-l border-ember pl-7">
                {result.taste}
              </p>
            )}

            <div className="mt-16 flex items-baseline gap-4 border-t border-hairline pt-6">
              <span className="ch-tag shrink-0">Then try</span>
            </div>

            <ol>
              {result.picks.map((pick, index) => (
                <li key={pick.imdbId} data-pick className="group/pick border-t border-hairline">
                  <div className="flex items-start gap-5 py-7 sm:gap-10">
                    <span className="ch-num w-9 shrink-0 pt-2 text-fine text-ash-dim">
                      {String(index + 1).padStart(2, '0')}
                    </span>

                    <Link href={`/movie/${pick.imdbId}`} className="flex min-w-0 flex-1 gap-6 no-underline">
                      {pick.poster && (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img
                          src={pick.poster}
                          alt=""
                          aria-hidden="true"
                          loading="lazy"
                          className="hidden h-32 w-[5.5rem] shrink-0 object-cover grayscale transition-[filter,transform] duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover/pick:grayscale-0 group-hover/pick:scale-[1.04] sm:block"
                        />
                      )}
                      <div className="min-w-0">
                        <h2 className="ch-title !text-[clamp(1.2rem,2.5vw,1.9rem)] transition-colors duration-500 group-hover/pick:text-ember">
                          {pick.title}
                          {pick.year && <span className="ch-num ml-3 text-fine text-ash">{pick.year}</span>}
                        </h2>
                        <p className="mt-2 max-w-[48ch] text-fine text-ash">{pick.because}</p>
                        <p className="ch-tag mt-3">
                          {[
                            pick.genres?.slice(0, 2).join(' · '),
                            pick.runtime,
                            pick.imdbRating && `IMDb ${pick.imdbRating}`
                          ]
                            .filter(Boolean)
                            .join('  ·  ')}
                        </p>
                      </div>
                    </Link>

                    <LikeButton
                      liked={isLiked(pick.imdbId)}
                      onToggle={() => toggleLike(pick)}
                      title={pick.title}
                      className="mt-1"
                    />
                  </div>
                </li>
              ))}
            </ol>
          </section>
        )}

        {/* The list itself ---------------------------------------------- */}
        {likedList.length > 0 && (
          <section className="ch-shell py-24">
            <div className="flex items-baseline gap-4 border-t border-hairline pt-6">
              <span className="ch-tag shrink-0">Kept</span>
            </div>

            <Reveal variant="up" stagger="[data-kept]" className="mt-12">
              <ul className="grid gap-x-10 gap-y-8 sm:grid-cols-2 lg:grid-cols-3">
                {likedList.map(movie => (
                  <li key={movie.imdbId} data-kept className="group/kept flex items-start gap-5">
                    <Link
                      href={`/movie/${movie.imdbId}`}
                      className="flex min-w-0 flex-1 items-start gap-5 no-underline"
                    >
                      {movie.poster ? (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img
                          src={movie.poster}
                          alt=""
                          aria-hidden="true"
                          loading="lazy"
                          className="h-24 w-16 shrink-0 object-cover grayscale transition-[filter] duration-700 group-hover/kept:grayscale-0"
                        />
                      ) : (
                        <span className="h-24 w-16 shrink-0 border border-hairline" />
                      )}
                      <div className="min-w-0">
                        <h3 className="ch-title truncate !text-[clamp(1rem,1.8vw,1.2rem)] transition-colors duration-400 group-hover/kept:text-ember">
                          {movie.title}
                        </h3>
                        <p className="ch-num mt-1 text-fine text-ash">{movie.year}</p>
                      </div>
                    </Link>
                    <LikeButton liked onToggle={() => toggleLike(movie)} title={movie.title} />
                  </li>
                ))}
              </ul>
            </Reveal>

            <div className="mt-20 border-t border-hairline pt-8">
              <Link href="/" className="ch-link ch-tag">
                ← Back to search
              </Link>
            </div>
          </section>
        )}
        <div className="ch-dock-gutter" />
      </main>

      <Toaster />
    </>
  );
}
