"""Generate JSON blog draft files from seed content definitions."""

from __future__ import annotations

import argparse
import json
import sys
from collections import Counter
from pathlib import Path

BACKEND_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BACKEND_DIR / "scripts"))

from blog_seed.common import topic_to_draft
from blog_seed.content import ALL_POSTS

DEFAULT_OUTPUT_DIR = BACKEND_DIR / "blog_drafts" / "seed"


def generate_drafts(output_dir: Path, force: bool = False) -> int:
    output_dir.mkdir(parents=True, exist_ok=True)
    written = 0

    for index, topic in enumerate(ALL_POSTS):
        category_dir = output_dir / topic["category"].replace(" & ", "-and-").replace(" ", "-").lower()
        category_dir.mkdir(parents=True, exist_ok=True)
        out_path = category_dir / f"{topic['slug']}.json"
        if out_path.exists() and not force:
            continue
        draft = topic_to_draft(topic, index)
        out_path.write_text(json.dumps(draft, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
        written += 1

    return written


def main() -> None:
    parser = argparse.ArgumentParser(description="Generate blog draft JSON files from seed content.")
    parser.add_argument(
        "--output-dir",
        type=Path,
        default=DEFAULT_OUTPUT_DIR,
        help=f"Output directory (default: {DEFAULT_OUTPUT_DIR})",
    )
    parser.add_argument("--force", action="store_true", help="Overwrite existing draft files")
    args = parser.parse_args()

    counts = Counter(post["category"] for post in ALL_POSTS)
    print(f"Seed catalog: {len(ALL_POSTS)} posts")
    for category, count in sorted(counts.items()):
        print(f"  {category}: {count}")

    written = generate_drafts(args.output_dir, force=args.force)
    total_files = sum(1 for _ in args.output_dir.rglob("*.json"))
    print(f"\nWrote {written} new draft file(s) to {args.output_dir}")
    print(f"Total draft files on disk: {total_files}")


if __name__ == "__main__":
    main()
