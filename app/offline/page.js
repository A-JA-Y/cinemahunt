import Link from 'next/link';

export const metadata = {
  title: 'Offline — CinemaHunt'
};

/** Served by the service worker when a navigation fails with no cached copy. */
export default function OfflinePage() {
  return (
    <main className="ch-shell grid min-h-screen place-content-center">
      <p className="ch-tag">No connection</p>
      <h1 className="ch-display mt-6 max-w-[16ch]">The projector needs a signal.</h1>
      <p className="ch-lead mt-6 max-w-[42ch]">
        Search, vibe meters and availability all need the network. Pages you have already
        opened are still readable from here.
      </p>
      <Link href="/" className="ch-btn ch-btn--ghost mt-10 w-fit">
        Try again
      </Link>
    </main>
  );
}
