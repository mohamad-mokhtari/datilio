#!/usr/bin/env python3
"""
Bulk-publish blog drafts to local or production API.

Usage (generate drafts first):
  python scripts/generate_blog_seed_drafts.py

Publish all seed drafts locally:
  python scripts/publish_all_blog_drafts.py --dir blog_drafts/seed

Publish to production from your laptop:
  set BLOG_API_URL=https://datilio.com/api/v1/blog/
  python scripts/publish_all_blog_drafts.py --dir blog_drafts/seed

Dry run (no API calls):
  python scripts/publish_all_blog_drafts.py --dir blog_drafts/seed --dry-run

Filter by category:
  python scripts/publish_all_blog_drafts.py --dir blog_drafts/seed --category News
"""

from __future__ import annotations

import argparse
import asyncio
import json
import os
import sys
import time
from pathlib import Path

import httpx

BACKEND_DIR = Path(__file__).resolve().parent.parent
DEFAULT_API_URL = os.getenv("BLOG_API_URL", "http://localhost:8000/api/v1/blog/")


async def publish_one(client: httpx.AsyncClient, api_url: str, draft_path: Path, dry_run: bool) -> str:
    payload = json.loads(draft_path.read_text(encoding="utf-8"))
    slug = payload.get("slug", draft_path.stem)
    title = payload.get("title", slug)

    if dry_run:
        print(f"[dry-run] would publish: {slug} — {title}")
        return "dry-run"

    response = await client.post(api_url, json=payload, timeout=90.0)
    if response.status_code == 201:
        print(f"OK  {slug}")
        return "published"

    text = response.text.lower()
    if response.status_code == 400 and "already exists" in text:
        print(f"SKIP {slug} (already exists)")
        return "skipped"

    print(f"FAIL {slug} HTTP {response.status_code}")
    print(response.text[:500])
    return "failed"


async def publish_all(
    draft_dir: Path,
    api_url: str,
    category: str | None,
    dry_run: bool,
    delay_ms: int,
) -> dict[str, int]:
    files = sorted(draft_dir.rglob("*.json"))
    if category:
        files = [f for f in files if json.loads(f.read_text(encoding="utf-8")).get("category") == category]

    stats = {"published": 0, "skipped": 0, "failed": 0, "dry-run": 0}
    if not files:
        print(f"No draft files found in {draft_dir}")
        return stats

    print(f"Publishing {len(files)} draft(s) to {api_url}")
    async with httpx.AsyncClient() as client:
        for index, draft_path in enumerate(files):
            result = await publish_one(client, api_url, draft_path, dry_run)
            stats[result] = stats.get(result, 0) + 1
            if not dry_run and index < len(files) - 1 and delay_ms > 0:
                await asyncio.sleep(delay_ms / 1000)

    return stats


def main() -> None:
    parser = argparse.ArgumentParser(description="Bulk publish blog draft JSON files.")
    parser.add_argument(
        "--dir",
        type=Path,
        default=BACKEND_DIR / "blog_drafts" / "seed",
        help="Directory containing draft JSON files",
    )
    parser.add_argument("--category", type=str, default=None, help="Only publish this category")
    parser.add_argument("--dry-run", action="store_true", help="List drafts without calling API")
    parser.add_argument("--delay-ms", type=int, default=150, help="Delay between publishes (ms)")
    parser.add_argument("--api-url", type=str, default=DEFAULT_API_URL, help="Blog create API URL")
    args = parser.parse_args()

    draft_dir = args.dir
    if not draft_dir.is_absolute():
        draft_dir = BACKEND_DIR / draft_dir

    api_url = args.api_url
    if not api_url.endswith("/"):
        api_url += "/"

    stats = asyncio.run(
        publish_all(draft_dir, api_url, args.category, args.dry_run, args.delay_ms)
    )
    print("\nSummary:", stats)
    if stats.get("failed", 0) > 0:
        sys.exit(1)


if __name__ == "__main__":
    main()
