'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

/**
 * The vibe meter: a film's emotional intensity as a curve you scroll through.
 *
 * The section pins and the curve draws in step with scroll, a playhead rides the
 * path, and the three acts take over as the playhead crosses them — so reading the
 * analysis and moving through the film's runtime are the same gesture.
 *
 * You can also take over by hand: pointer or arrow keys scrub the readout without
 * moving the page.
 *
 * @param {{ vibe: object|null, loading: boolean, error: string|null }} props
 */

const VIEW_W = 1000;
const VIEW_H = 320;
const PAD_Y = 34;

export default function VibeMeter({ vibe, loading, error }) {
  const sectionRef = useRef(null);
  const pinRef = useRef(null);
  const pathRef = useRef(null);
  const areaRef = useRef(null);
  const headRef = useRef(null);
  const glowRef = useRef(null);
  const barsRef = useRef(null);

  const [progress, setProgress] = useState(0);
  const [manual, setManual] = useState(null); // hand-scrub overrides scroll
  const shown = manual ?? progress;

  const geometry = useMemo(() => (vibe ? buildGeometry(vibe.curve) : null), [vibe]);

  const actIndex = Math.min(2, Math.floor(shown * 2.999));
  const act = vibe?.acts?.[actIndex] ?? null;
  const tint = vibe?.palette?.[actIndex] ?? '#141420';

  // --- scroll scrub -------------------------------------------------------
  useEffect(() => {
    const section = sectionRef.current;
    if (!section || !geometry) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      // Show the finished curve rather than an empty frame.
      setProgress(1);
      return;
    }

    gsap.registerPlugin(ScrollTrigger);
    // Held as locals rather than read from the refs per frame: leaving the page,
    // Next scrolls during the commit, after React has nulled the refs but before
    // this effect's cleanup kills the trigger, and gsap.set(null) warns.
    const path = pathRef.current;
    const area = areaRef.current;
    const head = headRef.current;
    const glow = glowRef.current;
    const length = path.getTotalLength();
    gsap.set(path, { strokeDasharray: length, strokeDashoffset: length });

    const ctx = gsap.context(() => {
      ScrollTrigger.create({
        trigger: section,
        start: 'top top',
        end: '+=220%',
        pin: pinRef.current,
        scrub: 0.4,
        // The trigger owns the pin; anticipatePin stops the hand-off flickering.
        anticipatePin: 1,
        invalidateOnRefresh: true,
        onUpdate: self => {
          const p = self.progress;
          setProgress(p);

          // Imperative per-frame work stays out of React.
          gsap.set(path, { strokeDashoffset: length * (1 - p) });
          gsap.set(area, { scaleX: p });

          const point = path.getPointAtLength(length * p);
          gsap.set(head, { attr: { cx: point.x, cy: point.y } });
          gsap.set(glow, { attr: { cx: point.x, cy: point.y } });
        }
      });
    }, section);

    return () => ctx.revert();
  }, [geometry]);

  // --- axis bars ----------------------------------------------------------
  useEffect(() => {
    const el = barsRef.current;
    if (!el || !vibe) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    gsap.registerPlugin(ScrollTrigger);
    const ctx = gsap.context(() => {
      gsap.fromTo(
        el.querySelectorAll('[data-bar]'),
        { scaleX: 0 },
        {
          scaleX: 1,
          duration: 1.3,
          ease: 'expo.out',
          stagger: 0.08,
          scrollTrigger: { trigger: el, start: 'top 85%', once: true }
        }
      );
    }, el);
    return () => ctx.revert();
  }, [vibe]);

  // --- hand scrub ---------------------------------------------------------
  const onPointer = event => {
    if (!geometry) return;
    const rect = event.currentTarget.getBoundingClientRect();
    setManual(clamp01((event.clientX - rect.left) / rect.width));
  };

  const onKey = event => {
    if (!geometry) return;
    const step = event.shiftKey ? 0.1 : 0.02;
    if (event.key === 'ArrowRight') {
      event.preventDefault();
      setManual(clamp01((manual ?? progress) + step));
    } else if (event.key === 'ArrowLeft') {
      event.preventDefault();
      setManual(clamp01((manual ?? progress) - step));
    } else if (event.key === 'Escape') {
      setManual(null);
    }
  };

  // --- states -------------------------------------------------------------
  if (error) {
    return (
      <Frame>
        <p role="alert" className="font-mono text-fine text-ember">
          {error}
        </p>
      </Frame>
    );
  }

  if (loading || !vibe || !geometry) {
    return (
      <Frame>
        <p className="ch-lead max-w-[30ch] text-ash">Reading the film&rsquo;s emotional shape…</p>
        <div className="ch-thinking mt-8 max-w-sm" />
      </Frame>
    );
  }

  const handValue = valueAt(vibe.curve, shown);

  return (
    <section ref={sectionRef} className="relative">
      <div
        ref={pinRef}
        className="flex min-h-[100svh] flex-col justify-center overflow-hidden pt-[clamp(3rem,7vh,5rem)] pb-[clamp(5.5rem,11vh,7rem)]"
      >
        {/* Act-coloured ambience, cross-fading as the playhead moves. */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 -z-10 transition-[background] duration-[1200ms] ease-out"
          style={{
            background: `radial-gradient(120% 90% at ${15 + shown * 70}% 40%, ${tint} 0%, transparent 62%)`,
            opacity: 0.55
          }}
        />

        <div className="ch-shell">
          <div className="flex items-baseline gap-4 border-t border-hairline pt-6">
            <span className="ch-tag shrink-0">Vibe meter</span>
            <span className="ch-tag ml-auto tabular-nums">
              {Math.round(shown * 100)}% through
              {manual !== null && <span className="ml-2 text-ember">manual</span>}
            </span>
          </div>

          {vibe.oneLine && (
            <p className="ch-display mt-[clamp(0.75rem,3vh,2rem)] max-w-[24ch] !text-[clamp(1.35rem,3.6vw,3rem)]">
              {vibe.oneLine}
            </p>
          )}

          {/* Curve ------------------------------------------------------- */}
          <div
            role="slider"
            tabIndex={0}
            aria-label="Scrub the emotional intensity curve"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(shown * 100)}
            aria-valuetext={`${Math.round(shown * 100)} percent through, intensity ${handValue}, ${act?.vibe ?? ''}`}
            onPointerMove={onPointer}
            onPointerLeave={() => setManual(null)}
            onKeyDown={onKey}
            className="relative mt-[clamp(0.75rem,3vh,2.5rem)] cursor-ew-resize touch-pan-y select-none"
          >
            <svg
              viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
              preserveAspectRatio="none"
              className="h-[clamp(110px,22vh,260px)] w-full overflow-visible"
              aria-hidden="true"
            >
              <defs>
                <linearGradient id="vibe-stroke" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="var(--color-ice)" />
                  <stop offset="55%" stopColor="var(--color-bone)" />
                  <stop offset="100%" stopColor="var(--color-ember)" />
                </linearGradient>
                <linearGradient id="vibe-area" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--color-ember)" stopOpacity="0.3" />
                  <stop offset="100%" stopColor="var(--color-ember)" stopOpacity="0" />
                </linearGradient>
              </defs>

              {/* Act divisions */}
              {[1 / 3, 2 / 3].map(at => (
                <line
                  key={at}
                  x1={at * VIEW_W}
                  y1="0"
                  x2={at * VIEW_W}
                  y2={VIEW_H}
                  stroke="var(--color-hairline)"
                  strokeDasharray="3 7"
                />
              ))}
              <line
                x1="0"
                y1={VIEW_H - PAD_Y}
                x2={VIEW_W}
                y2={VIEW_H - PAD_Y}
                stroke="var(--color-hairline)"
              />

              {/* Area, revealed by a scaling clip rather than a redraw */}
              <g style={{ clipPath: 'url(#vibe-clip)' }}>
                <clipPath id="vibe-clip">
                  <rect
                    ref={areaRef}
                    x="0"
                    y="0"
                    width={VIEW_W}
                    height={VIEW_H}
                    style={{ transformOrigin: '0 0', transform: 'scaleX(0)' }}
                  />
                </clipPath>
                <path d={geometry.area} fill="url(#vibe-area)" />
              </g>

              {/* The curve itself */}
              <path
                ref={pathRef}
                d={geometry.line}
                fill="none"
                stroke="url(#vibe-stroke)"
                strokeWidth="2.5"
                strokeLinecap="round"
                vectorEffect="non-scaling-stroke"
              />

              {/* Playhead */}
              <circle ref={glowRef} r="16" fill="var(--color-ember)" opacity="0.18" cx="0" cy={VIEW_H / 2} />
              <circle ref={headRef} r="4.5" fill="var(--color-ember)" cx="0" cy={VIEW_H / 2} />

              {/* Hand-scrub readout line */}
              {manual !== null && (
                <line
                  x1={manual * VIEW_W}
                  y1="0"
                  x2={manual * VIEW_W}
                  y2={VIEW_H}
                  stroke="var(--color-ember)"
                  strokeWidth="1"
                  vectorEffect="non-scaling-stroke"
                />
              )}
            </svg>

            <div className="ch-tag mt-3 flex justify-between">
              {vibe.acts.map((a, i) => (
                <span key={a.label} className={i === actIndex ? 'text-ember' : undefined}>
                  {a.label}
                </span>
              ))}
            </div>
          </div>

          {/* Active act -------------------------------------------------- */}
          {act && (
            <div className="mt-[clamp(1rem,3.5vh,2.5rem)] grid gap-4 sm:grid-cols-[auto_1fr] sm:items-baseline sm:gap-12">
              <div>
                <p className="ch-tag">{act.label}</p>
                <p
                  key={act.vibe}
                  className="ch-title mt-2 !text-[clamp(1.5rem,3.4vw,2.75rem)] text-ember ch-swap"
                >
                  {act.vibe}
                </p>
              </div>
              <p key={act.description} className="ch-lead max-w-[52ch] ch-swap">
                {act.description}
              </p>
            </div>
          )}

          {/* Dropped on short viewports — the act text earns the space first.
              A height query, not Tailwind's width-based min-[] breakpoints. */}
          <p className="ch-tag mt-[clamp(0.75rem,2.5vh,2rem)] hidden [@media(min-height:720px)]:block">
            Scroll to play · drag across the curve or use ←→ to scrub by hand
          </p>
        </div>
      </div>

      {/* Axes ---------------------------------------------------------- */}
      <div ref={barsRef} className="ch-shell py-24 sm:py-32">
        <div className="flex items-baseline gap-4 border-t border-hairline pt-6">
          <span className="ch-tag shrink-0">Register</span>
          {vibe.pairing && <span className="ch-tag ml-auto">Pairs with {vibe.pairing}</span>}
        </div>

        <dl className="mt-12 grid gap-x-16 gap-y-7 sm:grid-cols-2">
          {vibe.axes.map(axis => (
            <div key={axis.key} className="flex items-center gap-5">
              <dt className="w-24 shrink-0 text-fine text-ash">{axis.label}</dt>
              <dd className="flex min-w-0 flex-1 items-center gap-4">
                <span className="relative h-px flex-1 bg-hairline">
                  <span
                    data-bar
                    className="absolute inset-y-0 left-0 origin-left bg-bone"
                    style={{ width: `${axis.value}%` }}
                  />
                </span>
                <span className="ch-num w-8 shrink-0 text-right text-fine text-ash">{axis.value}</span>
              </dd>
            </div>
          ))}
        </dl>

        {vibe.watchWhen && (
          <p className="ch-lead mt-16 max-w-[44ch] border-l border-ember pl-6 italic">
            {vibe.watchWhen}
          </p>
        )}
      </div>
    </section>
  );
}

function Frame({ children }) {
  return (
    <section className="ch-shell py-28">
      <div className="flex items-baseline gap-4 border-t border-hairline pt-6">
        <span className="ch-tag">Vibe meter</span>
      </div>
      <div className="mt-10">{children}</div>
    </section>
  );
}

const clamp01 = n => Math.max(0, Math.min(1, n));

/** Intensity at a 0..1 position, linearly interpolated between samples. */
function valueAt(curve, t) {
  if (!curve?.length) return 0;
  const pos = clamp01(t) * (curve.length - 1);
  const i = Math.floor(pos);
  const next = Math.min(curve.length - 1, i + 1);
  return Math.round(curve[i] + (curve[next] - curve[i]) * (pos - i));
}

/**
 * Catmull-Rom through the sample points, converted to cubic beziers.
 * A polyline would read as a chart; the spline reads as a film's shape.
 */
function buildGeometry(curve) {
  const points = curve.map((value, i) => ({
    x: (i / (curve.length - 1)) * VIEW_W,
    y: VIEW_H - PAD_Y - (value / 100) * (VIEW_H - PAD_Y * 2)
  }));

  let line = `M ${points[0].x},${points[0].y}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i - 1] ?? points[i];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[i + 2] ?? p2;
    const c1x = p1.x + (p2.x - p0.x) / 6;
    const c1y = p1.y + (p2.y - p0.y) / 6;
    const c2x = p2.x - (p3.x - p1.x) / 6;
    const c2y = p2.y - (p3.y - p1.y) / 6;
    line += ` C ${c1x},${c1y} ${c2x},${c2y} ${p2.x},${p2.y}`;
  }

  const area = `${line} L ${VIEW_W},${VIEW_H - PAD_Y} L 0,${VIEW_H - PAD_Y} Z`;
  return { line, area };
}
