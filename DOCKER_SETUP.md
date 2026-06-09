# Docker Compose Setup Guide

Two compose files — same services, different targets:

| File | Use on | Image tags |
|------|--------|------------|
| `docker-compose.local.yml` | Your PC (local testing) | `*:local` |
| `docker-compose.prod.yml` | VPS (production) | `*:prod` |

Both share one backend image for API + Celery. User data uses separate volume names (`*_local` vs prod) so local and prod data never mix on the same machine.

---

## Local (`docker-compose.local.yml`)

### 1. Configure `.env` files

**Root `.env`** (see `.env.example`):

```bash
DATABASE_HOST=postgres
DATABASE_PASSWORD=root   # or your choice; quote if it contains #
VITE_API_URL=http://localhost:8000
```

**`backend/.env`** — use localhost frontends for CORS/email links:

```bash
FRONTEND_BASE_URL=http://localhost:3000
ADMIN_FRONTEND_BASE_URL=http://localhost:3001
REDIS_HOST=redis
```

### 2. Start

```bash
docker compose -f docker-compose.local.yml up -d --build
```

### 3. Bootstrap (migrations, admin, plans)

```bash
docker compose -f docker-compose.local.yml exec backend python startup/bootstrap.py
```

Runs Alembic `upgrade head`, creates the admin user if missing, and syncs plans from `backend/startup/plans_and_add_on.csv`. Safe to re-run.

See `backend/startup/README.md` for database backup/restore scripts.

After changing startup scripts locally, no rebuild is needed (folder is mounted in local compose). For production, rebuild the backend image.

### 4. URLs

- API: http://localhost:8000/docs
- App: http://localhost:3000
- Admin: http://localhost:3001
- Postgres: localhost:5432
- Redis: localhost:6379

### 5. Stop

```bash
docker compose -f docker-compose.local.yml down
# Wipe local DB/uploads: add -v
```

---

## Production (`docker-compose.prod.yml`)

### 1. Root `.env` on VPS

```bash
DATABASE_HOST=postgres
DATABASE_PASSWORD="your_secure_password"
# Do not set VITE_* — defaults to https://datilio.com
```

**`backend/.env`:** production URLs, `REDIS_HOST=redis`, no `DATABASE_*`.

### 2. Deploy

```bash
docker compose -f docker-compose.prod.yml build
docker compose -f docker-compose.prod.yml up -d
docker compose -f docker-compose.prod.yml exec backend python startup/bootstrap.py
docker image prune -f
```

Postgres is bound to `127.0.0.1:5432` on the VPS (SSH tunnel for pgAdmin).

---

## Troubleshooting

### Backend can't connect to database?

- `DATABASE_HOST=postgres` in root `.env` (not `localhost` when app runs in Docker)
- Passwords with `#` or `@` must be quoted: `DATABASE_PASSWORD="Hjk!@#45"`

### Frontend API errors?

- Rebuild after changing `VITE_*`:  
  `docker compose -f docker-compose.local.yml build --no-cache frontend frontend_admin`

### Mixed Content / "Failed to fetch" on production?

The app at `https://front.datilio.com` must call the API over **HTTPS**, not HTTP.

1. On the VPS root `.env`, set (or fix):
   ```bash
   VITE_API_URL=https://datilio.com
   ```
   Remove any `VITE_API_URL=http://datilio.com` line — HTTP is blocked by the browser on HTTPS pages.

2. Rebuild frontends (URL is baked into the image at build time):
   ```bash
   docker compose -f docker-compose.prod.yml build --no-cache frontend frontend_admin
   docker compose -f docker-compose.prod.yml up -d frontend frontend_admin
   ```

3. Hard-refresh the browser (Ctrl+Shift+R) after deploy.

### Rebuild one service

```bash
docker compose -f docker-compose.local.yml build backend
docker compose -f docker-compose.local.yml up -d backend celery_worker
```

---

## Database-only (optional)

For running backend/frontends on the host with only Postgres/Redis in Docker:

```bash
docker compose -f docker-compose.db.yml up -d
```

Set `DATABASE_HOST=localhost` and `REDIS_HOST=localhost` in root `.env`.
