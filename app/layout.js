import { Geist, Geist_Mono, Instrument_Serif } from 'next/font/google';
import './globals.css';
import SmoothScroll from './components/motion/SmoothScroll';
import ServiceWorker from './components/ServiceWorker';
import Preloader from './components/Preloader';

const geistSans = Geist({ variable: '--font-geist-sans', subsets: ['latin'], display: 'swap' });
const geistMono = Geist_Mono({ variable: '--font-geist-mono', subsets: ['latin'], display: 'swap' });

// The editorial voice of the whole UI. One weight, used large.
const instrument = Instrument_Serif({
  variable: '--font-instrument',
  subsets: ['latin'],
  weight: '400',
  style: ['normal', 'italic'],
  display: 'swap'
});

export const metadata = {
  title: 'CinemaHunt — find the film that fits the mood',
  description:
    'Search any film and read how it actually feels: a scroll-driven vibe meter, a spoiler-free AI synopsis, and where to stream it right now.',
  openGraph: {
    title: 'CinemaHunt',
    description: 'How a film feels, before you press play.',
    type: 'website'
  },
  applicationName: 'CinemaHunt',
  appleWebApp: {
    capable: true,
    title: 'CinemaHunt',
    // The dock sits over the safe area, so the status bar blends into the page.
    statusBarStyle: 'black-translucent'
  },
  icons: {
    icon: [
      { url: '/icons/icon.svg', type: 'image/svg+xml' },
      { url: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' }
    ],
    apple: '/icons/apple-touch-icon.png'
  }
};

export const viewport = {
  // The real value is rewritten before paint by BOOT below and on every theme
  // change by theme.js; these are the fallbacks for a no-JS visitor.
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#f4f1ea' },
    { media: '(prefers-color-scheme: dark)', color: '#07070a' }
  ],
  colorScheme: 'light dark'
};

// Runs before first paint, so neither the theme nor the reveal states flash.
//
// Theme: reads the saved choice and sets data-theme. "system" (or nothing saved)
// leaves the attribute off, which hands control to the prefers-color-scheme block
// in globals.css.
//
// Motion: arms the hidden start state for every scroll reveal, with two escape
// hatches so content can never be trapped invisible —
//   - no JS at all  -> class never added -> the page renders fully visible
//   - JS but motion code never boots -> the timeout strips it back to visible
const BOOT = `(function(){var r=document.documentElement;
try{
  var t=localStorage.getItem('ch:theme');
  if(t==='light'||t==='dark'||t==='amoled'){
    r.setAttribute('data-theme',t);
    var m=document.querySelector('meta[name="theme-color"]');
    if(m)m.setAttribute('content',t==='light'?'#f4f1ea':t==='amoled'?'#000000':'#07070a');
  }
}catch(e){}
try{
  var reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;
  // Retire the curtain before paint when it would be unwelcome or redundant.
  if(reduce||sessionStorage.getItem('ch:preloaded')==='1')r.setAttribute('data-preloaded','true');
  if(reduce)return;
  r.classList.add('motion-ready');
  setTimeout(function(){if(!window.__chMotionReady)r.classList.remove('motion-ready');},4000);
}catch(e){}})();`;

export default function RootLayout({ children }) {
  return (
    // The font variables must sit on <html>, not <body>: globals.css composes them
    // into --font-display / --font-sans inside @theme, which resolves on :root. If
    // they were only on <body>, those nested var() lookups would be invalid there
    // and every font-family built on them would silently fall back.
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${instrument.variable}`}
      /* BOOT below sets data-theme and a class on <html> before React hydrates,
         so the server and client markup differ here by design. */
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: BOOT }} />
      </head>
      <body className="ch-grain antialiased">
        {/* Rendered in the server HTML so it covers the very first paint. */}
        <Preloader />
        <SmoothScroll>{children}</SmoothScroll>
        <ServiceWorker />
      </body>
    </html>
  );
}
