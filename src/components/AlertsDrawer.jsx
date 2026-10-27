import { useEffect } from 'react';
import { useLive } from '../context/LiveContext';
import { formatDateTime } from '../utils/time';
import { CloseIcon, PinIcon } from './Icons';

const severityLabel = { high: 'High', medium: 'Medium', low: 'Low' };

export default function AlertsDrawer({ open, onClose }) {
  const { alerts, timezone, markAlertsRead, clearAlerts, site } = useLive();

  // Keep unread at 0 while the drawer is visible
  useEffect(() => {
    if (open) markAlertsRead();
  }, [open, alerts.length, markAlertsRead]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  return (
    <>
      {open && <div className="backdrop backdrop--drawer" onClick={onClose} />}
      <aside className={`drawer ${open ? 'drawer--open' : ''}`} aria-hidden={!open} aria-label="Alerts">
        <div className="drawer__head">
          <h2>Alerts</h2>
          <div className="drawer__actions">
            {alerts.length > 0 && (
              <button className="link-btn" onClick={clearAlerts}>
                Clear
              </button>
            )}
            <button className="icon-btn" onClick={onClose} aria-label="Close alerts">
              <CloseIcon />
            </button>
          </div>
        </div>
        <p className="drawer__sub">Live entry / exit activity{site ? ` · ${site.name}` : ''}</p>
        <ul className="drawer__list" aria-live="polite">
          {alerts.length === 0 && <li className="empty">Waiting for live events…</li>}
          {alerts.map((a, i) => (
            <li key={a.id} className={`alert-card ${i === 0 ? 'alert-card--latest' : ''}`}>
              <div className="alert-card__time">{formatDateTime(a.ts, timezone)}</div>
              <div className="alert-card__title">
                {a.personName} {a.direction === 'exit' ? 'Exited' : 'Entered'}
              </div>
              <div className="alert-card__row">
                <span className="alert-card__zone">
                  <PinIcon width={13} height={13} /> {a.zoneName}
                </span>
                <span className={`badge badge--${a.severity}`}>{severityLabel[a.severity] || a.severity}</span>
              </div>
            </li>
          ))}
        </ul>
      </aside>
    </>
  );
}
