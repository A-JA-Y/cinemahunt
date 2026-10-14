/**
 * Route an image through /api/img so WebGL can sample it.
 *
 * Only needed for textures (FlexCarousel, PaperCrumple) — plain <img> tags have no
 * CORS requirement and should point straight at the CDN.
 *
 * @param {string | null | undefined} url
 * @returns {string | null}
 */
export function texture(url) {
  if (!url) return null;
  return `/api/img?u=${encodeURIComponent(url)}`;
}
