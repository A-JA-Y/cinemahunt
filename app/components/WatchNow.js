'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { toast } from './toast';

/**
 * "Watch now": copies the title, then opens a list of places to start watching.
 *
 * Copying first means the title is one paste away wherever the viewer lands —
 * several services drop a search query until you are signed in. The list is the
 * services TMDB / JustWatch list for this film in the chosen region, each sent
 * straight to that service's own search for the title, followed by a few
 * search-everywhere fallbacks. Every link opens in a new tab with no opener, so
 * the page that was opened cannot reach back into this one.
 *
 * A disclosure (button + list of links) rather than an ARIA menu: these are plain
 * navigation links, so Tab, middle-click and "copy link" all behave as usual.
 *
 * @param {{ movie: { title: string, year?: string|null }, data: object|null, region: string, regionLabel: string }} props
 */

const TIER_LABEL = { stream: 'Subscription', free: 'Free', rent: 'Rent', buy: 'Buy' };

// Search pages that take the title as a query, matched on TMDB's provider name,
// which survives its id churn (Netflix alone has several ids for its ad tiers).
// Only templates checked to land on a real search page are listed; any other
// service falls back to TMDB's watch page, whose buttons deep-link into it.
const SEARCH_URLS = [
  [/netflix/i, q => `https://www.netflix.com/search?q=${q}`],
  [/amazon|prime video/i, q => `https://www.primevideo.com/search/ref=atv_nb_sug?ie=UTF8&phrase=${q}`],
  [/apple/i, q => `https://tv.apple.com/search?term=${q}`],
  [/google play|google tv/i, q => `https://play.google.com/store/search?q=${q}&c=movies`],
  [/youtube/i, q => `https://www.youtube.com/results?search_query=${q}`],
  [/tubi/i, q => `https://tubitv.com/search/${q}`],
  [/bbc iplayer/i, q => `https://www.bbc.co.uk/iplayer/search?q=${q}`],
  [/hotstar/i, q => `https://www.hotstar.com/in/explore?search_query=${q}`],
  [/mubi/i, q => `https://mubi.com/en/search/films?query=${q}`]
];

// JustWatch's country slugs match ISO codes except for the UK.
const JUSTWATCH_REGION = { GB: 'uk' };

/** One row per service, with every way it carries the film ("Rent · Buy"). */
function listedServices(data, title) {
  const q = encodeURIComponent(title);
  const byName = new Map();

  for (const tier of Object.keys(TIER_LABEL)) {
    for (const provider of data?.[tier] ?? []) {
      const entry = byName.get(provider.name) ?? { name: provider.name, logo: provider.logo, tiers: [] };
      if (!entry.tiers.includes(TIER_LABEL[tier])) entry.tiers.push(TIER_LABEL[tier]);
      byName.set(provider.name, entry);
    }
  }

  return [...byName.values()]
    .map(entry => {
      const search = SEARCH_URLS.find(([pattern]) => pattern.test(entry.name))?.[1];
      return { ...entry, hint: entry.tiers.join(' · '), href: search ? search(q) : data?.link ?? null };
    })
    .filter(entry => entry.href);
}

function everywhere(title, year, region) {
  const titled = year ? `${title} ${year}` : title;
  const slug = JUSTWATCH_REGION[region] ?? region.toLowerCase();
  return [
    {
      name: 'JustWatch',
      hint: 'Every service at once',
      href: `https://www.justwatch.com/${slug}/search?q=${encodeURIComponent(title)}`
    },
    {
      name: 'Google',
      hint: 'Where to watch',
      href: `https://www.google.com/search?q=${encodeURIComponent(`where to watch ${titled}`)}`
    },
    {
      name: 'YouTube',
      hint: 'Rent, buy or free with ads',
      href: `https://www.youtube.com/results?search_query=${encodeURIComponent(`${titled} movie`)}`
    }
  ];
}

async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // Clipboard API unavailable (older browser, insecure origin): fall back to
    // a throwaway textarea.
    try {
      const area = document.createElement('textarea');
      area.value = text;
      area.setAttribute('readonly', '');
      area.style.cssText = 'position:fixed;top:0;left:0;opacity:0;pointer-events:none';
      document.body.appendChild(area);
      area.select();
      const ok = document.execCommand('copy');
      area.remove();
      return ok;
    } catch {
      return false;
    }
  }
}

export default function WatchNow({ movie, data, region, regionLabel }) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const rootRef = useRef(null);
  const buttonRef = useRef(null);
  const panelId = useId();

  const title = movie.title;
  const services = listedServices(data, title);
  const listedNames = new Set(services.map(s => s.name.toLowerCase()));
  const fallbacks = everywhere(title, movie.year, region).filter(s => !listedNames.has(s.name.toLowerCase()));

  // Outside press or Escape closes it; Escape hands focus back to the button.
  useEffect(() => {
    if (!open) return;
    const onPointer = event => {
      if (!rootRef.current?.contains(event.target)) setOpen(false);
    };
    const onKey = event => {
      if (event.key !== 'Escape') return;
      setOpen(false);
      buttonRef.current?.focus();
    };
    document.addEventListener('pointerdown', onPointer);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onPointer);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const toggle = async () => {
    if (open) {
      setOpen(false);
      return;
    }
    setOpen(true);
    const ok = await copyText(title);
    setCopied(ok);
    if (ok) toast(`Copied “${title}”`);
  };

  // Up/down walk the links, for anyone who opened it from the keyboard.
  const onKeyDown = event => {
    if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return;
    const links = Array.from(rootRef.current?.querySelectorAll('[data-watch-link]') ?? []);
    if (!links.length) return;
    event.preventDefault();
    const at = links.indexOf(document.activeElement);
    const next =
      event.key === 'ArrowDown'
        ? links[at < 0 ? 0 : Math.min(links.length - 1, at + 1)]
        : links[at <= 0 ? 0 : at - 1];
    next.focus();
  };

  return (
    <div ref={rootRef} className="relative" onKeyDown={onKeyDown}>
      <button
        ref={buttonRef}
        type="button"
        onClick={toggle}
        aria-expanded={open}
        aria-controls={panelId}
        className="ch-btn ch-btn--ember"
      >
        <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 fill-current" aria-hidden="true">
          <path d="M7 4.5v15l12.5-7.5z" />
        </svg>
        Watch now
        <svg
          viewBox="0 0 24 24"
          className={`h-3.5 w-3.5 transition-transform duration-300 ${open ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>

      {open && (
        // data-lenis-prevent: let the list scroll natively instead of Lenis
        // turning the wheel into a page scroll.
        <div id={panelId} className="ch-watch-panel" data-lenis-prevent>
          <p className="px-3 pt-2 pb-1 font-mono text-micro leading-relaxed text-ash">
            {copied
              ? 'Title copied — paste it into the search if a service opens on its home page.'
              : `Search for “${title}” on:`}
          </p>

          {services.length > 0 && (
            <WatchGroup label={`Listed in ${regionLabel}`} entries={services} />
          )}
          <WatchGroup label="Search everywhere" entries={fallbacks} />
        </div>
      )}
    </div>
  );
}

function WatchGroup({ label, entries }) {
  return (
    <div role="group" aria-label={label}>
      <p className="ch-tag px-3 pt-4 pb-1.5" aria-hidden="true">
        {label}
      </p>
      <ul>
        {entries.map(entry => (
          <li key={entry.name}>
            <a
              data-watch-link
              href={entry.href}
              target="_blank"
              rel="noopener noreferrer"
              className="ch-watch-item group/w"
            >
              {entry.logo ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img src={entry.logo} alt="" aria-hidden="true" className="h-7 w-7 shrink-0 rounded-md object-cover" />
              ) : (
                <span aria-hidden="true" className="ch-watch-mono">
                  {entry.name.slice(0, 1)}
                </span>
              )}
              <span className="min-w-0 flex-1">
                <span className="block truncate text-body">{entry.name}</span>
                <span className="ch-tag block truncate">{entry.hint}</span>
              </span>
              <span
                aria-hidden="true"
                className="shrink-0 text-ash transition-[transform,color] duration-300 group-hover/w:-translate-y-0.5 group-hover/w:translate-x-0.5 group-hover/w:text-ember"
              >
                ↗
              </span>
              <span className="ch-sr"> (opens in a new tab)</span>
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}
