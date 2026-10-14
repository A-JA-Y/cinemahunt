// Server-only movie data layer.
//
// OMDb supplies search, ratings and credits. TMDB supplies the things OMDb has no
// concept of: backdrop stills (OMDb only ever returns a portrait poster, which a
// full-bleed layout can't use) and real streaming availability via its
// JustWatch-backed watch/providers endpoint.
//
// Both keys stay on the server. The previous build shipped the OMDb key to the
// browser as NEXT_PUBLIC_OMDB_API_KEY, which let anyone lift it out of the bundle.

import { cached, DAY, HOUR } from './cache';

const OMDB = 'https://www.omdbapi.com/';
export const TMDB_IMAGE = 'https://image.tmdb.org/t/p';

// TMDB serves the same API from two official hostnames. Several Indian ISPs
// DNS-hijack api.themoviedb.org (it resolves to an ISP-owned address and the
// connection then hangs until it times out), while api.tmdb.org resolves normally.
// Try the unblocked one first and fall back, so the app works on either network.
const TMDB_HOSTS = ['https://api.tmdb.org/3', 'https://api.themoviedb.org/3'];

// Remembered for the life of the process: once a host answers, stop paying the
// blocked host's timeout on every single request.
let liveTmdbHost = null;

export class DataError extends Error {
  constructor(message, status = 502) {
    super(message);
    this.name = 'DataError';
    this.status = status;
  }
}

/**
 * Pull the bare key out of whatever is in the env var.
 *
 * OMDb mails you the key embedded in a sample URL
 * ("http://www.omdbapi.com/?i=tt3896198&apikey=abc12345"), so that whole string is
 * the obvious thing to paste. Accept it, along with `apikey=abc12345` and the bare
 * key, rather than failing with an unhelpful 401 from upstream.
 */
function readKey(raw) {
  if (!raw) return null;

  // Strip quotes a .env file does not need but people reasonably add.
  let value = raw.trim().replace(/^["']|["']$/g, '');
  if (!value) return null;

  const match = value.match(/[?&]?apikey=([^&\s]+)/i);
  if (match) return match[1];

  // A URL with no apikey param at all is a paste mistake, not a key.
  if (/^https?:\/\//i.test(value)) return null;

  return value;
}

export function omdbKey() {
  return readKey(process.env.OMDB_API_KEY);
}

/**
 * TMDB hands out two credentials on the same settings page: a short v3 "API Key"
 * and a long v4 "API Read Access Token". Both authenticate the /3/ endpoints this
 * file uses, so accept either variable and let tmdbRequest pick the auth style.
 */
export function tmdbKey() {
  return readKey(process.env.TMDB_API_KEY) ?? readKey(process.env.TMDB_ACCESS_TOKEN);
}

export function hasOmdb() {
  return Boolean(omdbKey());
}

export function hasTmdb() {
  return Boolean(tmdbKey());
}

async function getJson(url, init, timeoutMs = 12_000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { ...init, signal: controller.signal });
    if (!res.ok) throw new DataError(`Upstream returned ${res.status}.`, res.status === 404 ? 404 : 502);
    return await res.json();
  } catch (error) {
    if (error.name === 'AbortError') throw new DataError('Upstream request timed out.', 504);
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

// ---------------------------------------------------------------- OMDb

function omdbUrl(params) {
  const key = omdbKey();
  if (!key) {
    throw new DataError(
      'OMDB_API_KEY is missing or unreadable. Put just the key in .env — see .env.example.',
      503
    );
  }
  const search = new URLSearchParams({ ...params, apikey: key });
  return `${OMDB}?${search}`;
}

export async function omdbSearch(query, page = 1) {
  const data = await getJson(omdbUrl({ s: query, type: 'movie', page: String(page) }));
  if (data.Response === 'False') {
    // "Movie not found!" is a legitimate empty result, not a failure.
    if (/not found/i.test(data.Error ?? '')) return { results: [], total: 0 };
    throw new DataError(data.Error || 'OMDb search failed.', 502);
  }
  return {
    results: (data.Search ?? []).map(normalizeSearchHit),
    total: Number.parseInt(data.totalResults, 10) || 0
  };
}

export async function omdbDetails(imdbId) {
  const data = await getJson(omdbUrl({ i: imdbId, plot: 'full' }));
  if (data.Response === 'False') throw new DataError(data.Error || 'Movie not found.', 404);
  return normalizeDetails(data);
}

export async function omdbByTitle(title, year) {
  const data = await getJson(omdbUrl(year ? { t: title, y: year, plot: 'full' } : { t: title, plot: 'full' }));
  if (data.Response === 'False') return null;
  return normalizeDetails(data);
}

const clean = value => (value && value !== 'N/A' ? value : null);

function normalizeSearchHit(hit) {
  return {
    imdbId: hit.imdbID,
    title: hit.Title,
    year: hit.Year,
    poster: clean(hit.Poster)
  };
}

function normalizeDetails(data) {
  const ratings = {};
  for (const entry of data.Ratings ?? []) {
    if (entry.Source === 'Internet Movie Database') ratings.imdb = entry.Value;
    if (entry.Source === 'Rotten Tomatoes') ratings.rottenTomatoes = entry.Value;
    if (entry.Source === 'Metacritic') ratings.metacritic = entry.Value;
  }

  const list = value => (clean(value) ? value.split(',').map(s => s.trim()).filter(Boolean) : []);

  return {
    imdbId: data.imdbID,
    title: data.Title,
    year: clean(data.Year),
    rated: clean(data.Rated),
    released: clean(data.Released),
    runtime: clean(data.Runtime),
    runtimeMinutes: Number.parseInt(data.Runtime, 10) || null,
    genres: list(data.Genre),
    director: clean(data.Director),
    writers: list(data.Writer),
    actors: list(data.Actors),
    plot: clean(data.Plot),
    language: clean(data.Language),
    country: clean(data.Country),
    awards: clean(data.Awards),
    poster: clean(data.Poster),
    imdbRating: clean(data.imdbRating),
    imdbVotes: clean(data.imdbVotes),
    boxOffice: clean(data.BoxOffice),
    ratings
  };
}

// ---------------------------------------------------------------- TMDB

// TMDB's settings page hands out two credential styles: a v3 key (query param) and
// a v4 read token (JWT, Bearer header). Accept whichever the user pasted.
async function tmdbRequest(path, params = {}) {
  const key = tmdbKey();
  if (!key) throw new DataError('TMDB_API_KEY is missing or unreadable. See .env.example.', 503);

  const isV4Token = key.startsWith('eyJ');
  const search = new URLSearchParams(isV4Token ? params : { ...params, api_key: key });
  const init = isV4Token ? { headers: { Authorization: `Bearer ${key}` } } : undefined;

  const hosts = liveTmdbHost ? [liveTmdbHost] : TMDB_HOSTS;
  let lastError;

  for (const host of hosts) {
    try {
      // Short timeout while probing: a DNS-hijacked host hangs the full window,
      // and we have another one to try.
      const data = await getJson(`${host}${path}?${search}`, init, liveTmdbHost ? 12_000 : 6_000);
      liveTmdbHost = host;
      return data;
    } catch (error) {
      lastError = error;
      // A 404 is a real answer from a reachable host — don't blame the network.
      if (error instanceof DataError && error.status === 404) {
        liveTmdbHost = host;
        throw error;
      }
      // This host may have gone bad since we pinned it; re-probe next time.
      if (liveTmdbHost === host) liveTmdbHost = null;
    }
  }

  throw lastError ?? new DataError('TMDB is unreachable.', 502);
}

/** Resolve an IMDb id to TMDB's record, which is what carries the backdrop. */
export async function tmdbFromImdb(imdbId) {
  if (!hasTmdb()) return null;
  return cached(`tmdb:find:${imdbId}`, DAY, async () => {
    try {
      const found = await tmdbRequest(`/find/${imdbId}`, { external_source: 'imdb_id' });
      const movie = found?.movie_results?.[0];
      if (!movie) return null;
      return {
        tmdbId: movie.id,
        backdrop: movie.backdrop_path ? `${TMDB_IMAGE}/original${movie.backdrop_path}` : null,
        backdropSmall: movie.backdrop_path ? `${TMDB_IMAGE}/w780${movie.backdrop_path}` : null,
        poster: movie.poster_path ? `${TMDB_IMAGE}/w500${movie.poster_path}` : null,
        tagline: null,
        overview: movie.overview || null,
        voteAverage: movie.vote_average ?? null
      };
    } catch {
      // TMDB is an enhancement — never let it take down a page that OMDb can serve.
      return null;
    }
  });
}

/**
 * Real streaming availability. TMDB resells JustWatch data, so this is actual
 * availability rather than a guess — and it comes with a deep link per region.
 */
export async function tmdbProviders(tmdbId, region = 'US') {
  if (!hasTmdb() || !tmdbId) return null;
  return cached(`tmdb:providers:${tmdbId}:${region}`, HOUR * 6, async () => {
    try {
      const data = await tmdbRequest(`/movie/${tmdbId}/watch/providers`);
      const forRegion = data?.results?.[region];
      if (!forRegion) {
        return { region, link: null, stream: [], rent: [], buy: [], free: [], available: false };
      }
      const map = entries =>
        (entries ?? []).map(p => ({
          id: p.provider_id,
          name: p.provider_name,
          logo: p.logo_path ? `${TMDB_IMAGE}/w92${p.logo_path}` : null
        }));

      const stream = map(forRegion.flatrate);
      const rent = map(forRegion.rent);
      const buy = map(forRegion.buy);
      const free = [...map(forRegion.free), ...map(forRegion.ads)];

      return {
        region,
        link: forRegion.link ?? null,
        stream,
        rent,
        buy,
        free,
        available: Boolean(stream.length || rent.length || buy.length || free.length),
        regionsWithData: Object.keys(data?.results ?? {})
      };
    } catch {
      return null;
    }
  });
}

/** Trending films — the poster stream the hero carousel flows through. */
export async function tmdbTrending() {
  if (!hasTmdb()) return [];
  return cached('tmdb:trending', HOUR * 3, async () => {
    try {
      const data = await tmdbRequest('/trending/movie/week');
      return (data?.results ?? [])
        .filter(m => m.poster_path)
        .slice(0, 14)
        .map(m => ({
          tmdbId: m.id,
          title: m.title,
          year: m.release_date ? m.release_date.slice(0, 4) : null,
          poster: `${TMDB_IMAGE}/w500${m.poster_path}`,
          backdrop: m.backdrop_path ? `${TMDB_IMAGE}/w1280${m.backdrop_path}` : null,
          voteAverage: m.vote_average ?? null
        }));
    } catch {
      return [];
    }
  });
}

/** TMDB's own id -> IMDb id, so Firestore likes stay keyed on imdbID as before. */
export async function tmdbExternalIds(tmdbId) {
  if (!hasTmdb() || !tmdbId) return null;
  return cached(`tmdb:external:${tmdbId}`, DAY, async () => {
    try {
      const data = await tmdbRequest(`/movie/${tmdbId}/external_ids`);
      return data?.imdb_id ?? null;
    } catch {
      return null;
    }
  });
}

/**
 * Trailers and clips from TMDB's videos endpoint — real YouTube keys published by
 * the studio, not a search guess.
 *
 * Ordered so the main trailer wins: official first, then Trailer over Teaser over
 * everything else, then newest.
 */
export async function tmdbVideos(tmdbId) {
  if (!hasTmdb() || !tmdbId) return [];
  return cached(`tmdb:videos:${tmdbId}`, DAY, async () => {
    try {
      const data = await tmdbRequest(`/movie/${tmdbId}/videos`);

      const rank = video => {
        if (video.type === 'Trailer') return video.official ? 0 : 1;
        if (video.type === 'Teaser') return video.official ? 2 : 3;
        if (video.type === 'Clip') return 4;
        return 5;
      };

      return (data?.results ?? [])
        .filter(v => v.site === 'YouTube' && v.key)
        .sort((a, b) => rank(a) - rank(b) || new Date(b.published_at ?? 0) - new Date(a.published_at ?? 0))
        .slice(0, 6)
        .map(v => ({
          key: v.key,
          name: v.name,
          type: v.type,
          official: Boolean(v.official),
          url: `https://www.youtube.com/watch?v=${v.key}`,
          embed: `https://www.youtube-nocookie.com/embed/${v.key}`,
          // hqdefault always exists; maxresdefault 404s on plenty of videos.
          thumb: `https://i.ytimg.com/vi/${v.key}/hqdefault.jpg`
        }));
    } catch {
      return [];
    }
  });
}
