# Self-Host Container (FRT-28)

How to run the frontend in the self-host container (`Containerfile`, podman-first, Docker
compatible). The container builds the static Astro site and serves it with nginx; API calls
are reverse-proxied to a backend origin you supply at runtime.

## Files

| File | Role |
|------|------|
| `Containerfile` | Two-stage build: `docker.io/oven/bun:latest` (install + `bun run build`) → `docker.io/library/nginx:alpine` (serve `dist/`) |
| `.dockerignore` | Trims the build context: `node_modules`, `dist`, `.astro`, `media`, `fallbacks`, `.git`, `.pi`, `.agents` |

Server choice: **nginx:alpine**, because it provides both an SPA-style fallback for unknown
paths and a reverse proxy for `/api/` in the same small image (final image ≈ 69 MB;
the `build` stage alone is ≈ 457 MB and is discarded).

## Build

```sh
podman build --target build -t sptlb-frontend-build .   # stage 1: bun install + astro build
podman build -t sptlb-frontend .                        # full image: stage 2 on nginx:alpine
```

Docker users: replace `podman` with `docker`; the Containerfile uses only portable
instructions (the nginx config is embedded as a quoted heredoc, no shell expansion at
build time).

## Run

`API_UPSTREAM` (required, no default) is the backend origin as `scheme://host[:port]`,
no trailing path, no baked domain — it is substituted into the nginx config at container
start via the nginx image's envsubst template hook (`/etc/nginx/templates/default.conf.template`
→ `/etc/nginx/conf.d/default.conf`).

```sh
podman run -d --name sptlb-frontend \
  -e API_UPSTREAM=http://backend:8080 \
  -p 8080:80 \
  sptlb-frontend
```

With a compose file, `backend` is the backend service name; the frontend container resolves
it at startup. Caveat: because the origin is baked into the rendered config at start, the
upstream hostname must resolve when the container starts — start the backend first, or
restart the frontend container after the backend comes up. If `API_UPSTREAM` is unset,
nginx fails to start with a config error.

## What the proxy does

- `location /api/` forwards every `/api/...` request to `API_UPSTREAM` **with the full
  original path** (`proxy_pass` has no path part). The backend must serve its routes under
  the `/api/` prefix itself — that is what the frontend's same-origin runtime calls expect
  (see `docs/port/data-dependency-map.md` rows 3–8: `GET /api/main/online.json`,
  `GET /api/network/login/check_auth.php` with `credentials: 'include'`,
  heartbeat poll + keep-alive, `POST .../get_player_customization.php`, etc.).
- `Host`, `X-Forwarded-For`, and `X-Forwarded-Proto` headers are set; cookies from the
  browser flow through, so cookie-authenticated endpoints work same-origin without CORS.
- Because the same-origin path is preserved, nothing else (no CORS config, no rewrite
  rules) is needed.

## What nginx serves

| Request | Response | Cache-Control |
|---------|----------|---------------|
| Existing file (`/_astro/*.css`, images) | 200 from `dist/` | `public, max-age=3600` |
| HTML page (`/`, `/global/`, `.../*.html`) | 200 | `public, max-age=0, must-revalidate` |
| Unknown path (`/no-such-page`) | 200 with `index.html` (SPA-style fallback) | `public, max-age=0, must-revalidate` |
| Any `/api/...` | proxied to `API_UPSTREAM`; if unreachable, nginx 502 | — |

The 3600 s / revalidate split mirrors the deploy target's default headers
(`wrangler.jsonc` sets no header overrides): HTML always revalidates, other assets cache
for one hour. `_astro/` file names are content-hashed, so the 3600 s entry is safe.

## What is NOT included

- **No TLS termination** — serve plain HTTP; put TLS in front (reverse proxy / load balancer) if needed.
- **No API** — this image is static files + proxy only; the backend ships its own container.
- **No `media/` or `fallbacks/`** — excluded from the build context by `.dockerignore`.
  Fact: the built output contains no references to either directory (grep over `dist/` in the
  built image finds none), so nothing 404s because of the exclusion.
- No health check endpoint, no domain names, no secrets — `API_UPSTREAM` is the only input.
