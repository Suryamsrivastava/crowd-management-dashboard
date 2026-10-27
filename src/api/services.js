import api from './client';

export const login = (email, password) =>
  api.post('/auth/login', { email, password }).then((r) => r.data);

export const getSites = () => api.get('/sites').then((r) => r.data);

/*
 * Analytics endpoints are slow (server-side aggregation), so responses are
 * cached briefly in memory and identical in-flight requests are shared.
 * Ranges that end in the past never change, so they are cached for longer.
 */
const cache = new Map();
const LIVE_TTL = 60 * 1000;
const PAST_TTL = 30 * 60 * 1000;
const MAX_ENTRIES = 200;

// The shared backend occasionally stalls; retry once on timeouts, network errors and 5xx
const isTransient = (err) => !err?.response || err.response.status >= 500;

async function postWithRetry(path, body) {
  try {
    return (await api.post(path, body)).data;
  } catch (err) {
    if (!isTransient(err)) throw err;
    await new Promise((r) => setTimeout(r, 2000));
    return (await api.post(path, body)).data;
  }
}

function cachedPost(path, body) {
  const key = `${path}|${JSON.stringify(body)}`;
  const hit = cache.get(key);
  if (hit && hit.expires > Date.now()) return hit.promise;

  const promise = postWithRetry(path, body);
  const ttl = body.toUtc < Date.now() - 60 * 1000 ? PAST_TTL : LIVE_TTL;
  cache.set(key, { promise, expires: Date.now() + ttl });
  promise.catch(() => cache.delete(key));

  if (cache.size > MAX_ENTRIES) cache.delete(cache.keys().next().value);
  return promise;
}

export const clearAnalyticsCache = () => cache.clear();

/** Round "now" down to the minute so repeated loads hit the cache. */
const roundTo = (ts) => Math.floor(ts / 60000) * 60000;
const range = (siteId, fromUtc, toUtc) => ({ siteId, fromUtc, toUtc: roundTo(toUtc) });

export const getFootfall = (siteId, fromUtc, toUtc) =>
  cachedPost('/analytics/footfall', range(siteId, fromUtc, toUtc));

export const getDwell = (siteId, fromUtc, toUtc) =>
  cachedPost('/analytics/dwell', range(siteId, fromUtc, toUtc));

export const getOccupancy = (siteId, fromUtc, toUtc) =>
  cachedPost('/analytics/occupancy', range(siteId, fromUtc, toUtc));

export const getDemographics = (siteId, fromUtc, toUtc) =>
  cachedPost('/analytics/demographics', range(siteId, fromUtc, toUtc));

export const getEntryExit = ({ siteId, fromUtc, toUtc, pageNumber = 1, pageSize = 10 }) =>
  api
    .post('/analytics/entry-exit', { siteId, fromUtc, toUtc, pageNumber, pageSize })
    .then((r) => r.data);
