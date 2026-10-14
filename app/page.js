import Hero from './components/Hero';
import ScrollCarousel from './components/ScrollCarousel';
import Navigation from './components/Navigation';
import SearchIndex from './components/SearchIndex';
import MoodStudio from './components/MoodStudio';
import Toaster from './components/Toaster';
import Reveal from './components/motion/Reveal';
import SplitLines from './components/motion/SplitLines';
import { tmdbTrending, tmdbExternalIds } from './lib/movies';

// Trending is fetched on the server so the hero carousel has posters in its first
// paint instead of popping in after a client round-trip.
export const revalidate = 3600;

async function getTrending() {
  const trending = await tmdbTrending();
  if (!trending.length) return [];

  // The carousel links to /movie/[imdbId], so resolve TMDB ids up front.
  const withIds = await Promise.all(
    trending.map(async movie => ({ ...movie, imdbId: await tmdbExternalIds(movie.tmdbId) }))
  );
  return withIds.filter(movie => movie.imdbId);
}

const CAPABILITIES = [
  {
    n: '01',
    title: 'A vibe meter you scroll through',
    body: 'Groq reads the film and plots its emotional intensity across the runtime. The curve draws itself as you scroll, and you can grab it and scrub by hand.'
  },
  {
    n: '02',
    title: 'A synopsis that spoils nothing',
    body: 'The setup, the themes, the craft, and an honest note on who will bounce off it. The official plot stays folded away behind a toggle.'
  },
  {
    n: '03',
    title: 'Availability that is actually checked',
    body: 'Real listings from TMDB’s JustWatch feed for nine regions — subscription, free, rent and buy, kept separate. No invented platforms.'
  }
];

export default async function Home() {
  const trending = await getTrending();

  return (
    <>
      <Navigation />

      <main>
        <Hero trending={trending} />

        <ScrollCarousel trending={trending} />

        <div className="py-24 sm:py-32">
          <SearchIndex />
        </div>

        <MoodStudio />

        {/* What it does ------------------------------------------------- */}
        <section className="ch-shell py-24 sm:py-32">
          <div className="flex items-baseline gap-4 border-t border-hairline pt-6">
            <span className="ch-tag shrink-0">03 / What you get</span>
          </div>

          <SplitLines
            as="h2"
            className="ch-display mt-10 max-w-[20ch]"
            lines={['Everything but', 'the trailer.']}
          />

          <Reveal variant="up" stagger="[data-cap]" className="mt-20">
            <ol>
              {CAPABILITIES.map(item => (
                <li
                  key={item.n}
                  data-cap
                  className="grid gap-x-12 gap-y-3 border-t border-hairline py-10 sm:grid-cols-[auto_1fr_1.2fr]"
                >
                  <span className="ch-num text-fine text-ash-dim">{item.n}</span>
                  <h3 className="ch-title !text-[clamp(1.25rem,2.6vw,2rem)] max-w-[20ch]">
                    {item.title}
                  </h3>
                  <p className="max-w-[48ch] text-body text-ash">{item.body}</p>
                </li>
              ))}
            </ol>
          </Reveal>
        </section>

        {/* Footer ------------------------------------------------------- */}
        <footer className="ch-shell border-t border-hairline py-16">
          <div className="flex flex-wrap items-end justify-between gap-10">
            <div>
              <p className="ch-colossal !text-[clamp(2rem,8vw,5rem)] leading-none">
                Cinema<span className="text-ember">Hunt</span>
              </p>
              <p className="ch-tag mt-4">How a film feels, before you press play.</p>
            </div>

            <dl className="ch-tag grid gap-2">
              <div className="flex gap-3">
                <dt className="w-20 text-ash-dim">Data</dt>
                <dd>OMDb · TMDB</dd>
              </div>
              <div className="flex gap-3">
                <dt className="w-20 text-ash-dim">AI</dt>
                <dd>Groq · gpt-oss-120b</dd>
              </div>
              <div className="flex gap-3">
                <dt className="w-20 text-ash-dim">Motion</dt>
                <dd>GSAP · Lenis</dd>
              </div>
              <div className="flex gap-3">
                <dt className="w-20 text-ash-dim">Pieces</dt>
                <dd>React Bits</dd>
              </div>
            </dl>
          </div>
        </footer>
        <div className="ch-dock-gutter" />
      </main>

      <Toaster />
    </>
  );
}
