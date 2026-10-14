// Grey shimmer placeholder shown while a screen loads.
export default function Skeleton({ lines = 4, hero = false }) {
  return (
    <div role="status" aria-busy="true">
      {hero && <div className="skeleton sk-hero" />}
      <div className="card">
        <div className="skeleton sk-title" />
        {Array.from({ length: lines }).map((_, i) => (
          <div key={i} className={'skeleton sk-line' + (i % 3 === 2 ? ' s' : '')} />
        ))}
      </div>
      <span className="sr-only">Loading…</span>
    </div>
  );
}
