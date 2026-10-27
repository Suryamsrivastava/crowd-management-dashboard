import { TrendIcon } from './Icons';

export function Delta({ value, label = 'yesterday', comparing }) {
  if (value == null) {
    return (
      <span className="delta delta--muted">{comparing ? `Comparing with ${label}…` : 'No comparison data'}</span>
    );
  }
  const rounded = Math.abs(value) < 0.05 ? 0 : value;
  const up = rounded >= 0;
  return (
    <span className={`delta ${rounded === 0 ? 'delta--muted' : up ? 'delta--up' : 'delta--down'}`}>
      <TrendIcon up={up} />
      <span>
        {Math.abs(rounded).toFixed(rounded === 0 ? 0 : 1)}% {rounded === 0 ? 'same as' : up ? 'More than' : 'Less than'}{' '}
        {label}
      </span>
    </span>
  );
}

export default function StatCard({ title, value, delta, deltaLabel, loading, comparing, live, hint }) {
  return (
    <div className="stat">
      <div className="stat__title">
        {title}
        {live && <span className="pill-live">LIVE</span>}
      </div>
      {loading ? (
        <div className="skeleton skeleton--value" />
      ) : (
        <div className="stat__value" title={hint}>
          {value}
        </div>
      )}
      {loading ? (
        <div className="skeleton skeleton--line" />
      ) : (
        <Delta value={delta} label={deltaLabel} comparing={comparing} />
      )}
    </div>
  );
}
