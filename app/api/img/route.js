// Image proxy for WebGL textures.
//
// FlexCarousel (ogl) and PaperCrumple (three) both load posters with
// crossOrigin='anonymous'. m.media-amazon.com sends Access-Control-Allow-Origin: *
// so OMDb posters work directly, but image.tmdb.org sends no CORS header at all —
// its textures fail to upload and the canvas renders empty. Re-serving them from
// our own origin with the header attached is the fix.
//
// Strictly host-allowlisted: an unrestricted fetch-and-serve endpoint is an open
// proxy that anyone could point at an internal address or use to launder traffic.

const ALLOWED_HOSTS = new Set(['image.tmdb.org', 'm.media-amazon.com', 'ia.media-imdb.com']);

const ALLOWED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/avif', 'image/gif']);

export async function GET(request) {
  const raw = new URL(request.url).searchParams.get('u');
  if (!raw) return new Response('Missing ?u', { status: 400 });

  let target;
  try {
    target = new URL(raw);
  } catch {
    return new Response('Malformed url', { status: 400 });
  }

  if (target.protocol !== 'https:' || !ALLOWED_HOSTS.has(target.hostname)) {
    return new Response('Host not allowed', { status: 403 });
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 12_000);

  try {
    const upstream = await fetch(target, { signal: controller.signal, redirect: 'follow' });
    if (!upstream.ok) return new Response('Upstream error', { status: 502 });

    const type = (upstream.headers.get('content-type') ?? '').split(';')[0].trim().toLowerCase();
    if (!ALLOWED_TYPES.has(type)) return new Response('Not an image', { status: 415 });

    return new Response(upstream.body, {
      headers: {
        'Content-Type': type,
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'public, max-age=31536000, immutable',
        'X-Content-Type-Options': 'nosniff'
      }
    });
  } catch (error) {
    return new Response(error.name === 'AbortError' ? 'Upstream timed out' : 'Proxy failed', { status: 502 });
  } finally {
    clearTimeout(timer);
  }
}
