# Environment Files Guide

## Single source of truth for the database

All database credentials live in the **repo root** `.env` only:

```bash
DATABASE_DEFAULT=datilio_db
DATABASE_USER=postgres
DATABASE_PASSWORD=your_password
DATABASE_HOST=postgres    # Docker: "postgres" | local Python: "localhost"
DATABASE_PORT=5432
```

**Passwords with `#`, `@`, `!`, or spaces must be quoted in `.env`:**

```bash
DATABASE_PASSWORD="Hjk!@#45"
```

Without quotes, `#` is treated as a comment and the URL breaks (`#45@postgres` host error).

The backend builds `POSTGRESQL_CONNECTION_STRING` from these automatically (password is URL-encoded in code).  
**Do not** set `POSTGRESQL_CONNECTION_STRING` in any `.env` file.

## File layout

```
datilio/
├── .env                 ← Database + Docker Compose + optional VITE_* build args
├── .env.example
├── docker-compose.local.yml   ← full stack on your PC
├── docker-compose.prod.yml    ← full stack on VPS
└── backend/
    └── .env             ← JWT, OpenAI, Stripe, SMTP, Redis, frontend URLs only
```

## Who reads what

| Consumer | Reads |
|----------|--------|
| Postgres container | `DATABASE_*` from root `.env` (via compose substitution) |
| Backend / Celery | Root `.env` + `backend/.env` (compose `env_file`) |
| Alembic | Same `DATABASE_*` via `app.core.config` |
| pgAdmin | `DATABASE_USER`, `DATABASE_PASSWORD`, `DATABASE_DEFAULT` from VPS root `.env` |

## Docker Compose

`docker-compose.prod.yml` maps root `.env` to the Postgres service:

```yaml
POSTGRES_USER: ${DATABASE_USER}
POSTGRES_PASSWORD: ${DATABASE_PASSWORD}
POSTGRES_DB: ${DATABASE_DEFAULT}
```

No hardcoded fallback passwords in compose files.

## Local full stack (Docker)

```bash
docker compose -f docker-compose.local.yml up -d --build
```

Root `.env`: `DATABASE_HOST=postgres`, `VITE_API_URL=http://localhost:8000`  
`backend/.env`: `FRONTEND_BASE_URL=http://localhost:3000`, `REDIS_HOST=redis`

## Local development without Docker (apps on host)

1. Copy `/.env.example` → `/.env` and set `DATABASE_HOST=localhost`
2. Copy `/backend/.env.example` → `/backend/.env` for app secrets
3. Run Postgres (e.g. `docker compose -f docker-compose.db.yml up -d`)

## VPS

Ensure `~/datilio/.env` has the same `DATABASE_*` values used when the DB volume was first created.  
Changing `DATABASE_PASSWORD` in `.env` does **not** change an existing Postgres volume; reset the volume or alter the role password manually if you rotate credentials.

### Production URL checklist

| File | Required production values |
|------|---------------------------|
| Root `.env` | `VITE_API_URL=https://datilio.com` (never `http://`) |
| `backend/.env` | `FRONTEND_BASE_URL=https://front.datilio.com`, `ADMIN_FRONTEND_BASE_URL=https://admin.datilio.com`, `STRIPE_*_URL=https://front.datilio.com/...` |

After any `VITE_*` change, rebuild frontends with `--no-cache`:

```bash
docker compose -f docker-compose.prod.yml build --no-cache frontend frontend_admin
docker compose -f docker-compose.prod.yml up -d frontend frontend_admin
```

The Dockerfiles **fail the build** if `http://datilio.com` is detected in the output bundle.
