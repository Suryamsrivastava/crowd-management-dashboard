import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { getErrorMessage } from '../api/client';
import { clearAnalyticsCache, getDemographics, getDwell, getFootfall, getOccupancy } from '../api/services';
import { CalendarIcon } from '../components/Icons';
import StatCard from '../components/StatCard';
import { useLive } from '../context/LiveContext';
import { DAY, dateKeyInTz, dayRange, formatDwell, formatHour, percentChange } from '../utils/time';

const HOUR = 3600 * 1000;
const REFRESH_MS = 5 * 60 * 1000; // historical charts only; live numbers come over the socket
const C = { primary: '#2a8c87', male: '#2a8c87', female: '#9ad7d3', live: '#c62828' };

/** Build hourly slots across the selected day so the x-axis always spans the full day. */
function toSlots(fromUtc, buckets, keys) {
  const start = Math.floor(fromUtc / HOUR) * HOUR;
  const byTs = new Map((buckets || []).map((b) => [b.utc, b]));
  const slots = [];
  for (let t = start; t <= fromUtc + DAY; t += HOUR) {
    const b = byTs.get(t);
    const row = { t };
    keys.forEach((k) => (row[k] = b ? b[k] : null));
    slots.push(row);
  }
  return slots;
}

const mean = (arr) => (arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : null);

function ChartTooltip({ active, payload, label, tz, unit = '' }) {
  if (!active || !payload?.length) return null;
  const rows = payload.filter((p) => p.value != null);
  if (!rows.length) return null;
  return (
    <div className="chart-tip">
      <div className="chart-tip__time">{formatHour(label, tz)}</div>
      {rows.map((p) => (
        <div key={p.dataKey} className="chart-tip__row">
          <span className="dot" style={{ background: p.color }} />
          {p.name}: <b>{Math.round(p.value)}</b>
          {unit}
        </div>
      ))}
    </div>
  );
}

export default function Dashboard() {
  const { siteId, timezone, live, onSiteEvent, site } = useLive();
  const todayKey = dateKeyInTz(Date.now(), timezone);
  const [dateKey, setDateKey] = useState(todayKey);
  const [data, setData] = useState({}); // { ff, ffPrev, dw, dwPrev, occ, occPrev, demo }
  // which keys are still loading (all start as loading until the first response)
  const [pending, setPending] = useState({ ff: true, ffPrev: true, dw: true, dwPrev: true, occ: true, occPrev: true, demo: true });
  const [errors, setErrors] = useState({});
  const [loadedRange, setLoadedRange] = useState(null);
  const [now, setNow] = useState(Date.now());
  const loadId = useRef(0);

  // Re-sync the selected date when the site (and therefore timezone) changes
  useEffect(() => setDateKey(dateKeyInTz(Date.now(), timezone)), [timezone]);

  const range = useMemo(() => dayRange(dateKey, timezone), [dateKey, timezone]);

  /**
   * Each metric loads independently so one slow/failed endpoint never blocks the
   * rest of the page. Current-period data is requested first; previous-day
   * comparison data is requested after it, to avoid piling load on the backend.
   */
  const load = useCallback(
    async (silent = false) => {
      if (!siteId) return;
      const id = ++loadId.current;
      const r = dayRange(dateKey, timezone);
      const prevFrom = r.fromUtc - DAY;
      const prevTo = r.toUtc - DAY;

      const current = {
        ff: () => getFootfall(siteId, r.fromUtc, r.toUtc),
        dw: () => getDwell(siteId, r.fromUtc, r.toUtc),
        occ: () => getOccupancy(siteId, r.fromUtc, r.toUtc),
        demo: () => getDemographics(siteId, r.fromUtc, r.toUtc),
      };
      const previous = {
        ffPrev: () => getFootfall(siteId, prevFrom, prevTo),
        dwPrev: () => getDwell(siteId, prevFrom, prevTo),
        occPrev: () => getOccupancy(siteId, prevFrom, prevTo),
      };

      if (!silent) {
        setData({});
        setPending(Object.fromEntries([...Object.keys(current), ...Object.keys(previous)].map((k) => [k, true])));
      }
      setErrors({});
      setLoadedRange(r);
      setNow(Date.now());

      const run = (fns) =>
        Promise.allSettled(
          Object.entries(fns).map(async ([key, fn]) => {
            try {
              const res = await fn();
              if (id !== loadId.current) return;
              setData((d) => ({ ...d, [key]: res }));
            } catch (err) {
              if (id !== loadId.current) return;
              setErrors((e) => ({ ...e, [key]: getErrorMessage(err, 'Failed to load') }));
            } finally {
              if (id === loadId.current) setPending((p) => ({ ...p, [key]: false }));
            }
          })
        );

      await run(current);
      if (id === loadId.current) await run(previous);
    },
    [siteId, dateKey, timezone]
  );

  useEffect(() => {
    load();
  }, [load]);

  // Light background refresh of historical aggregates for "today"
  useEffect(() => {
    if (!range.isToday) return;
    const id = setInterval(() => load(true), REFRESH_MS);
    return () => clearInterval(id);
  }, [range.isToday, load]);

  // Keep footfall in sync with live entry events (no polling)
  const [liveEntries, setLiveEntries] = useState(0);
  useEffect(() => setLiveEntries(0), [data.ff]);
  useEffect(() => {
    if (!range.isToday) return;
    return onSiteEvent((a) => a.direction === 'entry' && setLiveEntries((n) => n + 1));
  }, [onSiteEvent, range.isToday]);

  const retry = () => {
    clearAnalyticsCache();
    load();
  };

  // ----- derived values -----
  const fromUtc = loadedRange?.fromUtc ?? range.fromUtc;
  const occBuckets = useMemo(() => (data.occ?.buckets || []).filter((b) => b.utc + HOUR > fromUtc), [data.occ, fromUtc]);
  const prevOccBuckets = data.occPrev?.buckets || [];
  const demoBuckets = useMemo(() => (data.demo?.buckets || []).filter((b) => b.utc + HOUR > fromUtc), [data.demo, fromUtc]);

  const isToday = range.isToday;
  const liveValue = live?.siteOccupancy ?? (occBuckets.length ? Math.round(occBuckets[occBuckets.length - 1].avg) : null);
  const occupancyValue = isToday ? liveValue : occBuckets.length ? Math.round(mean(occBuckets.map((b) => b.avg))) : null;
  const occupancyPrev = isToday
    ? prevOccBuckets.length
      ? prevOccBuckets[prevOccBuckets.length - 1].avg
      : null
    : prevOccBuckets.length
      ? mean(prevOccBuckets.map((b) => b.avg))
      : null;

  const footfall = data.ff ? data.ff.footfall + (isToday ? liveEntries : 0) : null;
  const footfallPrev = data.ffPrev?.footfall ?? null;
  const dwell = data.dw?.avgDwellMinutes ?? null;
  const dwellPrev = data.dwPrev?.avgDwellMinutes ?? null;

  const occSeries = useMemo(() => toSlots(fromUtc, occBuckets, ['avg']), [fromUtc, occBuckets]);
  const demoSeries = useMemo(() => toSlots(fromUtc, demoBuckets, ['male', 'female']), [fromUtc, demoBuckets]);

  // Only failures of the main metrics are surfaced; a failed comparison just shows "No comparison data"
  const errorKeys = Object.keys(errors).filter((k) => !k.endsWith('Prev'));
  const errorText = errorKeys.length
    ? `Some data could not be loaded (${errorKeys
        .map((k) => ({ ff: 'footfall', dw: 'dwell time', occ: 'occupancy', demo: 'demographics' })[k])
        .join(', ')}): ${errors[errorKeys[0]]}`
    : '';

  const gender = useMemo(() => {
    if (isToday && live?.genderCount) return live.genderCount;
    if (!demoBuckets.length) return null;
    return { male: mean(demoBuckets.map((b) => b.male)), female: mean(demoBuckets.map((b) => b.female)) };
  }, [isToday, live, demoBuckets]);
  const genderTotal = gender ? gender.male + gender.female : 0;
  const malePct = genderTotal ? Math.round((gender.male / genderTotal) * 100) : 0;
  const femalePct = genderTotal ? 100 - malePct : 0;

  const xDomain = occSeries.length ? [occSeries[0].t, occSeries[occSeries.length - 1].t] : ['auto', 'auto'];
  const xTicks = occSeries.filter((_, i) => i % 2 === 0).map((s) => s.t);
  const tickFmt = (t) => formatHour(t, timezone);
  const compareLabel = isToday ? 'yesterday' : 'previous day';

  return (
    <div className="page">
      <div className="page__head">
        <h1>Overview</h1>
        <label className="date-picker">
          <CalendarIcon width={16} height={16} />
          <span className="date-picker__label">{isToday ? 'Today' : dateKey}</span>
          <input
            type="date"
            value={dateKey}
            max={todayKey}
            onChange={(e) => e.target.value && setDateKey(e.target.value)}
            aria-label="Select date"
          />
        </label>
      </div>

      {errorText && (
        <div className="banner banner--error" role="alert">
          {errorText}
          <button className="link-btn" onClick={retry}>
            Retry
          </button>
        </div>
      )}

      <h2 className="section-title">Occupancy</h2>
      <div className="stats">
        <div className="stats__group">
          <StatCard
            title={isToday ? 'Live Occupancy' : 'Avg Occupancy'}
            live={isToday && !!live}
            value={occupancyValue ?? '--'}
            delta={percentChange(occupancyValue, occupancyPrev)}
            deltaLabel={compareLabel}
            comparing={!!pending.occPrev}
            loading={occupancyValue == null && (pending.occ || (isToday && !live))}
          />
          <StatCard
            title={isToday ? "Today's Footfall" : 'Footfall'}
            value={footfall != null ? footfall.toLocaleString('en-US') : '--'}
            delta={percentChange(footfall, footfallPrev)}
            deltaLabel={compareLabel}
            loading={!!pending.ff}
            comparing={!!pending.ffPrev}
          />
        </div>
        <div className="stats__group">
          <StatCard
            title="Avg Dwell Time"
            value={formatDwell(dwell)}
            delta={percentChange(dwell, dwellPrev)}
            deltaLabel={compareLabel}
            loading={!!pending.dw}
            comparing={!!pending.dwPrev}
            hint={data.dw ? `${data.dw.dwellRecords} dwell records` : undefined}
          />
        </div>
      </div>

      <section className="card">
        <div className="card__head">
          <h3>Overall Occupancy</h3>
          <span className="legend-item">
            <span className="dot" style={{ background: C.primary }} /> Occupancy
          </span>
        </div>
        <div className="chart chart--tall">
          {pending.occ ? (
            <div className="skeleton skeleton--chart" />
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={occSeries} margin={{ top: 24, right: 16, left: 0, bottom: 8 }}>
                <defs>
                  <linearGradient id="occFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={C.primary} stopOpacity={0.22} />
                    <stop offset="100%" stopColor={C.primary} stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="4 4" stroke="var(--grid)" />
                <XAxis
                  dataKey="t"
                  type="number"
                  scale="time"
                  domain={xDomain}
                  ticks={xTicks}
                  tickFormatter={tickFmt}
                  tick={{ fontSize: 12, fill: 'var(--muted)' }}
                  label={{ value: 'Time', position: 'insideBottom', offset: -4, fontSize: 12, fill: 'var(--text)' }}
                  height={40}
                />
                <YAxis
                  tick={{ fontSize: 12, fill: 'var(--muted)' }}
                  label={{ value: 'Count', angle: -90, position: 'insideLeft', offset: 18, fontSize: 12, fill: 'var(--text)' }}
                  allowDecimals={false}
                  width={56}
                />
                <Tooltip content={<ChartTooltip tz={timezone} />} />
                <Area
                  type="monotone"
                  dataKey="avg"
                  name="Occupancy"
                  stroke={C.primary}
                  strokeWidth={2}
                  fill="url(#occFill)"
                  connectNulls={false}
                  isAnimationActive={false}
                />
                {isToday && (
                  <ReferenceLine
                    x={now}
                    stroke={C.live}
                    strokeDasharray="4 3"
                    label={{ value: 'LIVE', position: 'top', fill: C.live, fontSize: 11, fontWeight: 700 }}
                  />
                )}
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>
      </section>

      <h2 className="section-title">Demographics</h2>
      <div className="demo-grid">
        <section className="card">
          <div className="card__head">
            <h3>Chart of Demographics</h3>
          </div>
          {pending.demo && !gender ? (
            <div className="skeleton skeleton--chart" />
          ) : gender ? (
            <>
              <div className="donut">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={[
                        { name: 'Males', value: gender.male },
                        { name: 'Females', value: gender.female },
                      ]}
                      dataKey="value"
                      innerRadius="68%"
                      outerRadius="92%"
                      paddingAngle={2}
                      startAngle={90}
                      endAngle={-270}
                      stroke="none"
                      isAnimationActive={false}
                    >
                      <Cell fill={C.male} />
                      <Cell fill={C.female} />
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
                <div className="donut__center">
                  <span>Total Crowd</span>
                  <b>{isToday && live ? Math.round(genderTotal) : '100%'}</b>
                </div>
              </div>
              <ul className="donut-legend">
                <li>
                  <span className="dot" style={{ background: C.male }} />
                  <b>{malePct}%</b> Males
                </li>
                <li>
                  <span className="dot" style={{ background: C.female }} />
                  <b>{femalePct}%</b> Females
                </li>
              </ul>
            </>
          ) : (
            <p className="empty">No demographic data for this period</p>
          )}
        </section>

        <section className="card">
          <div className="card__head">
            <h3>Demographics Analysis</h3>
          </div>
          <div className="chart">
            {pending.demo ? (
              <div className="skeleton skeleton--chart" />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={demoSeries} margin={{ top: 8, right: 16, left: 0, bottom: 8 }}>
                  <defs>
                    <linearGradient id="maleFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={C.male} stopOpacity={0.18} />
                      <stop offset="100%" stopColor={C.male} stopOpacity={0.02} />
                    </linearGradient>
                    <linearGradient id="femaleFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={C.female} stopOpacity={0.25} />
                      <stop offset="100%" stopColor={C.female} stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="4 4" stroke="var(--grid)" />
                  <XAxis
                    dataKey="t"
                    type="number"
                    scale="time"
                    domain={xDomain}
                    ticks={xTicks}
                    tickFormatter={tickFmt}
                    tick={{ fontSize: 12, fill: 'var(--muted)' }}
                    label={{ value: 'Time', position: 'insideBottom', offset: -4, fontSize: 12, fill: 'var(--text)' }}
                    height={40}
                  />
                  <YAxis
                    tick={{ fontSize: 12, fill: 'var(--muted)' }}
                    label={{ value: 'Count', angle: -90, position: 'insideLeft', offset: 18, fontSize: 12, fill: 'var(--text)' }}
                    allowDecimals={false}
                    width={56}
                  />
                  <Tooltip content={<ChartTooltip tz={timezone} />} />
                  <Legend verticalAlign="top" align="right" iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12, top: -6 }} />
                  <Area type="monotone" dataKey="male" name="Male" stroke={C.male} strokeWidth={2} fill="url(#maleFill)" isAnimationActive={false} />
                  <Area type="monotone" dataKey="female" name="Female" stroke={C.female} strokeWidth={2} fill="url(#femaleFill)" isAnimationActive={false} />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </section>
      </div>

      <p className="footnote">
        Times shown in site local time ({timezone}){site ? ` · ${site.city}, ${site.country}` : ''}. Comparisons use the same
        time window on the previous day.
      </p>
    </div>
  );
}
