#!/usr/bin/env python3
"""
Run a full matrix test of synthetic data categories/fields.

Usage (from repo root):
  docker compose -f docker-compose.local.yml exec backend python scripts/run_synthetic_field_audit.py

  docker compose -f docker-compose.local.yml exec backend python scripts/run_synthetic_field_audit.py \\
    --category mimesis_person --output /tmp/synthetic_audit.json

Exit code 1 if any field fails (for CI).
"""

import argparse
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.services.synthetic_field_audit import (
    print_summary,
    run_field_audit,
    summarize_results,
    write_report,
)


def main() -> int:
    parser = argparse.ArgumentParser(description="Audit all synthetic data field generators")
    parser.add_argument("--rows", type=int, default=5, help="Rows per field test (default: 5)")
    parser.add_argument(
        "--category",
        action="append",
        help="Limit to category (repeatable), e.g. mimesis_person",
    )
    parser.add_argument("--field", help="Substring filter on field name")
    parser.add_argument(
        "--output",
        default="synthetic_field_audit_report.json",
        help="JSON report path (default: synthetic_field_audit_report.json)",
    )
    parser.add_argument(
        "--no-fail-on-error",
        action="store_true",
        help="Always exit 0 even when fields fail",
    )
    args = parser.parse_args()

    results = run_field_audit(
        num_rows=args.rows,
        categories=args.category,
        field_filter=args.field,
    )
    report = summarize_results(results)
    print_summary(report)
    write_report(args.output, report)
    print(f"\nReport written to: {args.output}")

    if not args.no_fail_on_error and report["failed"] > 0:
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
