'use client';

import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

/**
 * Scroll-scrubbed parallax. `speed` is how far the element drifts relative to the
 * scroll, as a fraction of its own height: negative rises, positive lags.
 *
 * Nothing is hidden here — parallax is pure decoration, so it stays absent rather
 * than broken when motion is reduced.
 */
export default function Parallax({
  children,
  speed = -0.2,
  scale = 1,
  as: Tag = 'div',
  className = '',
  ...rest
}) {
  const ref = useRef(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    gsap.registerPlugin(ScrollTrigger);

    const ctx = gsap.context(() => {
      gsap.fromTo(
        el,
        { yPercent: 0, scale },
        {
          yPercent: speed * 100,
          scale: 1,
          ease: 'none',
          scrollTrigger: {
            trigger: el.parentElement ?? el,
            start: 'top bottom',
            end: 'bottom top',
            scrub: true,
            invalidateOnRefresh: true
          }
        }
      );
    }, el);

    return () => ctx.revert();
  }, [speed, scale]);

  return (
    <Tag ref={ref} className={className} {...rest}>
      {children}
    </Tag>
  );
}
