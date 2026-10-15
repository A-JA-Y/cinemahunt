'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import gsap from 'gsap';
import { useLenis } from './motion/SmoothScroll';
import { useLikes } from './useLikes';
import { useTheme, THEMES } from './theme';
import CyborgBot from './CyborgBot';

/**
 * Floating dock.
 *
 * Items magnify by proximity to the pointer, the way a macOS dock does: each
 * item's scale is a falloff of its distance from the cursor, so neighbours swell
 * too and the row deforms as one surface instead of popping item by item.
 *
 * Driven by gsap.quickTo on a pointermove listener — one tween per item kept on
 * GSAP's ticker, rather than a new tween per event.
 */

const MAX_SCALE = 0.62; // extra scale at the cursor
const REACH = 110; // px of influence either side

export default function Dock({ onSignIn, onSearch }) {
  const pathname = usePathname();
  const router = useRouter();
  const lenis = useLenis();
  const { user, likes } = useLikes();
  const { theme, setTheme } = useTheme();

  const railRef = useRef(null);
  const quickRef = useRef([]);
  const [themeOpen, setThemeOpen] = useState(false);

  // --- proximity magnification -------------------------------------------
  useEffect(() => {
    const rail = railRef.current;
    if (!rail) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    if (window.matchMedia('(hover: none)').matches) return;

    const items = Array.from(rail.querySelectorAll('[data-dock-item]'));
    const ease = { duration: 0.35, ease: 'power3' };
    quickRef.current = items.map(item => {
      // quickTo needs a single real property. `scale` is a shorthand GSAP splits
      // into scaleX/scaleY, so quickTo(item, 'scale') could never retarget: every
      // call re-initialised the tween (a computed-style read per item per
      // pointermove) and logged "scale not eligible for reset".
      const scaleX = gsap.quickTo(item, 'scaleX', ease);
      const scaleY = gsap.quickTo(item, 'scaleY', ease);
      return {
        el: item,
        scale: value => {
          scaleX(value);
          scaleY(value);
        },
        y: gsap.quickTo(item, 'y', ease)
      };
    });

    // Whether the last move was inside the band, so a pointer roaming the rest
    // of the page does not keep re-targeting tweens that are already at rest.
    let wasNear = false;

    const onMove = event => {
      const bounds = rail.getBoundingClientRect();
      // Only magnify while the pointer is near the dock's band.
      const near = event.clientY > bounds.top - 90 && event.clientY < bounds.bottom + 40;
      if (!near && !wasNear) return;
      wasNear = near;

      for (const entry of quickRef.current) {
        if (!near) {
          entry.scale(1);
          entry.y(0);
          continue;
        }
        const box = entry.el.getBoundingClientRect();
        const centre = box.left + box.width / 2;
        const distance = Math.abs(event.clientX - centre);
        // Cosine falloff: smooth at the edge of the reach, peaked at the cursor.
        const influence = distance > REACH ? 0 : (Math.cos((distance / REACH) * Math.PI) + 1) / 2;
        entry.scale(1 + influence * MAX_SCALE);
        entry.y(-influence * 10);
      }
    };

    const onLeave = () => {
      wasNear = false;
      for (const entry of quickRef.current) {
        entry.scale(1);
        entry.y(0);
      }
    };

    window.addEventListener('pointermove', onMove, { passive: true });
    window.addEventListener('pointerleave', onLeave);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerleave', onLeave);
      gsap.killTweensOf(items, 'scaleX,scaleY,y');
      quickRef.current = [];
    };
  }, [user]);

  // --- reveal on mount ----------------------------------------------------
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    gsap.fromTo(
      railRef.current,
      { yPercent: 160, opacity: 0 },
      { yPercent: 0, opacity: 1, duration: 1, ease: 'expo.out', delay: 0.5 }
    );
  }, []);

  const jump = id => {
    setThemeOpen(false);
    if (pathname !== '/') {
      router.push(`/#${id}`);
      return;
    }
    const target = document.getElementById(id);
    if (!target) return;
    if (lenis) lenis.scrollTo(target, { offset: -70, duration: 1.2 });
    else target.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const toTop = () => {
    setThemeOpen(false);
    if (pathname !== '/') {
      router.push('/');
      return;
    }
    if (lenis) lenis.scrollTo(0, { duration: 1.2 });
    else window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="ch-dock-wrap">
      {/* Pix perches on the dock's top edge, above the tray. */}
      <CyborgBot />

      {/* Theme tray, above the dock ---------------------------------- */}
      {themeOpen && (
        <div role="group" aria-label="Theme" className="ch-dock-tray">
          {THEMES.map(option => (
            <button
              key={option.key}
              type="button"
              onClick={() => {
                setTheme(option.key);
                setThemeOpen(false);
              }}
              aria-pressed={theme === option.key}
              className={`ch-dock-tray-item ${theme === option.key ? 'is-on' : ''}`}
            >
              <span className="text-body">{option.label}</span>
              <span className="ch-tag">{option.hint}</span>
            </button>
          ))}
        </div>
      )}

      <nav ref={railRef} className="ch-dock-rail" aria-label="Primary">
        <DockItem label="Top" onClick={toTop}>
          <IconHome />
        </DockItem>

        <DockItem label="Search" onClick={() => (onSearch ? onSearch() : jump('search'))}>
          <IconSearch />
        </DockItem>

        <DockItem label="Mood" onClick={() => jump('mood')}>
          <IconMood />
        </DockItem>

        {user ? (
          <DockItem label="Your list" href="/recomendations" badge={likes.size || null}>
            <IconHeart />
          </DockItem>
        ) : (
          <DockItem label="Sign in" onClick={onSignIn}>
            <IconUser />
          </DockItem>
        )}

        <span className="ch-dock-sep" aria-hidden="true" />

        <DockItem
          label="Theme"
          onClick={() => setThemeOpen(v => !v)}
          expanded={themeOpen}
        >
          <IconTheme />
        </DockItem>
      </nav>
    </div>
  );
}

function DockItem({ label, onClick, href, children, badge, expanded }) {
  const inner = (
    <>
      <span className="ch-dock-icon" aria-hidden="true">
        {children}
      </span>
      <span className="ch-dock-label" aria-hidden="true">
        {label}
      </span>
      {badge ? (
        <span className="ch-dock-badge" aria-hidden="true">
          {badge > 99 ? '99+' : badge}
        </span>
      ) : null}
    </>
  );

  const shared = {
    'data-dock-item': true,
    className: 'ch-dock-item',
    'aria-label': label,
    ...(expanded === undefined ? {} : { 'aria-expanded': expanded })
  };

  if (href) {
    return (
      <Link href={href} {...shared}>
        {inner}
      </Link>
    );
  }
  return (
    <button type="button" onClick={onClick} {...shared}>
      {inner}
    </button>
  );
}

/* Icons: 20px grid, 1.5 stroke, currentColor so they theme for free. */
const svg = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.6,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  viewBox: '0 0 24 24'
};

const IconHome = () => (
  <svg {...svg}>
    <path d="M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-4v-6H9v6H5a1 1 0 0 1-1-1z" />
  </svg>
);

const IconSearch = () => (
  <svg {...svg}>
    <circle cx="11" cy="11" r="6.5" />
    <path d="m16 16 4 4" />
  </svg>
);

const IconMood = () => (
  <svg {...svg}>
    <circle cx="12" cy="12" r="8.5" />
    <path d="M8.5 14.5a4.5 4.5 0 0 0 7 0M9 9.5h.01M15 9.5h.01" />
  </svg>
);

const IconHeart = () => (
  <svg {...svg}>
    <path d="M4.3 6.3a4.5 4.5 0 0 1 6.4 0l1.3 1.3 1.3-1.3a4.5 4.5 0 1 1 6.4 6.4L12 20.4l-7.7-7.7a4.5 4.5 0 0 1 0-6.4z" />
  </svg>
);

const IconUser = () => (
  <svg {...svg}>
    <circle cx="12" cy="8.5" r="3.75" />
    <path d="M5 20c0-3.3 3.1-5.5 7-5.5s7 2.2 7 5.5" />
  </svg>
);

const IconTheme = () => (
  <svg {...svg}>
    <circle cx="12" cy="12" r="8" />
    {/* Half-filled disc: the universal "appearance" mark. */}
    <path d="M12 4a8 8 0 0 1 0 16z" fill="currentColor" stroke="none" />
  </svg>
);
