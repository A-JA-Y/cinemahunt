import { NextResponse } from 'next/server';
import { groqJson, GroqError, text } from '../../../lib/groq';
import { omdbByTitle, tmdbFromImdb, hasOmdb } from '../../../lib/movies';

// Recommendations from a viewer's liked films. The previous build just re-ran an
// OMDb title search on one random like, which returned sequels and re-releases of
// the same film. This reads the taste behind the list instead.

const SYSTEM = `You are CinemaHunt's programmer. You read a viewer's liked films and infer their taste.

Return ONE raw JSON object, no prose and no markdown fence:
{
  "taste": "one sentence naming the thread running through their likes, second person, under 22 words",
  "picks": [{ "title": "exact film title", "year": "YYYY", "because": "ties it to their specific likes, under 16 words" }]
}

Rules:
- Exactly 8 picks, best fit first.
- Never recommend a film already in their liked list, nor a sequel or remake of one.
- Use exact theatrical titles so a database lookup resolves them.
- Reach past the obvious: at most two films that anyone with these likes would already know.
- "because" must reference what in their list it connects to, not generic praise.`;

export async function POST(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Expected a JSON body.' }, { status: 400 });
  }

  const liked = (Array.isArray(body?.liked) ? body.liked : [])
    .map(m => ({ title: text(m?.title), year: text(m?.year) }))
    .filter(m => m.title)
    .slice(0, 40);

  if (!liked.length) {
    return NextResponse.json({ error: 'Like a few films first and this will have something to read.' }, { status: 400 });
  }
  if (!hasOmdb()) {
    return NextResponse.json({ error: 'OMDB_API_KEY is not set. See .env.example.' }, { status: 503 });
  }

  const seen = new Set(liked.map(m => m.title.toLowerCase()));

  try {
    const raw = await groqJson({
      system: SYSTEM,
      temperature: 0.9,
      maxTokens: 1800,
      user: `Liked films:\n${liked.map(m => `- ${m.title}${m.year ? ` (${m.year})` : ''}`).join('\n')}`
    });

    const picks = (Array.isArray(raw?.picks) ? raw.picks : [])
      .map(p => ({ title: text(p?.title), year: text(p?.year), because: text(p?.because) }))
      .filter(p => p.title && !seen.has(p.title.toLowerCase()))
      .slice(0, 8);

    const resolved = await Promise.all(
      picks.map(async pick => {
        try {
          const details = await omdbByTitle(pick.title, pick.year);
          if (!details || seen.has(details.title.toLowerCase())) return null;
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

    return NextResponse.json({
      taste: text(raw?.taste, ''),
      picks: resolved.filter(Boolean)
    });
  } catch (error) {
    const status = error instanceof GroqError ? error.status : 502;
    return NextResponse.json({ error: error.message }, { status });
  }
}
