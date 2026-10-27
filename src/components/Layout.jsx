import { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLive } from '../context/LiveContext';
import AlertsDrawer from './AlertsDrawer';
import { BellIcon, ChevronIcon, EntriesIcon, HomeIcon, Logo, LogoutIcon, MenuIcon, PinIcon } from './Icons';

export default function Layout() {
  const { logout, user } = useAuth();
  const { sites, siteId, setSiteId, connected, unread, markAlertsRead, sitesError } = useLive();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [alertsOpen, setAlertsOpen] = useState(false);
  const location = useLocation();

  useEffect(() => setMobileOpen(false), [location.pathname]);

  const openAlerts = () => {
    setAlertsOpen(true);
    markAlertsRead();
  };

  const initials = (user || 'U').slice(0, 2).toUpperCase();

  return (
    <div className={`app ${collapsed ? 'app--collapsed' : ''}`}>
      <aside className={`sidebar ${mobileOpen ? 'sidebar--open' : ''}`}>
        <div className="sidebar__top">
          <Logo />
          <button
            className="icon-btn icon-btn--light sidebar__toggle"
            onClick={() => (window.innerWidth <= 900 ? setMobileOpen(false) : setCollapsed((c) => !c))}
            aria-label="Toggle sidebar"
          >
            <MenuIcon />
          </button>
        </div>
        <nav className="sidebar__nav">
          <NavLink to="/" end className="nav-item" title="Overview">
            <HomeIcon />
            <span>Overview</span>
          </NavLink>
          <NavLink to="/entries" className="nav-item" title="Crowd Entries">
            <EntriesIcon />
            <span>Crowd Entries</span>
          </NavLink>
        </nav>
        <button className="nav-item nav-item--logout" onClick={logout} title="Logout">
          <LogoutIcon />
          <span>Logout</span>
        </button>
      </aside>
      {mobileOpen && <div className="backdrop" onClick={() => setMobileOpen(false)} />}

      <div className="main">
        <header className="topbar">
          <button className="icon-btn topbar__menu" onClick={() => setMobileOpen(true)} aria-label="Open menu">
            <MenuIcon />
          </button>
          <span className="topbar__title">Crowd Solutions</span>
          <span className="topbar__divider" />
          <label className="site-select">
            <PinIcon width={16} height={16} />
            <select
              value={siteId || ''}
              onChange={(e) => setSiteId(e.target.value)}
              aria-label="Select site"
              disabled={!sites.length}
            >
              {!sites.length && <option>{sitesError || 'Loading sites…'}</option>}
              {sites.map((s) => (
                <option key={s.siteId} value={s.siteId}>
                  {s.name}
                </option>
              ))}
            </select>
            <ChevronIcon width={16} height={16} />
          </label>

          <div className="topbar__right">
            <span className={`conn ${connected ? 'conn--on' : ''}`} title={connected ? 'Live updates connected' : 'Reconnecting…'}>
              <span className="conn__dot" />
              <span className="conn__label">{connected ? 'Live' : 'Offline'}</span>
            </span>
            <button className="icon-btn bell" onClick={openAlerts} aria-label={`Alerts, ${unread} unread`}>
              <BellIcon width={20} height={20} />
              {unread > 0 && <span className="bell__badge">{unread > 99 ? '99+' : unread}</span>}
            </button>
            <span className="avatar" title={user || ''}>
              {initials}
            </span>
          </div>
        </header>

        <main className="content">
          <Outlet />
        </main>
      </div>

      <AlertsDrawer open={alertsOpen} onClose={() => setAlertsOpen(false)} />
    </div>
  );
}
