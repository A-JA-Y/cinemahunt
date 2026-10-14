import { NextResponse } from 'next/server';
import { groqJson, GroqError, text } from '../../../lib/groq';
import { omdbByTitle, tmdbFromImdb, hasOmdb } from '../../../lib/movies';
import { cached, HOUR } from '../../../lib/cache';

const SYSTEM = `You are CinemaHunt's programmer. Given a viewer's mood you pick films that actually fit it.

Return ONE raw JSON object, no prose and no markdown fence:
{
  "read": "one sentence reflecting the mood back, second person, under 18 words",
  "picks": [{ "title": "exact film title", "year": "YYYY", "because": "why it fits THIS mood, under 14 words" }]
}

Rules:
- Exactly 6 picks, ordered best fit first.
- Use the exact theatrical title so a database lookup resolves it. No subtitles you are unsure about.
- Spread them: do not return six films by one director or six from one decade, unless the request demands it.
- Respect the energy and runtime constraints given. Low energy means slow, quiet films; high energy means propulsive ones.
- At most two very famous blockbusters; the rest should be films the viewer plausibly has not seen.
- No spoilers in "because".`;

const ENERGY_WORDS = [
  [20, 'very low energy — they want something slow, quiet and undemanding'],
  [40, 'low energy — gentle pacing, nothing that shouts'],
  [60, 'medium energy — steady momentum, neither sleepy nor relentless'],
  [80, 'high energy — propulsive, keeps moving'],
  [101, 'very high energy — relentless, loud, maximal']
];

export async function POST(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Expected a JSON body.' }, { status: 400 });
  }

  const { mood, energy = 50, appetite = 'any', era = 'any', note } = body ?? {};
  if (!mood) return NextResponse.json({ error: 'A mood is required.' }, { status: 400 });
  if (!hasOmdb()) {
    return NextResponse.json(
      { error: 'OMDB_API_KEY is not set, so picks cannot be looked up. See .env.example.' },
      { status: 503 }
    );
  }

  const energyWord = ENERGY_WORDS.find(([max]) => energy < max)?.[1] ?? ENERGY_WORDS[2][1];
  const cacheKey = `mood:${mood}:${Math.round(energy / 20)}:${appetite}:${era}:${(note ?? '').slice(0, 40)}`;

  try {
    const picks = await cached(cacheKey, HOUR * 2, async () => {
      const raw = await groqJson({
        system: SYSTEM,
        temperature: 0.95,
        maxTokens: 1400,
        user: [
          `Mood: ${mood}`,
          `Energy: ${energy}/100 — ${energyWord}`,
          `Runtime appetite: ${appetite}`,
          `Era preference: ${era}`,
          note ? `They added: "${String(note).slice(0, 200)}"` : null
        ]
          .filter(Boolean)
          .join('\n')
      });

      return {
        read: text(raw?.read, ''),
        picks: (Array.isArray(raw?.picks) ? raw.picks : [])
          .map(p => ({ title: text(p?.title), year: text(p?.year), because: text(p?.because) }))
          .filter(p => p.title)
          .slice(0, 6)
      };
    });

    // Resolve each pick against OMDb so the UI has posters and real ids. A title the
    // model invented or mis-titled simply drops out rather than rendering broken.
    const resolved = await Promise.all(
      picks.picks.map(async pick => {
        try {
          const details = await omdbByTitle(pick.title, pick.year);
          if (!details) return null;
          const tmdb = await tmdbFromImdb(details.imdbId);
          return {
            imdbId: details.imdbId,
            title: details.title,
            year: details.year,
            poster: details.poster ?? tmdb?.poster ?? null,
            backdrop: tmdb?.backdropSmall ?? null,
            genres: details.genres,
            runtime: details.runtime,
            imdbRating: details.imdbRating,
            because: pick.because
          };
        } catch {
          return null;
        }
      })
    );

    const found = resolved.filter(Boolean);

    if (!found.length) {
      return NextResponse.json(
        { error: 'None of the suggested films could be resolved. Try a different mood.' },
        { status: 502 }
      );
    }

    return NextResponse.json({ read: picks.read, mood, picks: found });
  } catch (error) {
    const status = error instanceof GroqError ? error.status : 502;
    return NextResponse.json({ error: error.message }, { status });
  }
}
