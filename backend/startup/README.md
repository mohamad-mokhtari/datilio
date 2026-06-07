# Backend startup scripts

One place for first-time setup and database backup/restore.

| Script | Purpose |
|--------|---------|
| `bootstrap.py` | Migrations + admin user + plans sync |
| `keep_database_data.py` | Export all table rows to JSON |
| `fill_database_data.py` | Restore from JSON (replace or append) |

| Data | Purpose |
|------|---------|
| `plans_and_add_on.csv` | Source of truth for pricing plans |

**After editing the CSV**, re-run bootstrap (no container rebuild needed locally):

```bash
docker compose -f docker-compose.local.yml exec backend python startup/bootstrap.py
```

The UI reads plans from the **database**, not the CSV directly.
| `data/` | Default folder for database snapshots |

## Docker commands

```bash
# First-time / repeat setup
docker compose -f docker-compose.local.yml exec backend python startup/bootstrap.py

# Export database
docker compose -f docker-compose.local.yml exec backend python startup/keep_database_data.py

# Restore database (interactive)
docker compose -f docker-compose.local.yml exec -it backend python startup/fill_database_data.py

# Restore non-interactive
docker compose -f docker-compose.local.yml exec backend python startup/fill_database_data.py --mode replace --yes
docker compose -f docker-compose.local.yml exec backend python startup/fill_database_data.py --mode append
```

Production: use `docker-compose.prod.yml` instead of `docker-compose.local.yml`.



If you hit this again locally:
docker compose -f docker-compose.local.yml build backend
docker compose -f docker-compose.local.yml up -d backend
docker compose -f docker-compose.local.yml exec backend python startup/bootstrap.py


On VPS (production): rebuild is required — startup folder is baked into the image:
docker compose -f docker-compose.prod.yml build backend
docker compose -f docker-compose.prod.yml up -d backend
docker compose -f docker-compose.prod.yml exec backend python startup/bootstrap.py
