"""Shared helpers for blog seed draft generation."""

from __future__ import annotations

from typing import Any

UNSPLASH_PHOTOS = [
    ("1551288049-bebda4e38f71", "Analytics dashboard with charts on a laptop screen"),
    ("1460925895917-afdab827c52f", "Professional reviewing business charts on a laptop"),
    ("1677442136019-21780ecad995", "Abstract visualization representing AI and data"),
    ("1555949963-aa79d162c599", "Team collaborating around data on a screen"),
    ("1504868580729-ff25987587a3", "Person working with spreadsheets and notes"),
    ("1543286386-713bdd548da4", "Data visualization on a modern display"),
    ("1518186285589-2f7639f5915c", "Calculator and financial data analysis"),
    ("1454165804606-c3d57bc86b40", "Business planning with documents and laptop"),
    ("1533750343818-4149482b1375", "Charts and graphs for business reporting"),
    ("1553877522-43269d4ea984", "Team meeting with presentation screen"),
]


def unsplash_url(photo_id: str, width: int = 1200) -> str:
    return f"https://images.unsplash.com/photo-{photo_id}?w={width}&fm=jpg&fit=crop"


def build_body(topic: dict[str, Any], index: int) -> list[dict[str, Any]]:
    photo_id, alt = UNSPLASH_PHOTOS[index % len(UNSPLASH_PHOTOS)]
    body: list[dict[str, Any]] = [
        {"type": "paragraph", "text": topic["intro"]},
        {
            "type": "image",
            "url": unsplash_url(photo_id),
            "alt": alt,
            "caption": f"{alt}. Photo: Unsplash",
        },
        {"type": "heading", "level": 2, "text": topic["section1_title"]},
    ]
    for paragraph in topic["section1_paragraphs"]:
        body.append({"type": "paragraph", "text": paragraph})
    body.append({"type": "list", "style": "unordered", "items": topic["bullets"]})
    body.append({"type": "heading", "level": 2, "text": topic["section2_title"]})
    for paragraph in topic["section2_paragraphs"]:
        body.append({"type": "paragraph", "text": paragraph})
    body.append({"type": "paragraph", "text": topic["closing"]})
    return body


def topic_to_draft(topic: dict[str, Any], index: int) -> dict[str, Any]:
    photo_id, _ = UNSPLASH_PHOTOS[index % len(UNSPLASH_PHOTOS)]
    return {
        "title": topic["title"],
        "slug": topic["slug"],
        "summary": topic["summary"],
        "featured_image_url": unsplash_url(photo_id),
        "content": {
            "summary": topic["summary"],
            "body": build_body(topic, index),
        },
        "author_name": "Datilio Team",
        "author_email": "team@datilio.com",
        "category": topic["category"],
        "tags": topic["tags"],
        "is_published": True,
        "meta_description": topic["summary"][:300],
        "meta_keywords": ", ".join(topic["tags"][:8]),
    }
