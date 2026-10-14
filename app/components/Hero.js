'use client';

import { useRef, useEffect } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import SplitLines from './motion/SplitLines';

/**
 * Full-viewport opening. The headline plays on mount; the backdrop and the whole
 * hero drift and dim as you scroll out of it, so leaving the hero feels like a
 * camera move rather than a page jump.
 *
 * @param {{ trending: Array<{imdbId: string, title: string, year: string|null, poster: string, backdrop: string|null}> }} props
 */
export default function Hero({ trending = [] }) {
  const sectionRef = useRef(null);
  const backdropRef = useRef(null);
  const contentRef = useRef(null);

  const backdrop = trending.find(m => m.backdrop)?.backdrop ?? null;

  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    gsap.registerPlugin(ScrollTrigger);

    const ctx = gsap.context(() => {
      // Backdrop lags the scroll and brightens slightly: classic parallax depth.
      gsap.fromTo(
        backdropRef.current,
        { yPercent: -6, scale: 1.14 },
        {
          yPercent: 10,
          scale: 1.02,
          ease: 'none',
          scrollTrigger: { trigger: section, start: 'top top', end: 'bottom top', scrub: true }
        }
      );

      // Headline sinks and fades as the next section arrives.
      gsap.to(contentRef.current, {
        yPercent: -18,
        opacity: 0,
        ease: 'none',
        scrollTrigger: { trigger: section, start: 'top top', end: '70% top', scrub: true }
      });
    }, section);

    return () => ctx.revert();
  }, []);

  return (
    <section
      ref={sectionRef}
      className="relative flex min-h-screen flex-col justify-between overflow-hidden pt-28 pb-8"
    >
      {/* Backdrop ------------------------------------------------------- */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        {backdrop && (
          <div ref={backdropRef} className="absolute inset-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={backdrop}
              alt=""
              aria-hidden="true"
              className="ch-backdrop h-full w-full object-cover"
            />
          </div>
        )}
        <div className="absolute inset-0 bg-[radial-gradient(120%_90%_at_50%_0%,transparent_10%,var(--color-ink)_75%)]" />
        <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-ink via-ink/85 to-transparent" />
      </div>

      {/* Headline ------------------------------------------------------- */}
      <div ref={contentRef} className="ch-shell relative">
        <p className="ch-tag mb-8 flex items-center gap-3">
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-ember" />
          Now hunting
        </p>

        <SplitLines
          as="h1"
          onMount
          delay={0.15}
          className="ch-colossal max-w-[22ch]"
          lines={['How it', 'feels —', 'before you', 'press play.']}
        />

        <p className="ch-lead mt-10 max-w-[46ch]">
          Search any film and read its emotional shape: a vibe meter that draws itself as you
          scroll, a spoiler-free synopsis, and exactly where to stream it tonight.
        </p>
      </div>

      {/* Scroll cue ----------------------------------------------------- */}
      <div className="ch-shell mt-10 flex items-center gap-4">
        <span className="ch-tag">Scroll</span>
        <span className="ch-sweep relative h-px flex-1 overflow-hidden bg-hairline">
          <span />
        </span>
      </div>
    </section>
  );
}
