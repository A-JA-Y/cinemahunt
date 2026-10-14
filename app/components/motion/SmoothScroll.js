'use client';

import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import Lenis from 'lenis';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

const LenisContext = createContext(null);

/** Access the Lenis instance (null under reduced motion or before mount). */
export function useLenis() {
  return useContext(LenisContext);
}

/**
 * Smooth-scroll + scroll-animation provider.
 *
 * Lenis owns the scroll position and GSAP's ticker drives it, so ScrollTrigger and
 * the momentum scroll stay on one clock — mixing rAF loops is what makes scrubbed
 * animation judder.
 */
export default function SmoothScroll({ children }) {
  const [lenis, setLenis] = useState(null);
  const progressRef = useRef(null);
  const pathname = usePathname();

  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger);

    // Tell the pre-paint guard in layout.js that motion code is alive, so it stops
    // counting down to un-hiding everything.
    window.__chMotionReady = true;

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');

    if (reduced.matches) {
      // No Lenis, no scrubbing. The CSS already forces reveals to their end state.
      document.documentElement.classList.remove('motion-ready');
      return;
    }

    const instance = new Lenis({
      lerp: 0.085,
      wheelMultiplier: 0.9,
      smoothWheel: true,
      // Touch devices have their own momentum; overriding it feels broken.
      syncTouch: false
    });

    instance.on('scroll', ScrollTrigger.update);

    const raf = time => instance.raf(time * 1000);
    gsap.ticker.add(raf);
    gsap.ticker.lagSmoothing(0);

    // Top progress rail, scrubbed against total document scroll.
    const progress = gsap.to(progressRef.current, {
      scaleX: 1,
      ease: 'none',
      scrollTrigger: { start: 0, end: 'max', scrub: 0.3 }
    });

    setLenis(instance);

    // Late-loading posters change document height; without this, every trigger
    // further down the page fires at the wrong scroll position.
    const onLoad = () => ScrollTrigger.refresh();
    window.addEventListener('load', onLoad);

    return () => {
      window.removeEventListener('load', onLoad);
      progress.scrollTrigger?.kill();
      progress.kill();
      gsap.ticker.remove(raf);
      instance.destroy();
      setLenis(null);
    };
  }, []);

  // On navigation, jump to the top and re-measure: ScrollTrigger caches element
  // positions and the new route's are entirely different.
  useEffect(() => {
    if (!lenis) {
      window.scrollTo(0, 0);
      return;
    }
    lenis.scrollTo(0, { immediate: true });
    const id = requestAnimationFrame(() => ScrollTrigger.refresh());
    return () => cancelAnimationFrame(id);
  }, [pathname, lenis]);

  return (
    <LenisContext.Provider value={lenis}>
      <div ref={progressRef} className="ch-progress" aria-hidden="true" />
      {children}
    </LenisContext.Provider>
  );
}
