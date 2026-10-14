'use client';

import { useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

/**
 * Trailers, from TMDB's published YouTube keys.
 *
 * Rendered as a facade: a still plus a play control, with no YouTube iframe until
 * someone actually presses play. Embedding six players on load would pull in
 * roughly a megabyte of third-party script and set cookies before anyone asked.
 * Playback uses youtube-nocookie.
 */
export default function TrailerReel({ imdbId, title }) {
  const [videos, setVideos] = useState([]);
  const [playing, setPlaying] = useState(null);
  const [loading, setLoading] = useState(true);
  const ref = useRef(null);

  useEffect(() => {
    if (!imdbId) return;
    let alive = true;

    fetch(`/api/movies/${imdbId}/videos`)
      .then(res => res.json())
      .then(data => alive && setVideos(data.videos ?? []))
      .catch(() => alive && setVideos([]))
      .finally(() => alive && setLoading(false));

    return () => {
      alive = false;
    };
  }, [imdbId]);

  useEffect(() => {
    const el = ref.current;
    if (!el || !videos.length) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    gsap.registerPlugin(ScrollTrigger);
    const ctx = gsap.context(() => {
      gsap.fromTo(
        el.querySelectorAll('[data-video]'),
        { opacity: 0, y: 24 },
        {
          opacity: 1,
          y: 0,
          duration: 0.9,
          ease: 'expo.out',
          stagger: 0.07,
          scrollTrigger: { trigger: el, start: 'top 85%', once: true }
        }
      );
      ScrollTrigger.refresh();
    }, el);
    return () => ctx.revert();
  }, [videos]);

  if (loading || !videos.length) return null;

  const [lead, ...rest] = videos;

  return (
    <section ref={ref} id="trailer" className="ch-shell scroll-mt-24 py-24 sm:py-32">
      <div className="flex items-baseline gap-4 border-t border-hairline pt-6">
        <span className="ch-tag shrink-0">Trailer</span>
        <span className="ch-tag ml-auto">YouTube</span>
      </div>

      {/* Lead trailer ------------------------------------------------- */}
      <div data-video className="mt-10">
        <div className="relative aspect-video w-full overflow-hidden bg-ink-sunken">
          {playing === lead.key ? (
            <iframe
              src={`${lead.embed}?autoplay=1&rel=0`}
              title={`${title} — ${lead.name}`}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              className="absolute inset-0 h-full w-full border-0"
            />
          ) : (
            <button
              type="button"
              onClick={() => setPlaying(lead.key)}
              className="group/play absolute inset-0 h-full w-full cursor-pointer border-0 bg-transparent p-0"
              aria-label={`Play ${lead.name}`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={lead.thumb}
                alt=""
                aria-hidden="true"
                /* hqdefault is letterboxed 4:3; crop it back to 16:9. */
                className="absolute inset-0 h-full w-full scale-[1.35] object-cover opacity-70 transition-[opacity,transform] duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover/play:opacity-90 group-hover/play:scale-[1.4]"
              />
              <span className="absolute inset-0 bg-gradient-to-t from-ink via-transparent to-transparent" />
              <span className="absolute inset-0 grid place-items-center">
                <span className="grid h-20 w-20 place-items-center rounded-full border border-bone/40 bg-ink/50 backdrop-blur-md transition-[transform,background] duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover/play:scale-110 group-hover/play:bg-ember">
                  <svg viewBox="0 0 24 24" className="ml-1 h-7 w-7 fill-bone" aria-hidden="true">
                    <path d="M8 5.5v13l11-6.5z" />
                  </svg>
                </span>
              </span>
            </button>
          )}
        </div>

        <div className="mt-4 flex flex-wrap items-baseline justify-between gap-4">
          <p className="ch-title !text-[clamp(1.05rem,2vw,1.4rem)]">{lead.name}</p>
          <a
            href={lead.url}
            target="_blank"
            rel="noreferrer noopener"
            className="ch-link ch-tag shrink-0"
          >
            Watch on YouTube ↗
          </a>
        </div>
      </div>

      {/* More clips ---------------------------------------------------- */}
      {rest.length > 0 && (
        <ul className="mt-14">
          {rest.map(video => (
            <li key={video.key} data-video className="border-t border-hairline">
              <button
                type="button"
                onClick={() => setPlaying(video.key)}
                className="group/clip flex w-full items-center gap-5 py-5 text-left sm:gap-8"
              >
                <span className="relative h-14 w-24 shrink-0 overflow-hidden bg-ink-sunken">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={video.thumb}
                    alt=""
                    aria-hidden="true"
                    loading="lazy"
                    className="absolute inset-0 h-full w-full scale-[1.35] object-cover grayscale transition-[filter] duration-500 group-hover/clip:grayscale-0"
                  />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="ch-title block truncate !text-[clamp(0.95rem,1.7vw,1.15rem)] transition-colors duration-400 group-hover/clip:text-ember">
                    {video.name}
                  </span>
                  <span className="ch-tag mt-1 block">
                    {video.type}
                    {video.official ? ' · Official' : ''}
                  </span>
                </span>
                <span
                  aria-hidden="true"
                  className="shrink-0 text-ash transition-[transform,color] duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover/clip:translate-x-1 group-hover/clip:text-ember"
                >
                  ▶
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {playing && playing !== lead.key && (
        <div className="mt-10">
          <div className="relative aspect-video w-full overflow-hidden bg-ink-sunken">
            <iframe
              src={`${videos.find(v => v.key === playing).embed}?autoplay=1&rel=0`}
              title={`${title} — ${videos.find(v => v.key === playing).name}`}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              className="absolute inset-0 h-full w-full border-0"
            />
          </div>
        </div>
      )}
    </section>
  );
}
