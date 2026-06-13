#!/usr/bin/env python3
"""
Publish a blog post from a JSON draft file.

Usage (local):
  python publish_blog_draft.py blog_drafts/ai-data-analytics-trust-2026.json

Usage (inside Docker on VPS):
  docker compose -f docker-compose.prod.yml exec backend \\
    python publish_blog_draft.py blog_drafts/ai-data-analytics-trust-2026.json

Set BLOG_API_URL if not using default http://localhost:8000/api/v1/blog/
"""

import asyncio
import json
import os
import sys
from pathlib import Path

import httpx

DEFAULT_API_URL = os.getenv("BLOG_API_URL", "http://localhost:8000/api/v1/blog/")


async def publish(draft_path: Path, api_url: str) -> None:
    if not draft_path.is_file():
        raise FileNotFoundError(f"Draft not found: {draft_path}")

    payload = json.loads(draft_path.read_text(encoding="utf-8"))
    title = payload.get("title", "(no title)")
    slug = payload.get("slug", "")

    async with httpx.AsyncClient() as client:
        response = await client.post(api_url, json=payload, timeout=60.0)

    if response.status_code == 201:
        print("Blog post published successfully.")
        print(f"  Title: {title}")
        print(f"  Slug:  {slug}")
        print(f"  Public URL: https://datilio.com/blog-post/{slug}")
        print(f"  Blog home:  https://datilio.com/blog-home")
        return

    if response.status_code == 400 and "already exists" in response.text.lower():
        print(f"A post with slug '{slug}' may already exist.")
        print(response.text)
        return

    print(f"Failed to publish. HTTP {response.status_code}")
    print(response.text)
    sys.exit(1)


def main() -> None:
    if len(sys.argv) < 2:
        print("Usage: python publish_blog_draft.py <path-to-draft.json>")
        sys.exit(1)

    draft_path = Path(sys.argv[1])
    if not draft_path.is_absolute():
        draft_path = Path(__file__).resolve().parent / draft_path

    api_url = DEFAULT_API_URL
    if not api_url.endswith("/"):
        api_url += "/"

    print(f"Publishing: {draft_path.name}")
    print(f"API: {api_url}")
    asyncio.run(publish(draft_path, api_url))


if __name__ == "__main__":
    main()
