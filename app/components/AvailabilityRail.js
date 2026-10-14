'use client';

import { useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

/**
 * Where to watch it.
 *
 * Provider rows come from TMDB's JustWatch feed, so they're factual and the model
 * never gets to invent a platform. When a region genuinely has no catalogue entry
 * the route falls back to a Groq estimate — which renders under an explicit
 * "AI estimate" heading, never mixed in with the real rows.
 */

const REGIONS = [
  ['US', 'United States'],
  ['IN', 'India'],
  ['GB', 'United Kingdom'],
  ['CA', 'Canada'],
  ['AU', 'Australia'],
  ['DE', 'Germany'],
  ['FR', 'France'],
  ['JP', 'Japan'],
  ['BR', 'Brazil']
];

const TIERS = [
  ['stream', 'Included with subscription'],
  ['free', 'Free with ads'],
  ['rent', 'Rent'],
  ['buy', 'Buy']
];

export default function AvailabilityRail({ movie, region, onRegionChange }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const ref = useRef(null);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError(null);

    fetch('/api/ai/availability', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        imdbId: movie.imdbId,
        tmdbId: movie.tmdbId,
        title: movie.title,
        year: movie.year,
        genres: movie.genres,
        runtime: movie.runtime,
        region
      })
    })
      .then(async res => {
        const payload = await res.json();
        if (!alive) return;
        if (!res.ok) {
          setError(payload.error ?? 'Could not check availability.');
          setData(null);
          return;
        }
        setData(payload);
      })
      .catch(() => alive && setError('Could not reach the server.'))
      .finally(() => alive && setLoading(false));

    return () => {
      alive = false;
    };
    // `movie` is set once from the details fetch, so its identity is stable here.
  }, [movie, region]);

  useEffect(() => {
    const el = ref.current;
    if (!el || !data) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    gsap.registerPlugin(ScrollTrigger);
    const ctx = gsap.context(() => {
      gsap.fromTo(
        el.querySelectorAll('[data-provider]'),
        { opacity: 0, y: 18 },
        {
          opacity: 1,
          y: 0,
          duration: 0.8,
          ease: 'expo.out',
          stagger: 0.05,
          scrollTrigger: { trigger: el, start: 'top 88%', once: true }
        }
      );
    }, el);
    return () => ctx.revert();
  }, [data]);

  const tiers = data ? TIERS.filter(([key]) => data[key]?.length) : [];

  return (
    <section ref={ref} id="watch" className="ch-shell scroll-mt-24 py-24 sm:py-32">
      <div className="flex flex-wrap items-baseline gap-4 border-t border-hairline pt-6">
        <span className="ch-tag shrink-0">Availability</span>

        <label className="ml-auto flex items-center gap-2">
          <span className="ch-sr">Region</span>
          <select
            value={region}
            onChange={e => onRegionChange(e.target.value)}
            className="ch-select"
          >
            {REGIONS.map(([code, label]) => (
              <option key={code} value={code}>
                {label}
              </option>
            ))}
          </select>
        </label>
      </div>

      {loading && (
        <>
          <p className="ch-lead mt-10 text-ash">Checking what&rsquo;s carrying it in {region}…</p>
          <div className="ch-thinking mt-6 max-w-sm" />
        </>
      )}

      {error && (
        <p role="alert" className="mt-10 font-mono text-fine text-ember">
          {error}
        </p>
      )}

      {data && !loading && (
        <>
          {/* Real catalogue data ------------------------------------------ */}
          {tiers.length > 0 ? (
            <dl className="mt-12 space-y-10">
              {tiers.map(([key, label]) => (
                <div key={key}>
                  <dt className="ch-tag mb-4">{label}</dt>
                  <dd className="flex flex-wrap gap-x-8 gap-y-5">
                    {data[key].map(provider => (
                      <a
                        key={`${key}-${provider.id}`}
                        data-provider
                        href={data.link}
                        target="_blank"
                        rel="noreferrer noopener"
                        className="group/p flex items-center gap-3 no-underline"
                      >
                        {provider.logo && (
                          /* eslint-disable-next-line @next/next/no-img-element */
                          <img
                            src={provider.logo}
                            alt=""
                            aria-hidden="true"
                            loading="lazy"
                            className="h-9 w-9 shrink-0 rounded-md object-cover grayscale transition-[filter,transform] duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover/p:grayscale-0 group-hover/p:scale-110"
                          />
                        )}
                        <span className="text-body transition-colors duration-400 group-hover/p:text-ember">
                          {provider.name}
                        </span>
                      </a>
                    ))}
                  </dd>
                </div>
              ))}
            </dl>
          ) : (
            <div className="mt-12">
              <p className="ch-lead max-w-[46ch]">
                {data.tmdbConfigured
                  ? `No catalogue listing in ${regionName(region)} right now.`
                  : 'Add TMDB_API_KEY to .env for real, region-accurate streaming data.'}
              </p>

              {/* AI estimate, clearly fenced off from the facts above. */}
              {data.estimate?.length > 0 && (
                <div className="mt-10 border-l border-ember/50 pl-6">
                  <p className="ch-tag text-ember">AI estimate — not verified</p>
                  <ul className="mt-4 space-y-2">
                    {data.estimate.map(item => (
                      <li key={item.name} data-provider className="flex items-baseline gap-4">
                        <span className="text-body">{item.name}</span>
                        <span className="ch-tag">
                          {item.kind} · {item.confidence} confidence
                        </span>
                      </li>
                    ))}
                  </ul>
                  {data.estimateNote && <p className="mt-4 text-fine text-ash">{data.estimateNote}</p>}
                </div>
              )}

              {data.regionsWithData?.length > 0 && (
                <p className="ch-tag mt-8">
                  Listed in {data.regionsWithData.slice(0, 12).join(' · ')}
                </p>
              )}
            </div>
          )}

          {/* Viewing note ------------------------------------------------- */}
          {(data.note || data.format) && (
            <div className="mt-16 grid gap-8 border-t border-hairline pt-10 sm:grid-cols-[1fr_auto] sm:gap-16">
              {data.note && <p className="ch-lead max-w-[48ch] italic">{data.note}</p>}
              {data.format && (
                <p className="shrink-0">
                  <span className="ch-tag block">Seek out</span>
                  <span className="ch-title mt-1 block !text-[clamp(1.1rem,2vw,1.5rem)]">
                    {data.format}
                  </span>
                </p>
              )}
            </div>
          )}

          <a
            href={data.link}
            target="_blank"
            rel="noreferrer noopener"
            className="ch-btn ch-btn--ghost mt-12"
          >
            Open in JustWatch ↗
          </a>

          <p className="ch-tag mt-6">
            {data.source === 'tmdb'
              ? 'Listings via TMDB / JustWatch'
              : data.source === 'ai-estimate'
                ? 'No catalogue data — estimate generated by Groq'
                : 'No listing data available'}
          </p>
        </>
      )}
    </section>
  );
}

const regionName = code => REGIONS.find(([c]) => c === code)?.[1] ?? code;
