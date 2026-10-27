# Crowd Management System — Frontend

A responsive single-page dashboard for monitoring live crowd occupancy, footfall, dwell time, demographics and visitor entry/exit records. Built for the Kloudspot Frontend Engineer assessment.

**Live demo:** https://crowd.manageone.me

Test login: `test@test.com` / `1234567890`

## Features

- **Login** — email + password with show/hide toggle, inline error on failure, redirect to the dashboard on success. JWT kept in `sessionStorage` (never logged); any `401` from the API logs the user out.
- **Protected routes** — `/` (Overview) and `/entries` (Crowd Entries) require authentication.
- **Site switcher** — all sites from `GET /api/sites`; selection is remembered.
- **Overview dashboard**
  - Live Occupancy (pushed via Socket.IO `live_occupancy`), Today's Footfall, Avg Dwell Time — each with a % comparison against the same time window yesterday.
  - Overall Occupancy time-series with a **LIVE** marker at the current time.
  - Demographics donut (male/female split) and Male vs Female time-series.
  - Date picker to view any previous day.
- **Crowd Entries** — paginated entry/exit table (name, sex, entry, exit, dwell time, zone severity), page numbers with ellipsis and selectable page size. Visitors still inside are tagged *Inside*.
- **Real-time alerts** — Socket.IO `alert` events stream into a slide-out Alerts panel with an unread badge and severity colours. Footfall increments live on each entry event, so no polling is needed for live numbers.
- **Timezone-correct** — a "day" is computed in the selected site's own timezone (e.g. Dubai Mall uses `Asia/Dubai`), and all times are displayed in site-local time.
- **Responsive** — collapsible sidebar on desktop, off-canvas menu on tablet/mobile; charts and table adapt to narrow screens.
- Loading skeletons, error banners with retry, empty states, keyboard-accessible controls.

## Tech stack

| Concern | Choice |
| --- | --- |
| Build | Vite |
| UI | React 19, plain CSS (custom properties) |
| Routing | React Router |
| HTTP | Axios (interceptors for JWT + 401 handling) |
| Charts | Recharts |
| Real-time | socket.io-client |

## Project structure

```
src/
  api/            axios client (auth header, 401 handling) + API service functions
  context/        AuthContext (session) and LiveContext (sites, socket, alerts, live occupancy)
  components/     Layout (sidebar/topbar), AlertsDrawer, StatCard, ProtectedRoute, Icons
  pages/          Login, Dashboard, CrowdEntries
  utils/time.js   timezone-aware day ranges and formatting helpers
```

## APIs used

| Endpoint | Used for |
| --- | --- |
| `POST /api/auth/login` | Login → JWT |
| `GET /api/sites` | Site switcher + timezone |
| `POST /api/analytics/footfall` | Today's footfall (and yesterday for comparison) |
| `POST /api/analytics/dwell` | Average dwell time (and comparison) |
| `POST /api/analytics/occupancy` | Hourly occupancy chart |
| `POST /api/analytics/demographics` | Male/Female chart + donut |
| `POST /api/analytics/entry-exit` | Paginated Crowd Entries table |
| Socket.IO `alert`, `live_occupancy` | Live alerts panel and live occupancy |

All analytics calls send `siteId`, `fromUtc`, `toUtc` (epoch millis). For "today" the range ends at the current time so the comparison with yesterday covers the same elapsed hours.

## Running locally

```bash
npm install
cp .env.example .env   # optional — defaults to the staging API
npm run dev            # http://localhost:5173
npm run build          # production build in dist/
```

`VITE_API_BASE_URL` sets the backend origin (default `https://hiring-dev.internal.kloudspot.com`).

## Deployment

Served from an always-on Windows PC through Cloudflare Tunnel at https://crowd.manageone.me — see [DEPLOY.md](DEPLOY.md). `deploy/serve.mjs` is a zero-dependency static server with SPA fallback.

## Notes & assumptions

- Live occupancy compares against the last hourly occupancy bucket of the same window yesterday.
- For past dates the first card shows the day's average occupancy instead of live occupancy.
- Historical charts refresh quietly every 5 minutes while viewing today; live figures come only from the socket.
- The analytics endpoints aggregate raw data on the server and can take 10–20 s. To keep the dashboard usable:
  - each card/chart loads independently, so one slow or failing endpoint never blocks the rest;
  - current-day data is requested first, previous-day comparison data afterwards;
  - responses are cached in memory (1 min for ranges ending now, 30 min for past ranges) and duplicate in-flight requests are shared;
  - request timeout is 60 s.
