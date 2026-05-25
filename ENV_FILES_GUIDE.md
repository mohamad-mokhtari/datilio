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

The backend builds `POSTGRESQL_CONNECTION_STRING` from these automatically.  
**Do not** set `POSTGRESQL_CONNECTION_STRING` in any `.env` file.

## File layout

```
datilio/
├── .env                 ← Database + Docker Compose + optional VITE_* build args
├── .env.example
├── docker-compose.prod.yml
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

## Local development without Docker

1. Copy `/.env.example` → `/.env` and set `DATABASE_HOST=localhost`
2. Copy `/backend/.env.example` → `/backend/.env` for app secrets
3. Run Postgres (e.g. `docker compose -f docker-compose.db.yml up -d`)

## VPS

Ensure `~/datilio/.env` has the same `DATABASE_*` values used when the DB volume was first created.  
Changing `DATABASE_PASSWORD` in `.env` does **not** change an existing Postgres volume; reset the volume or alter the role password manually if you rotate credentials.
