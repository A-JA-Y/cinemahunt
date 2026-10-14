'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Navigation from '../../components/Navigation';
import Toaster from '../../components/Toaster';
import VibeMeter from '../../components/VibeMeter';
import AiSynopsis from '../../components/AiSynopsis';
import AvailabilityRail from '../../components/AvailabilityRail';
import AskPanel from '../../components/AskPanel';
import TrailerReel from '../../components/TrailerReel';
import PosterCrumple from '../../components/PosterCrumple';
import InsightFolder from '../../components/InsightFolder';
import ChapterRail from '../../components/ChapterRail';
import LikeButton from '../../components/LikeButton';
import Reveal from '../../components/motion/Reveal';
import SplitLines from '../../components/motion/SplitLines';
import { useLikes } from '../../components/useLikes';
import { useStagePublisher } from '../../components/stage';

const CHAPTERS = [
  ['top', 'Top'],
  ['synopsis', 'Synopsis'],
  ['trailer', 'Trailer'],
  ['watch', 'Watch'],
  ['ask', 'Ask'],
  ['credits', 'Credits']
];

export default function MovieDetailPage() {
  const { id } = useParams();

  const [movie, setMovie] = useState(null);
  const [status, setStatus] = useState('loading'); // loading | ready | error
  const [loadError, setLoadError] = useState(null);

  const [region, setRegion] = useState('US');
  const [vibe, setVibe] = useState({ data: null, loading: true, error: null });
  const [synopsis, setSynopsis] = useState({ data: null, loading: true, error: null });

  const { user, isLiked, toggleLike } = useLikes();

  // Tell Pix which film is on screen, so its facts are about this one.
  useStagePublisher(
    'detail',
    useMemo(
      () => (movie ? [{ imdbId: movie.imdbId, title: movie.title, year: movie.year }] : []),
      [movie]
    )
  );

  const heroRef = useRef(null);
  const backdropRef = useRef(null);

  // Remember the viewer's region between films.
  useEffect(() => {
    try {
      const saved = localStorage.getItem('ch:region');
      if (saved) setRegion(saved);
    } catch {
      /* private mode — the default is fine */
    }
  }, []);

  const changeRegion = next => {
    setRegion(next);
    try {
      localStorage.setItem('ch:region', next);
    } catch {
      /* ignore */
    }
  };

  // --- film details -------------------------------------------------------
  useEffect(() => {
    if (!id) return;
    let alive = true;
    setStatus('loading');

    fetch(`/api/movies/${id}`)
      .then(async res => {
        const data = await res.json();
        if (!alive) return;
        if (!res.ok) {
          setLoadError(data.error ?? 'Could not load this film.');
          setStatus('error');
          return;
        }
        setMovie(data);
        setStatus('ready');
      })
      .catch(() => {
        if (alive) {
          setLoadError('Could not reach the server.');
          setStatus('error');
        }
      });

    return () => {
      alive = false;
    };
  }, [id]);

  // --- AI passes, in parallel once details land ---------------------------
  useEffect(() => {
    if (!movie) return;
    let alive = true;

    const payload = {
      imdbId: movie.imdbId,
      title: movie.title,
      year: movie.year,
      plot: movie.plot ?? movie.overview,
      genres: movie.genres,
      director: movie.director,
      actors: movie.actors,
      runtime: movie.runtime
    };

    const load = (endpoint, set) => {
      set({ data: null, loading: true, error: null });
      fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
        .then(async res => {
          const data = await res.json();
          if (!alive) return;
          if (!res.ok) {
            set({ data: null, loading: false, error: data.error ?? 'The AI pass failed.' });
            return;
          }
          set({ data, loading: false, error: null });
          // New content means new trigger positions.
          requestAnimationFrame(() => ScrollTrigger.refresh());
        })
        .catch(() => alive && set({ data: null, loading: false, error: 'Could not reach the server.' }));
    };

    load('/api/ai/vibe', setVibe);
    load('/api/ai/synopsis', setSynopsis);

    return () => {
      alive = false;
    };
  }, [movie]);

  // --- hero parallax ------------------------------------------------------
  useEffect(() => {
    const hero = heroRef.current;
    if (!hero || status !== 'ready') return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    gsap.registerPlugin(ScrollTrigger);
    const ctx = gsap.context(() => {
      gsap.fromTo(
        backdropRef.current,
        { yPercent: -8, scale: 1.16 },
        {
          yPercent: 12,
          scale: 1,
          ease: 'none',
          scrollTrigger: { trigger: hero, start: 'top top', end: 'bottom top', scrub: true }
        }
      );
    }, hero);
    return () => ctx.revert();
  }, [status]);

  if (status === 'loading') {
    return (
      <>
        <Navigation />
        <main className="ch-shell grid min-h-screen place-content-center">
          <p className="ch-tag">Loading</p>
          <div className="ch-thinking mt-4 w-48" />
        </main>
      </>
    );
  }

  if (status === 'error') {
    return (
      <>
        <Navigation />
        <main className="ch-shell grid min-h-screen place-content-center text-center">
          <p className="ch-title">{loadError}</p>
          <Link href="/" className="ch-btn ch-btn--ghost mx-auto mt-8">
            Back to search
          </Link>
        </main>
        <Toaster />
      </>
    );
  }

  const liked = isLiked(movie.imdbId);
  const meta = [movie.year, movie.rated, movie.runtime, movie.genres?.join(' · ')].filter(Boolean);

  return (
    <>
      <Navigation />
      <ChapterRail chapters={CHAPTERS} />

      <main>
        {/* Title card -------------------------------------------------- */}
        <section
          id="top"
          ref={heroRef}
          className="relative flex min-h-[92vh] flex-col justify-end overflow-hidden pb-16 pt-32"
        >
          <div className="pointer-events-none absolute inset-0 -z-10">
            {movie.backdrop && (
              <div ref={backdropRef} className="absolute inset-0">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={movie.backdrop} alt="" aria-hidden="true" className="ch-backdrop h-full w-full object-cover" />
              </div>
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-ink via-ink/75 to-ink/40" />
            <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-ink to-transparent" />
          </div>

          <div className="ch-shell">
            <SplitLines
              as="h1"
              onMount
              className="ch-colossal max-w-[16ch] !text-[clamp(2.5rem,9vw,8rem)]"
              lines={titleLines(movie.title)}
            />

            <Reveal variant="fade" delay={0.5} className="mt-10 flex flex-wrap items-center gap-x-6 gap-y-4">
              <p className="ch-num text-fine text-ash">{meta.join('  ·  ')}</p>

              <div className="ml-auto flex items-center gap-6">
                {movie.imdbRating && (
                  <span className="ch-num text-fine">
                    <span className="text-ash">IMDb</span> {movie.imdbRating}
                  </span>
                )}
                {movie.ratings?.rottenTomatoes && (
                  <span className="ch-num text-fine">
                    <span className="text-ash">RT</span> {movie.ratings.rottenTomatoes}
                  </span>
                )}
                <LikeButton
                  liked={liked}
                  disabled={!user}
                  onToggle={() => toggleLike(movie)}
                  title={movie.title}
                />
              </div>
            </Reveal>

            {(movie.overview || movie.plot) && (
              <Reveal variant="up" delay={0.6}>
                <p className="ch-lead mt-8 max-w-[52ch]">{movie.overview ?? movie.plot}</p>
              </Reveal>
            )}

            <Reveal variant="fade" delay={0.75} className="mt-10 flex flex-wrap gap-4">
              <a href="#watch" className="ch-btn ch-btn--ember">
                Where to watch
              </a>
              <a href="#ask" className="ch-btn ch-btn--ghost">
                Ask about it
              </a>
            </Reveal>
          </div>
        </section>

        {/* The scroll-driven vibe meter -------------------------------- */}
        <VibeMeter vibe={vibe.data} loading={vibe.loading} error={vibe.error} />

        <AiSynopsis
          synopsis={synopsis.data}
          loading={synopsis.loading}
          error={synopsis.error}
          officialPlot={movie.plot}
        />

        <TrailerReel imdbId={movie.imdbId} title={movie.title} />

        {/* Poster toy + pocket notes ----------------------------------- */}
        <section className="ch-shell py-24 sm:py-32">
          <div className="flex items-baseline gap-4 border-t border-hairline pt-6">
            <span className="ch-tag shrink-0">The artefact</span>
            <span className="ch-tag ml-auto hidden sm:block">Hold · drag · release</span>
          </div>
          <div className="mt-10 grid items-center gap-16 lg:grid-cols-2">
            <PosterCrumple poster={movie.poster} title={movie.title} />
            <InsightFolder vibe={vibe.data} synopsis={synopsis.data} movie={movie} />
          </div>
        </section>

        <AvailabilityRail movie={movie} region={region} onRegionChange={changeRegion} />

        <AskPanel movie={movie} />

        {/* Credits ----------------------------------------------------- */}
        <section id="credits" className="ch-shell scroll-mt-24 py-24 sm:py-32">
          <div className="flex items-baseline gap-4 border-t border-hairline pt-6">
            <span className="ch-tag shrink-0">Credits</span>
          </div>

          <Reveal variant="up" stagger="[data-credit]" className="mt-12">
            <dl className="grid gap-x-16 gap-y-8 sm:grid-cols-2">
              {[
                ['Directed by', movie.director],
                ['Written by', movie.writers?.join(', ')],
                ['Starring', movie.actors?.join(', ')],
                ['Released', movie.released],
                ['Language', movie.language],
                ['Country', movie.country],
                ['Box office', movie.boxOffice],
                ['Awards', movie.awards]
              ]
                .filter(([, value]) => value)
                .map(([label, value]) => (
                  <div key={label} data-credit className="border-t border-hairline pt-4">
                    <dt className="ch-tag">{label}</dt>
                    <dd className="mt-2 text-body">{value}</dd>
                  </div>
                ))}
            </dl>
          </Reveal>

          <div className="mt-20 flex flex-wrap items-center justify-between gap-6 border-t border-hairline pt-8">
            <Link href="/" className="ch-link ch-tag">
              ← Back to search
            </Link>
            <a
              href={`https://www.imdb.com/title/${movie.imdbId}/`}
              target="_blank"
              rel="noreferrer noopener"
              className="ch-link ch-tag"
            >
              IMDb ↗
            </a>
          </div>
        </section>
        <div className="ch-dock-gutter" />
      </main>

      <Toaster />
    </>
  );
}

/**
 * Break a title across display lines without orphaning a single short word.
 * Long titles set at 8vw need authored breaks or they overflow the measure.
 */
function titleLines(title) {
  const words = title.split(/\s+/);
  if (words.length <= 2) return [title];

  const lines = [];
  let current = '';
  for (const word of words) {
    if (current && (current + ' ' + word).length > 14) {
      lines.push(current);
      current = word;
    } else {
      current = current ? `${current} ${word}` : word;
    }
  }
  if (current) lines.push(current);
  return lines;
}
