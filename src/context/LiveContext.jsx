import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import { API_BASE_URL } from '../api/client';
import { getSites } from '../api/services';
import { useAuth } from './AuthContext';

/**
 * Holds the site list + selected site, and the single Socket.IO connection.
 * Socket events arrive for every site, so they are filtered by the selected site here.
 */
const LiveContext = createContext(null);
const MAX_ALERTS = 100;
const SITE_KEY = 'cms_site';

export function LiveProvider({ children }) {
  const { token, logout } = useAuth();
  const [sites, setSites] = useState([]);
  const [sitesError, setSitesError] = useState(null);
  const [siteId, setSiteIdState] = useState(() => {
    try {
      return localStorage.getItem(SITE_KEY);
    } catch {
      return null;
    }
  });
  const [connected, setConnected] = useState(false);
  const [alerts, setAlerts] = useState([]);
  const [unread, setUnread] = useState(0);
  const [live, setLive] = useState(null); // latest live_occupancy for selected site
  const entryListeners = useRef(new Set());
  const siteRef = useRef(siteId);

  const setSiteId = useCallback((id) => {
    setSiteIdState(id);
    try {
      localStorage.setItem(SITE_KEY, id);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    siteRef.current = siteId;
    setLive(null);
    setAlerts([]);
    setUnread(0);
  }, [siteId]);

  // Load sites
  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    getSites()
      .then((list) => {
        if (cancelled) return;
        setSites(list || []);
        setSitesError(null);
        setSiteIdState((cur) => (cur && list?.some((s) => s.siteId === cur) ? cur : list?.[0]?.siteId ?? null));
      })
      .catch(() => !cancelled && setSitesError('Could not load sites'));
    return () => {
      cancelled = true;
    };
  }, [token]);

  // Socket connection
  useEffect(() => {
    if (!token) return;
    const socket = io(API_BASE_URL, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnectionDelayMax: 10000,
    });

    socket.on('connect', () => setConnected(true));
    socket.on('disconnect', () => setConnected(false));
    socket.on('connect_error', (err) => {
      setConnected(false);
      if (/unauthor|jwt|token/i.test(err?.message || '')) logout();
    });

    socket.on('alert', (a) => {
      if (!a || a.siteId !== siteRef.current) return;
      setAlerts((prev) => [{ ...a, id: a.eventId || `${a.ts}-${a.personId}` }, ...prev].slice(0, MAX_ALERTS));
      setUnread((n) => n + 1);
      entryListeners.current.forEach((fn) => fn(a));
    });

    socket.on('live_occupancy', (o) => {
      if (!o || o.siteId !== siteRef.current) return;
      setLive(o);
    });

    return () => {
      socket.removeAllListeners();
      socket.disconnect();
    };
  }, [token, logout]);

  /** Subscribe to entry/exit events of the selected site (used to keep footfall fresh). */
  const onSiteEvent = useCallback((fn) => {
    entryListeners.current.add(fn);
    return () => entryListeners.current.delete(fn);
  }, []);

  const markAlertsRead = useCallback(() => setUnread(0), []);
  const clearAlerts = useCallback(() => {
    setAlerts([]);
    setUnread(0);
  }, []);

  const site = sites.find((s) => s.siteId === siteId) || null;

  const value = useMemo(
    () => ({
      sites,
      sitesError,
      site,
      siteId,
      setSiteId,
      timezone: site?.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone,
      connected,
      alerts,
      unread,
      markAlertsRead,
      clearAlerts,
      live,
      onSiteEvent,
    }),
    [sites, sitesError, site, siteId, setSiteId, connected, alerts, unread, markAlertsRead, clearAlerts, live, onSiteEvent]
  );

  return <LiveContext.Provider value={value}>{children}</LiveContext.Provider>;
}

export const useLive = () => useContext(LiveContext);
