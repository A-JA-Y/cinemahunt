/**
 * PWA manifest. Next serves this at /manifest.webmanifest and links it from the
 * document head automatically.
 */
export default function manifest() {
  return {
    name: 'CinemaHunt — how a film feels',
    short_name: 'CinemaHunt',
    description:
      'Search any film and read its emotional shape: a scroll-driven vibe meter, a spoiler-free synopsis, trailers, and where to stream it tonight.',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    orientation: 'portrait-primary',
    background_color: '#07070a',
    theme_color: '#07070a',
    categories: ['entertainment', 'lifestyle'],
    icons: [
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      // Separate maskable set: launchers crop these into a circle or squircle, so
      // they carry extra padding the `any` icons would waste.
      { src: '/icons/maskable-192.png', sizes: '192x192', type: 'image/png', purpose: 'maskable' },
      { src: '/icons/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }
    ],
    shortcuts: [
      { name: 'Search films', short_name: 'Search', url: '/#search' },
      { name: 'Pick by mood', short_name: 'Mood', url: '/#mood' },
      { name: 'Your list', short_name: 'List', url: '/recomendations' }
    ]
  };
}
