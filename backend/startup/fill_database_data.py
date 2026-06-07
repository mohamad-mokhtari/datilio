#!/usr/bin/env python3
"""
Restore database rows from a JSON snapshot file.

After starting, asks whether to replace all current data or append snapshot rows.

Usage (Docker):
  docker compose -f docker-compose.local.yml exec -it backend python startup/fill_database_data.py
  docker compose -f docker-compose.local.yml exec backend python startup/fill_database_data.py --mode replace --yes
  docker compose -f docker-compose.local.yml exec backend python startup/fill_database_data.py --mode append

Use -it for the interactive replace/append prompt.
Default input: backend/startup/data/database_snapshot.json
"""

from __future__ import annotations

import argparse
import sys
from pathlib import Path
from typing import Optional

BACKEND_DIR = Path(__file__).resolve().parent.parent
STARTUP_DIR = Path(__file__).resolve().parent
sys.path.insert(0, str(BACKEND_DIR))

from app.services.database_snapshot import (
    DEFAULT_SNAPSHOT_PATH,
    FillMode,
    existing_row_counts,
    fill_database_snapshot,
    validate_snapshot_file,
)


def prompt_fill_mode() -> FillMode:
    print("\nHow should existing database data be handled?")
    print("  1) Replace — remove all current rows, then load snapshot")
    print("  2) Append   — keep current rows and add snapshot rows (skip PK conflicts)")
    while True:
        choice = input("Enter 1 or 2: ").strip()
        if choice == "1":
            return "replace"
        if choice == "2":
            return "append"
        print("Invalid choice. Please enter 1 or 2.")


def confirm_replace() -> bool:
    print("\nWARNING: Replace mode will DELETE all current application table data.")
    answer = input("Type YES to continue: ").strip()
    return answer == "YES"


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Load database rows from a JSON snapshot file."
    )
    parser.add_argument(
        "--input",
        "-i",
        default=str(DEFAULT_SNAPSHOT_PATH),
        help=f"Input JSON file (default: {DEFAULT_SNAPSHOT_PATH.name})",
    )
    parser.add_argument(
        "--mode",
        choices=("replace", "append"),
        help="Skip interactive mode prompt (replace or append).",
    )
    parser.add_argument(
        "--yes",
        action="store_true",
        help="Skip replace confirmation prompt (use with --mode replace).",
    )
    args = parser.parse_args()

    input_path = Path(args.input)
    if not input_path.is_absolute():
        input_path = STARTUP_DIR / input_path

    print("=" * 70)
    print("FILL DATABASE DATA")
    print("=" * 70)
    print(f"Input file: {input_path}")

    try:
        snapshot_info = validate_snapshot_file(input_path)
    except FileNotFoundError:
        print(f"\nSnapshot file not found: {input_path}")
        sys.exit(1)
    except Exception as exc:
        print(f"\nCould not read snapshot: {exc}")
        sys.exit(1)

    print(f"Snapshot exported at: {snapshot_info.get('exported_at', 'unknown')}")
    print(
        f"Snapshot rows: {snapshot_info['total_rows']} "
        f"across {snapshot_info['table_count']} table(s)"
    )

    try:
        current_counts = existing_row_counts()
        current_total = sum(current_counts.values())
        print(f"Current database rows: {current_total}")
    except Exception as exc:
        print(f"\nCould not read current database: {exc}")
        sys.exit(1)

    mode: Optional[FillMode] = args.mode
    if mode is None:
        if not sys.stdin.isatty():
            print(
                "\nNo TTY available. Use --mode replace or --mode append "
                "for non-interactive runs."
            )
            sys.exit(1)
        mode = prompt_fill_mode()

    if mode == "replace" and not args.yes:
        if not sys.stdin.isatty():
            print("\nReplace mode requires --yes in non-interactive runs.")
            sys.exit(1)
        if not confirm_replace():
            print("\nCancelled. No data was changed.")
            sys.exit(0)

    print(f"\nRunning in {mode.upper()} mode...")

    try:
        summary = fill_database_snapshot(input_path, mode)
    except Exception as exc:
        print(f"\nFill failed: {exc}")
        import traceback

        traceback.print_exc()
        sys.exit(1)

    print(f"\nProcessed {summary['total_rows_processed']} row(s).")
    print("-" * 70)
    for table_name, count in sorted(summary["tables_loaded"].items()):
        print(f"  {table_name}: {count}")
    if summary["tables_skipped"]:
        print("-" * 70)
        print("Tables not present in snapshot (left unchanged):")
        for table_name in summary["tables_skipped"]:
            print(f"  {table_name}")
    print("=" * 70)
    print("Fill complete.")


if __name__ == "__main__":
    main()
