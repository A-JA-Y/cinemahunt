/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    // Posters and stills render through plain <img> (WebGL textures need raw URLs
    // anyway, via /api/img). remotePatterns is kept for any future next/image use —
    // the old `domains` array is deprecated in Next 15.
    remotePatterns: [
      { protocol: 'https', hostname: 'm.media-amazon.com' },
      { protocol: 'https', hostname: 'image.tmdb.org' }
    ]
  }
};

export default nextConfig;
