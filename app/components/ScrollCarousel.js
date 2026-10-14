'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import FlexCarousel from './reactbits/FlexCarousel';
import { texture } from '../lib/img';
import { useStagePublisher } from './stage';

/**
 * The trending carousel, advanced by scroll instead of a timer.
 *
 * The panel pins and scroll progress maps onto the carousel's index, so scrolling
 * walks the ten posters one at a time and scrolling back walks them in reverse.
 *
 * FlexCarousel has no controlled-index prop, but its container listens for
 * ArrowLeft/ArrowRight keydown and steps exactly one item per press. Dispatching
 * those at the container is therefore a supported path through its own logic
 * rather than a reach into its internals — and it keeps the component's easing,
 * wrapping and WebGL state intact.
 *
 * @param {{ trending: Array<object> }} props
 */

const COUNT = 10;

export default function ScrollCarousel({ trending = [] }) {
  const router = useRouter();
  const sectionRef = useRef(null);
  const pinRef = useRef(null);
  const hostRef = useRef(null);

  // The carousel's real index, kept current by its onChange.
  const indexRef = useRef(0);
  const [display, setDisplay] = useState(0);

  const items = useMemo(
    () =>
      trending
        .filter(m => m.poster)
        .slice(0, COUNT)
        .map(m => ({
          src: texture(m.poster),
          alt: `${m.title} poster`,
          title: m.title,
          subtitle: m.year ?? '',
          imdbId: m.imdbId
        })),
    [trending]
  );

  // Publish the source records, not the carousel items — those carry the year as
  // `subtitle` for the caption, which is not the shape the stage store reads.
  const onStage = useMemo(
    () => trending.slice(0, COUNT).map(m => ({ imdbId: m.imdbId, title: m.title, year: m.year })),
    [trending]
  );
  useStagePublisher('trending', onStage);

  useEffect(() => {
    const section = sectionRef.current;
    if (!section || items.length < 2) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    gsap.registerPlugin(ScrollTrigger);

    const drive = target => {
      const host = hostRef.current?.querySelector('.flex-carousel');
      if (!host) return;

      // Walk the difference, not the shortest wrapped path: scrolling down must
      // always read forwards through the row, never jump backwards past the end.
      const diff = target - indexRef.current;
      if (!diff) return;

      const key = diff > 0 ? 'ArrowRight' : 'ArrowLeft';
      for (let i = 0; i < Math.abs(diff); i++) {
        host.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }));
      }
      indexRef.current = target;
      setDisplay(target);
    };

    const ctx = gsap.context(() => {
      ScrollTrigger.create({
        trigger: section,
        start: 'top top',
        // One viewport-ish of scroll per poster, so stepping feels deliberate.
        end: () => `+=${items.length * (window.innerWidth < 640 ? 45 : 65)}%`,
        pin: pinRef.current,
        anticipatePin: 1,
        scrub: false,
        invalidateOnRefresh: true,
        onUpdate: self => {
          // 0.999 keeps progress === 1 from landing one index past the end.
          drive(Math.min(items.length - 1, Math.floor(self.progress * items.length * 0.999)));
        }
      });
    }, section);

    return () => ctx.revert();
  }, [items]);

  if (!items.length) {
    return (
      <section className="ch-shell py-20">
        <p className="ch-tag border-t border-hairline pt-5">
          Add TMDB_API_KEY to .env to stream trending posters through here
        </p>
      </section>
    );
  }

  const open = item => {
    if (item?.imdbId) router.push(`/movie/${item.imdbId}`);
  };

  return (
    <section ref={sectionRef} className="relative">
      <div ref={pinRef} className="flex min-h-screen flex-col justify-center py-20">
        <div className="ch-shell mb-6 flex items-end justify-between gap-6">
          <span className="ch-tag">Trending this week</span>
          <span className="ch-tag hidden sm:block">Scroll to advance · click to open</span>
          <span className="ch-num shrink-0 text-fine text-ash tabular-nums">
            <span className="text-bone">{String(display + 1).padStart(2, '0')}</span>
            <span className="mx-1 text-ash-dim">/</span>
            {String(items.length).padStart(2, '0')}
          </span>
        </div>

        <div ref={hostRef} className="relative h-[clamp(260px,42vh,460px)] w-full">
          <FlexCarousel
            items={items}
            preset="liquid"
            intro="rise"
            cardHeight={0.62}
            gap={14}
            squeeze={0.2}
            radius={0}
            fit="natural"
            captions
            focusOnClick={false}
            autoplay={false}
            /* Scroll drives the index now; letting the canvas eat wheel events
               would fight the pin and strand the page here. */
            captureWheel={false}
            onChange={index => {
              indexRef.current = index;
              setDisplay(index);
            }}
            onSelect={(_index, item) => open(item)}
          />
        </div>

        {/* Ten ticks, filling as you walk the row. */}
        <div className="ch-shell mt-7 flex items-center gap-1.5">
          {items.map((item, i) => (
            <span
              key={item.imdbId ?? i}
              aria-hidden="true"
              className={`h-px flex-1 transition-[background,transform] duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] ${
                i <= display ? 'origin-left scale-y-[3] bg-ember' : 'bg-hairline'
              }`}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
