#!/usr/bin/env python3
"""
Export all application table rows to a JSON snapshot file.

Usage (Docker):
  docker compose -f docker-compose.local.yml exec backend python startup/keep_database_data.py
  docker compose -f docker-compose.local.yml exec backend python startup/keep_database_data.py --output data/my_backup.json

Default output: backend/startup/data/database_snapshot.json
"""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

BACKEND_DIR = Path(__file__).resolve().parent.parent
STARTUP_DIR = Path(__file__).resolve().parent
sys.path.insert(0, str(BACKEND_DIR))

from app.services.database_snapshot import DEFAULT_SNAPSHOT_PATH, export_database_snapshot


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Export all database table rows to a JSON snapshot file."
    )
    parser.add_argument(
        "--output",
        "-o",
        default=str(DEFAULT_SNAPSHOT_PATH),
        help=f"Output JSON file (default: {DEFAULT_SNAPSHOT_PATH.name})",
    )
    args = parser.parse_args()

    output_path = Path(args.output)
    if not output_path.is_absolute():
        output_path = STARTUP_DIR / output_path

    print("=" * 70)
    print("KEEP DATABASE DATA")
    print("=" * 70)
    print(f"Output file: {output_path}")

    try:
        summary = export_database_snapshot(output_path)
    except Exception as exc:
        print(f"\nExport failed: {exc}")
        import traceback

        traceback.print_exc()
        sys.exit(1)

    print(f"\nExported {summary['table_count']} table(s), {summary['total_rows']} row(s).")
    print("-" * 70)
    for table_name, count in sorted(summary["row_counts"].items()):
        print(f"  {table_name}: {count}")
    print("=" * 70)
    print("Export complete.")


if __name__ == "__main__":
    main()
