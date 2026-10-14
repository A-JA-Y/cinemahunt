# CinemaHunt 🎬

**How a film feels, before you press play.**

Search any film and read its emotional shape: a vibe meter that draws itself as you
scroll, a spoiler-free AI synopsis, real streaming availability, trailers, and a
small cyborg who tells you things about whatever is on screen.

---

## Features

### The vibe meter

Groq reads a film and plots its emotional intensity across the runtime. The section
pins, the curve draws in step with your scroll, a playhead rides the path, and the
three acts take over as it crosses them — so reading the analysis and moving
through the film's runtime are the same gesture. You can also grab the curve and
scrub it by hand, with the pointer or the arrow keys.

Alongside it: a six-axis register (tension, warmth, humour, spectacle, dread,
heart), a one-line read on the film's feel, when to watch it, and what to drink.

### Spoiler-free synopsis

The setup, the themes, a specific note on the craft, and an honest list of who will
bounce off it. The official plot — the one block that does give things away — stays
folded behind a toggle.

### Availability that is actually checked

Real listings from TMDB's JustWatch feed across nine regions, kept separate by tier
(subscription, free with ads, rent, buy). The model never invents a platform: when a
region genuinely has no catalogue row, the fallback estimate renders under its own
"AI estimate — not verified" heading.

### Trailers

Official YouTube trailers and clips from TMDB, rendered as a facade — no iframe,
no third-party script and no cookies until you actually press play.

### Ask

Free-form questions about a film. Every answer carries its own spoiler rating, and
anything above "none" stays blurred until you choose to read it.

### Mood

Three questions instead of a dropdown — a feeling, an energy level, and how much
runtime you have — because "sad" alone doesn't separate a slow melancholy film from
a cathartic one.

### Pix

A small cyborg perched on the dock. It tracks your cursor and tells you production
trivia about whichever films are currently on the page. It speaks once unprompted,
then only when asked, and it can be muted for good.

### Three themes

Light, dark, and AMOLED. AMOLED is not just "darker": on an OLED panel a true-black
pixel is switched off, so it gets `#000` surfaces, brighter accents to survive
against them, stronger hairlines, and half the film grain. Applied before first
paint, so there is no flash of the wrong theme.

### Installable

A real PWA — manifest, maskable icons, app shortcuts, and a service worker with an
offline fallback. The worker never caches `/api/*`: those responses are built from
your region, your session and live AI output.

---

## Design

Editorial, projector-lit, hairline-ruled, and deliberately **not a card layout** —
structure comes from type scale, rules and negative space. Search results are a
numbered index with a still that floats to the cursor, not a grid of boxes.

Three WebGL/physics pieces from [React Bits](https://reactbits.dev):

| Component | Used for | Engine |
| --- | --- | --- |
| `FlexCarousel` | Trending posters, stepped by scroll | ogl |
| `PaperCrumple` | The poster you can crumple and drag | three |
| `FolderFloat` | AI notes that spill out of a folder | matter-js |

Motion is GSAP + ScrollTrigger on a Lenis-driven scroll, both on one ticker so
scrubbed animation doesn't judder. Every reveal honours `prefers-reduced-motion`,
and the hidden start states are armed by a pre-paint script with two escape hatches
so content can never be trapped invisible.

---

## Tech stack

- **[Next.js 15](https://nextjs.org/)** (App Router, Turbopack) + **React 19**
- **[Tailwind CSS 4](https://tailwindcss.com/)** — semantic colour tokens, re-themed per mode
- **[Groq](https://groq.com/)** — `openai/gpt-oss-120b`, falling back to `gpt-oss-20b`
- **[OMDb](https://www.omdbapi.com/)** — search, ratings, credits
- **[TMDB](https://www.themoviedb.org/)** — backdrops, availability, trailers
- **[Firebase](https://firebase.google.com/)** — auth and the films you keep
- **[GSAP](https://gsap.com/) + [Lenis](https://lenis.darkroom.engineering/)** — scroll and motion

---

## Setup

```bash
npm install
cp .env.example .env    # then fill in the three keys
npm run dev
```

### Keys

All three live in `.env` and stay on the server — every upstream call goes through
a route under `/api`, so nothing is exposed to the browser.

| Variable | Where to get it |
| --- | --- |
| `GROQ_API_KEY` | <https://console.groq.com/keys> |
| `OMDB_API_KEY` | <https://www.omdbapi.com/apikey.aspx> (free, instant) |
| `TMDB_API_KEY` | <https://www.themoviedb.org/settings/api> |

**On the OMDb key:** OMDb emails it inside an example URL like
`http://www.omdbapi.com/?i=tt3896198&apikey=abc12345`. Only the part after
`apikey=` is the key — but pasting the whole URL works too, it gets parsed out.

**On the TMDB key:** that page shows two credentials and either works on its own —
the short v3 "API Key" (`TMDB_API_KEY`) or the long v4 read token
(`TMDB_ACCESS_TOKEN`).

> **If you are in India:** several ISPs DNS-hijack `api.themoviedb.org` and the
> connection hangs until it times out. The app tries `api.tmdb.org` — TMDB's other
> official hostname — first, and falls back, so it works on either network without
> a VPN.

---

## Architecture

```
app/
  api/
    ai/        vibe · synopsis · availability · mood · recommend · ask · fact
    movies/    search · [id] · [id]/videos · trending     (OMDb + TMDB proxies)
    img/       CORS proxy, host-allowlisted, for WebGL textures
  lib/
    groq.js    JSON-mode client, model fallback, response normalising
    movies.js  OMDb + TMDB, key parsing, TMDB host failover
    cache.js   process-local TTL cache
  components/
    motion/    SmoothScroll (Lenis+GSAP) · Reveal · SplitLines · Parallax
    reactbits/ FlexCarousel · PaperCrumple · FolderFloat
    …          Dock · CyborgBot · VibeMeter · TrailerReel · AvailabilityRail …
```

**Why the image proxy:** `FlexCarousel` (ogl) and `PaperCrumple` (three) request
textures with `crossOrigin='anonymous'`. `m.media-amazon.com` sends
`Access-Control-Allow-Origin: *` so OMDb posters work directly, but
`image.tmdb.org` sends no CORS header at all and its textures silently fail to
upload. `/api/img` re-serves them from our own origin with the header attached, and
is strictly host-allowlisted so it cannot be used as an open proxy.

**AI output is normalised, never trusted raw.** Every route shapes what comes back —
clamping scores, padding short arrays, interpolating a missing curve — so a
malformed response degrades the visual instead of breaking the page. Film data
coming from OMDb/TMDB is labelled as data in every system prompt, so text inside a
plot summary cannot redirect the model.

---

## Scripts

```bash
npm run dev     # dev server, Turbopack
npm run build   # production build
npm run start   # serve the build (service worker only registers here)
npm run lint
```
