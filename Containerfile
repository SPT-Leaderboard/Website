# FRT-28: self-host container — build the static site, serve it, proxy /api/.
# Podman-first, Docker-compatible. Two stages; final image is nginx:alpine.
# No domain is baked in: the backend origin comes from the API_UPSTREAM
# environment variable, substituted at container start (envsubst template).

# ---- Stage 1: build -------------------------------------------------------
# Reproducible build inside the same Bun image used for local verification.
FROM docker.io/oven/bun:latest AS build
WORKDIR /app

# Manifest + lockfile first so dependency install caches independently of source.
COPY package.json bun.lock astro.config.mjs tsconfig.json ./
RUN bun install --frozen-lockfile

# Source; build context is trimmed by .dockerignore (no node_modules/dist/media/...).
COPY . .
RUN bun run build

# ---- Stage 2: serve ---------------------------------------------------------
# nginx:alpine chosen as the small static server because it supports both
# SPA-style fallback (try_files -> index.html) and reverse proxying /api/ to
# an origin given at runtime.
FROM docker.io/library/nginx:alpine

# Default config is replaced at container start by the envsubst template below
# (/etc/nginx/templates/default.conf.template -> /etc/nginx/conf.d/default.conf).
RUN rm /etc/nginx/conf.d/default.conf
COPY <<'EOF' /etc/nginx/templates/default.conf.template
server {
    listen 80;
    server_name _;
    root /usr/share/nginx/html;
    index index.html;

    # Static assets: one-hour cache, matching the deploy target's default for
    # non-HTML assets (wrangler.jsonc sets no header overrides). _astro/ file
    # names are content-hashed, so 3600 s is safe there too.
    location / {
        add_header Cache-Control "public, max-age=3600";
        try_files $uri $uri/ /index.html;
    }

    # HTML — served directly, as a directory index, or as the unknown-path
    # fallback — always revalidates, matching the deploy target's HTML default.
    location ~* \.html$ {
        add_header Cache-Control "public, max-age=0, must-revalidate";
        try_files $uri =404;
    }

    # Same-origin API: request URIs (including the /api/ prefix) pass through
    # unchanged to the backend origin, so cookie auth (credentials: 'include')
    # keeps working. API_UPSTREAM is scheme://host[:port], no trailing path;
    # substituted at container start by the nginx image's envsubst entrypoint.
    location /api/ {
        proxy_pass ${API_UPSTREAM};
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
EOF

COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80
