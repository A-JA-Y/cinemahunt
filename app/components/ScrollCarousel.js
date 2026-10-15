'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import FlexCarousel from './reactbits/FlexCarousel';
import { texture } from '../lib/img';
import { useStagePublisher } from './stage';
import { useLenis } from './motion/SmoothScroll';

/**
 * The trending carousel, advanced by scroll instead of a timer.
 *
 * The panel pins and scroll progress picks the poster — the first at the top of
 * the pin, the last at the bottom — so scrolling walks the row and scrolling back
 * walks it in reverse.
 *
 * Scroll is the only thing that moves it: FlexCarousel runs controlled and glides
 * to the index the scroll position maps to. (It used to be stepped with synthetic
 * arrow-key presses while its own mid-animation position was fed back in as the
 * current index; every fast scroll overshot, and a wrap past the last poster could
 * set it spinning round the loop.)
 *
 * Every poster is a real link to its film. A swipe (or mouse drag) pulls the row
 * under the finger and settles on a poster; the arrow keys step along it. Both
 * then scroll the page to that poster's spot in the pin, so the page and the
 * carousel can never disagree.
 *
 * @param {{ trending: Array<object> }} props
 */

const COUNT = 10;

// Scroll distance per poster, as a fraction of the viewport height: two or three
// wheel notches per poster, so the pin reads as a row to walk, not a wall to
// scroll through (it used to be 0.65 — six and a half screens for ten posters).
const STEP = 0.3;
const STEP_NARROW = 0.24;

const hrefFor = item => (item.imdbId ? `/movie/${item.imdbId}` : null);

export default function ScrollCarousel({ trending = [] }) {
  const lenis = useLenis();
  const sectionRef = useRef(null);
  const pinRef = useRef(null);
  const triggerRef = useRef(null);

  // Where the scroll says the row should be, and what the carousel is showing.
  const [index, setIndex] = useState(0);
  const [display, setDisplay] = useState(0);
  // Off under reduced motion: no pin, and the carousel is moved by hand instead.
  const [scrollDriven, setScrollDriven] = useState(true);

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
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setScrollDriven(false);
      return;
    }

    gsap.registerPlugin(ScrollTrigger);
    const last = items.length - 1;
    // Nearest poster to the progress point. React skips the render when the
    // index has not changed, so this is cheap to call on every scroll tick.
    const sync = self => setIndex(Math.round(self.progress * last));

    const ctx = gsap.context(() => {
      triggerRef.current = ScrollTrigger.create({
        trigger: section,
        start: 'top top',
        end: () => {
          const step = window.innerWidth < 640 ? STEP_NARROW : STEP;
          return `+=${Math.round(window.innerHeight * step * last)}`;
        },
        pin: pinRef.current,
        anticipatePin: 1,
        invalidateOnRefresh: true,
        onUpdate: sync,
        onRefresh: sync
      });
    }, section);

    return () => {
      triggerRef.current = null;
      ctx.revert();
    };
  }, [items]);

  // A swipe or arrow key on the carousel: scroll to that poster's spot in the pin.
  const requestIndex = useCallback(
    next => {
      const trigger = triggerRef.current;
      const last = items.length - 1;
      if (!trigger || last < 1) return;
      const clamped = Math.max(0, Math.min(last, next));
      const y = trigger.start + (clamped / last) * (trigger.end - trigger.start);
      if (lenis) lenis.scrollTo(y, { duration: 0.6 });
      else window.scrollTo({ top: y, behavior: 'smooth' });
    },
    [items.length, lenis]
  );

  if (!items.length) {
    return (
      <section className="ch-shell py-20">
        <p className="ch-tag border-t border-hairline pt-5">
          Add TMDB_API_KEY to .env to stream trending posters through here
        </p>
      </section>
    );
  }

  return (
    <section ref={sectionRef} className="relative">
      <div ref={pinRef} className="flex min-h-screen flex-col justify-center py-20">
        <div className="ch-shell mb-6 flex items-end justify-between gap-6">
          <span className="ch-tag">Trending this week</span>
          <span className="ch-tag hidden sm:block">Scroll or swipe to browse · click a poster to open</span>
          <span className="ch-num shrink-0 text-fine text-ash tabular-nums">
            <span className="text-bone">{String(display + 1).padStart(2, '0')}</span>
            <span className="mx-1 text-ash-dim">/</span>
            {String(items.length).padStart(2, '0')}
          </span>
        </div>

        <div className="relative h-[clamp(260px,42vh,460px)] w-full">
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
            /* Scroll owns the position: the wheel stays the page's (letting the
               canvas eat it would strand the page in the pin), and swipes come
               back through onRequestIndex as a scroll. */
            captureWheel={false}
            index={scrollDriven ? index : undefined}
            onRequestIndex={requestIndex}
            getHref={hrefFor}
            linkAs={Link}
            ariaLabel="Trending this week"
            onChange={next => setDisplay(next)}
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
