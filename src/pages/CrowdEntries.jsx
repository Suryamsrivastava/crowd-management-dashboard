import { useCallback, useEffect, useState } from 'react';
import { getErrorMessage } from '../api/client';
import { getEntryExit } from '../api/services';
import { CalendarIcon, ChevronIcon } from '../components/Icons';
import { useLive } from '../context/LiveContext';
import { dateKeyInTz, dayRange, formatDwell, formatTime } from '../utils/time';

const PAGE_SIZES = [10, 25, 50];

/** Page list with ellipses: 1 … 4 5 6 … 20 */
function pageList(current, total) {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const pages = new Set([1, total, current, current - 1, current + 1]);
  if (current <= 3) [2, 3, 4].forEach((p) => pages.add(p));
  if (current >= total - 2) [total - 3, total - 2, total - 1].forEach((p) => pages.add(p));
  const sorted = [...pages].filter((p) => p >= 1 && p <= total).sort((a, b) => a - b);
  const out = [];
  sorted.forEach((p, i) => {
    if (i > 0 && p - sorted[i - 1] > 1) out.push(`gap-${p}`);
    out.push(p);
  });
  return out;
}

function Avatar({ name, gender }) {
  const initials = (name || '?')
    .replace(/^(mr|mrs|ms|dr|miss)\.?\s+/i, '')
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase();
  return <span className={`person-avatar person-avatar--${gender || 'x'}`}>{initials}</span>;
}

export default function CrowdEntries() {
  const { siteId, timezone } = useLive();
  const todayKey = dateKeyInTz(Date.now(), timezone);
  const [dateKey, setDateKey] = useState(todayKey);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => setDateKey(dateKeyInTz(Date.now(), timezone)), [timezone]);
  useEffect(() => setPage(1), [siteId, dateKey, pageSize]);

  const load = useCallback(async () => {
    if (!siteId) return;
    setLoading(true);
    setError('');
    try {
      const { fromUtc, toUtc } = dayRange(dateKey, timezone);
      const res = await getEntryExit({ siteId, fromUtc, toUtc, pageNumber: page, pageSize });
      setResult(res);
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to load entries'));
    } finally {
      setLoading(false);
    }
  }, [siteId, dateKey, timezone, page, pageSize]);

  useEffect(() => {
    load();
  }, [load]);

  const records = result?.records || [];
  const totalPages = result?.totalPages || 0;
  const total = result?.totalRecords || 0;
  const startIdx = total ? (page - 1) * pageSize + 1 : 0;
  const endIdx = Math.min(page * pageSize, total);

  return (
    <div className="page">
      <div className="page__head">
        <div>
          <h1>Crowd Entries</h1>
          <p className="page__sub">Visitor entry and exit records with dwell time</p>
        </div>
        <div className="page__tools">
          <button className="btn btn--ghost" onClick={load} disabled={loading}>
            Refresh
          </button>
          <label className="date-picker">
            <CalendarIcon width={16} height={16} />
            <span className="date-picker__label">{dateKey === todayKey ? 'Today' : dateKey}</span>
            <input
              type="date"
              value={dateKey}
              max={todayKey}
              onChange={(e) => e.target.value && setDateKey(e.target.value)}
              aria-label="Select date"
            />
          </label>
        </div>
      </div>

      {error && (
        <div className="banner banner--error" role="alert">
          {error}
          <button className="link-btn" onClick={load}>
            Retry
          </button>
        </div>
      )}

      <section className="card card--flush">
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Sex</th>
                <th>Entry</th>
                <th>Exit</th>
                <th>Dwell Time</th>
                <th className="hide-sm">Zone</th>
              </tr>
            </thead>
            <tbody className={loading && result ? 'is-loading' : ''}>
              {loading && !result &&
                Array.from({ length: 8 }).map((_, i) => (
                  <tr key={i}>
                    <td colSpan={6}>
                      <div className="skeleton skeleton--row" />
                    </td>
                  </tr>
                ))}
              {!loading && records.length === 0 && (
                <tr>
                  <td colSpan={6} className="empty">
                    No entries for this day
                  </td>
                </tr>
              )}
              {records.map((r) => (
                <tr key={`${r.personId}-${r.entryUtc}`}>
                  <td>
                    <div className="person">
                      <Avatar name={r.personName} gender={r.gender} />
                      <span>{r.personName}</span>
                    </div>
                  </td>
                  <td className="cap">{r.gender || '--'}</td>
                  <td>{formatTime(r.entryUtc, timezone)}</td>
                  <td>{r.exitUtc ? formatTime(r.exitUtc, timezone) : '--'}</td>
                  <td>
                    {r.dwellMinutes != null ? (
                      formatDwell(r.dwellMinutes)
                    ) : (
                      <span className="tag-inside">Inside</span>
                    )}
                  </td>
                  <td className="hide-sm">
                    <span className={`badge badge--${r.severity}`} title={r.zoneName}>
                      {r.severity ? `${r.severity[0].toUpperCase()}${r.severity.slice(1)}` : '--'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="pager">
          <span className="pager__info">
            {total ? `${startIdx}–${endIdx} of ${total.toLocaleString('en-US')}` : ''}
          </span>
          {totalPages > 1 && (
            <nav className="pager__pages" aria-label="Pagination">
              <button className="icon-btn" disabled={page <= 1 || loading} onClick={() => setPage((p) => p - 1)} aria-label="Previous page">
                <ChevronIcon dir="left" width={16} height={16} />
              </button>
              {pageList(page, totalPages).map((p) =>
                typeof p === 'string' ? (
                  <span key={p} className="pager__gap">
                    …
                  </span>
                ) : (
                  <button
                    key={p}
                    className={`pager__num ${p === page ? 'is-active' : ''}`}
                    onClick={() => setPage(p)}
                    aria-current={p === page ? 'page' : undefined}
                    disabled={loading}
                  >
                    {p}
                  </button>
                )
              )}
              <button className="icon-btn" disabled={page >= totalPages || loading} onClick={() => setPage((p) => p + 1)} aria-label="Next page">
                <ChevronIcon dir="right" width={16} height={16} />
              </button>
            </nav>
          )}
          <label className="pager__size">
            Rows
            <select value={pageSize} onChange={(e) => setPageSize(Number(e.target.value))}>
              {PAGE_SIZES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </label>
        </div>
      </section>
    </div>
  );
}
