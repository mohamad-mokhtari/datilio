"""
Export and restore PostgreSQL table data as JSON snapshots.

Used by startup/keep_database_data.py and startup/fill_database_data.py.
"""

from __future__ import annotations

import enum
import json
import uuid
from datetime import date, datetime
from decimal import Decimal
from pathlib import Path
from typing import Any, Dict, List, Literal, Optional

from sqlalchemy import Table, select, text
from sqlalchemy.dialects.postgresql import JSONB, UUID as PGUUID, insert as pg_insert
from sqlalchemy.types import JSON, Date, DateTime, Enum as SAEnum

from app.core.config import settings
from app.core.db_setup import Base, SessionLocal, engine

DEFAULT_SNAPSHOT_PATH = (
    Path(__file__).resolve().parents[2] / "startup" / "data" / "database_snapshot.json"
)
SNAPSHOT_FORMAT_VERSION = 1
SKIP_TABLES = {"alembic_version"}

FillMode = Literal["replace", "append"]


def import_all_models() -> None:
    """Register every SQLAlchemy model on Base.metadata."""
    import app.models  # noqa: F401
    from app.models import file_rules_model  # noqa: F401
    from app.models import task_model  # noqa: F401


def _serialize_value(value: Any) -> Any:
    if value is None:
        return None
    if isinstance(value, uuid.UUID):
        return str(value)
    if isinstance(value, (datetime, date)):
        return value.isoformat()
    if isinstance(value, enum.Enum):
        return value.value
    if isinstance(value, Decimal):
        return float(value)
    if isinstance(value, bytes):
        return value.decode("utf-8", errors="replace")
    return value


def _serialize_row(row: Dict[str, Any]) -> Dict[str, Any]:
    return {key: _serialize_value(value) for key, value in row.items()}


def _deserialize_value(value: Any, column) -> Any:
    if value is None:
        return None

    col_type = column.type
    if isinstance(col_type, PGUUID):
        return uuid.UUID(str(value))

    if isinstance(col_type, (DateTime, Date)):
        if isinstance(value, str):
            return datetime.fromisoformat(value.replace("Z", "+00:00"))
        return value

    if isinstance(col_type, (JSON, JSONB)):
        if isinstance(value, str):
            return json.loads(value)
        return value

    if isinstance(col_type, SAEnum):
        return value

    return value


def _deserialize_row(row: Dict[str, Any], table: Table) -> Dict[str, Any]:
    columns = {col.name: col for col in table.columns}
    return {
        key: _deserialize_value(value, columns[key])
        for key, value in row.items()
        if key in columns
    }


def _application_tables() -> List[Table]:
    import_all_models()
    return [
        table
        for table in Base.metadata.sorted_tables
        if table.name not in SKIP_TABLES
    ]


def export_database_snapshot(output_path: Path) -> Dict[str, Any]:
    """Dump all application tables to a JSON snapshot file."""
    tables = _application_tables()
    snapshot: Dict[str, Any] = {
        "format_version": SNAPSHOT_FORMAT_VERSION,
        "exported_at": datetime.utcnow().isoformat() + "Z",
        "database_host": settings.DATABASE_HOST,
        "database_name": settings.DATABASE_NAME,
        "tables": {},
        "row_counts": {},
    }

    with SessionLocal() as session:
        for table in tables:
            rows = session.execute(select(table)).mappings().all()
            serialized = [_serialize_row(dict(row)) for row in rows]
            snapshot["tables"][table.name] = serialized
            snapshot["row_counts"][table.name] = len(serialized)

    output_path.parent.mkdir(parents=True, exist_ok=True)
    with output_path.open("w", encoding="utf-8") as handle:
        json.dump(snapshot, handle, indent=2, ensure_ascii=False)

    total_rows = sum(snapshot["row_counts"].values())
    return {
        "output_path": str(output_path),
        "table_count": len(tables),
        "total_rows": total_rows,
        "row_counts": snapshot["row_counts"],
    }


def _truncate_all_tables(session) -> None:
    table_names = [f'"{table.name}"' for table in reversed(_application_tables())]
    if not table_names:
        return
    session.execute(
        text(f"TRUNCATE TABLE {', '.join(table_names)} RESTART IDENTITY CASCADE")
    )


def _insert_rows(session, table: Table, rows: List[Dict[str, Any]], mode: FillMode) -> int:
    if not rows:
        return 0

    inserted = 0
    pk_columns = [col.name for col in table.primary_key.columns]

    for raw_row in rows:
        row = _deserialize_row(raw_row, table)
        if mode == "append" and pk_columns:
            stmt = pg_insert(table).values(**row).on_conflict_do_nothing(
                index_elements=pk_columns
            )
        else:
            stmt = table.insert().values(**row)
        result = session.execute(stmt)
        inserted += result.rowcount or 0

    return inserted


def fill_database_snapshot(
    input_path: Path,
    mode: FillMode,
) -> Dict[str, Any]:
    """Load a JSON snapshot into the database."""
    if not input_path.is_file():
        raise FileNotFoundError(f"Snapshot file not found: {input_path}")

    with input_path.open("r", encoding="utf-8") as handle:
        snapshot = json.load(handle)

    if snapshot.get("format_version") != SNAPSHOT_FORMAT_VERSION:
        raise ValueError(
            f"Unsupported snapshot format version: {snapshot.get('format_version')}"
        )

    tables = _application_tables()
    tables_by_name = {table.name: table for table in tables}
    snapshot_tables: Dict[str, List[Dict[str, Any]]] = snapshot.get("tables", {})

    summary: Dict[str, Any] = {
        "input_path": str(input_path),
        "mode": mode,
        "tables_loaded": {},
        "tables_skipped": [],
        "total_rows_processed": 0,
    }

    with SessionLocal() as session:
        if mode == "replace":
            _truncate_all_tables(session)

        for table in tables:
            rows = snapshot_tables.get(table.name)
            if rows is None:
                summary["tables_skipped"].append(table.name)
                continue

            count = _insert_rows(session, table, rows, mode)
            summary["tables_loaded"][table.name] = count
            summary["total_rows_processed"] += count

        session.commit()

    return summary


def validate_snapshot_file(input_path: Path) -> Dict[str, Any]:
    """Return basic metadata about a snapshot without writing to the database."""
    with input_path.open("r", encoding="utf-8") as handle:
        snapshot = json.load(handle)

    row_counts = snapshot.get("row_counts") or {
        name: len(rows) for name, rows in snapshot.get("tables", {}).items()
    }
    return {
        "exported_at": snapshot.get("exported_at"),
        "database_host": snapshot.get("database_host"),
        "database_name": snapshot.get("database_name"),
        "table_count": len(snapshot.get("tables", {})),
        "total_rows": sum(row_counts.values()),
        "row_counts": row_counts,
    }


def existing_row_counts() -> Dict[str, int]:
    """Return current row counts for all application tables."""
    counts: Dict[str, int] = {}
    with SessionLocal() as session:
        for table in _application_tables():
            result = session.execute(text(f'SELECT COUNT(*) FROM "{table.name}"'))
            counts[table.name] = int(result.scalar_one())
    return counts
