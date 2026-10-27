# Deploying to a Windows PC behind Cloudflare Tunnel

Goal: serve the dashboard from an always-on Windows PC at **https://crowd.manageone.me** through the existing Cloudflare Tunnel.

The app is a static frontend (it talks directly to the Kloudspot API), so the PC only needs Node.js. A small zero-dependency server (`deploy/serve.mjs`) serves `dist/` on port **8090** and falls back to `index.html` for app routes such as `/entries`.

```
Internet ──► https://crowd.manageone.me ──► Cloudflare Tunnel (cloudflared on the PC)
                                                  └──► localhost:8090  node deploy/serve.mjs  (dist/)
Browser ──► https://hiring-dev.internal.kloudspot.com  (API + Socket.IO, called directly)
```

Time needed: about 10 minutes.

## 1. Check prerequisites

```powershell
node -v                           # 18 or newer
git --version
netstat -ano | findstr ":8090"    # must print nothing (port free)
```

If 8090 is taken, pick another port and use it everywhere below (`set PORT=...` before the scripts, and in the Cloudflare route).

## 2. Get the code and build

```powershell
cd C:\
git clone https://github.com/<your-account>/<your-repo>.git crowd
cd C:\crowd
deploy\build.bat
```

## 3. Start and check locally

```powershell
deploy\start-crowd.bat
```

Keep that window open and open http://localhost:8090 on the PC. The login page should appear, and refreshing http://localhost:8090/entries must not give a 404. Logs: `deploy\logs\crowd.log`.

## 4. Start automatically on boot

Close the window from step 3 (or run `deploy\stop-crowd.bat`). Right-click `deploy\register-autostart.bat` → **Run as administrator**, then start it without rebooting:

```powershell
schtasks /run /tn "CrowdDashboard"
```

## 5. Publish on Cloudflare

1. https://one.dash.cloudflare.com → **Networks → Tunnels** → your tunnel → **Edit**.
2. **Public Hostname** → **Add a public hostname**:
   - Subdomain: `crowd`
   - Domain: `manageone.me`
   - Path: *(empty)*
   - Service: `HTTP` → `localhost:8090`
3. **Save**. Cloudflare creates the DNS record itself.

If the tunnel is configured from a `config.yml` on the PC instead, add this rule **above** the final catch-all `service: http_status:404` line and restart the cloudflared service:

```yaml
  - hostname: crowd.manageone.me
    service: http://localhost:8090
```

## 6. Verify

- https://crowd.manageone.me shows the login page.
- Log in with `test@test.com` / `1234567890`; the top bar shows a green **Live** indicator (Socket.IO connected).
- Refreshing https://crowd.manageone.me/entries loads the page (no 404).

## Updating to a new version

```powershell
cd C:\crowd
deploy\stop-crowd.bat
git pull
deploy\build.bat
schtasks /run /tn "CrowdDashboard"
```

## Troubleshooting

| Symptom | Check |
|---|---|
| Cloudflare error 502 / 1033 | Server not running (`netstat -ano \| findstr ":8090"`) or tunnel service stopped |
| `Missing dist\` | Run `deploy\build.bat` |
| Page loads, data does not | Browser dev tools → Network; the API is `hiring-dev.internal.kloudspot.com` |
| Port already in use | `set PORT=8091` before `start-crowd.bat` / `stop-crowd.bat`, and update the Cloudflare route |
