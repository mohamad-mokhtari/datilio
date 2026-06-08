"""
User-friendly error messages for synthetic data generation tasks.
"""

from __future__ import annotations

import re
from typing import Optional, Tuple

from sqlalchemy.exc import IntegrityError

_FILENAME_FROM_DB_ERROR = re.compile(
    r"file_name\)=\([^,]+,\s*([^)]+)\)",
    re.IGNORECASE,
)


def normalize_csv_filename(filename: Optional[str]) -> Optional[str]:
    """Normalize a user-provided CSV filename, or None if empty."""
    if not filename or not str(filename).strip():
        return None
    name = str(filename).strip()
    if not name.lower().endswith(".csv"):
        name += ".csv"
    return name


def extract_filename_from_error(raw: str) -> Optional[str]:
    match = _FILENAME_FROM_DB_ERROR.search(raw)
    if match:
        return match.group(1).strip()
    return None


def format_synthetic_task_error(error: Exception | str) -> str:
    """Convert a technical exception/message into a user-friendly string."""
    if isinstance(error, IntegrityError):
        raw = str(error.orig) if getattr(error, "orig", None) else str(error)
    else:
        raw = str(error) if error else ""

    lower = raw.lower()

    if (
        "uq_user_file_name" in lower
        or ("duplicate key" in lower and "file_name" in lower)
        or ("uniqueviolation" in lower and "file_name" in lower)
    ):
        filename = extract_filename_from_error(raw) or "this name"
        return (
            f'A file named "{filename}" already exists in your account. '
            "Please choose a different file name and try again."
        )

    if "storage limit exceeded" in lower:
        return (
            "You have reached your storage limit. "
            "Delete some files or upgrade your plan, then try again."
        )

    if (
        "error 10061" in lower
        or "connection refused" in lower
        or "failed to queue" in lower
        or "redis" in lower
    ):
        return (
            "Our background processing system is temporarily unavailable. "
            "Please try again in a few minutes."
        )

    if "timeout" in lower or "no workers" in lower:
        return (
            "The task could not be processed in time because no workers were available. "
            "Please try again later."
        )

    if "quota" in lower or "limit exceeded" in lower:
        return (
            "You have reached your synthetic data row limit for this month. "
            "Please upgrade your plan or try again next month."
        )

    if any(
        token in lower
        for token in (
            "sqlalchemy",
            "psycopg2",
            "integrityerror",
            "pendingrollbackerror",
            "traceback",
            "insert into",
            "select ",
        )
    ):
        return (
            "Something went wrong while saving your generated file. "
            "Please try again with a different file name or contact support if the issue continues."
        )

    if len(raw) > 200 or "[" in raw and "]" in raw:
        return (
            "Data generation failed due to an unexpected error. "
            "Please review your settings and try again."
        )

    return raw


def classify_synthetic_failure(error_message: Optional[str]) -> Tuple[str, str]:
    """
    Return (failure_type, user_friendly_message) for API responses.
    failure_type: duplicate_filename | storage_limit | service_unavailable |
                  worker_timeout | processing_error
    """
    if not error_message:
        return "processing_error", "Data generation failed. Please try again."

    friendly = format_synthetic_task_error(error_message)
    lower = error_message.lower()

    if (
        "uq_user_file_name" in lower
        or ("duplicate key" in lower and "file_name" in lower)
        or "already exists in your account" in friendly.lower()
    ):
        return "duplicate_filename", friendly

    if "storage limit exceeded" in lower:
        return "storage_limit", friendly

    if (
        "redis" in lower
        or "connection refused" in lower
        or "failed to queue" in lower
    ):
        return "service_unavailable", friendly

    if "timeout" in lower or "no workers" in lower:
        return "worker_timeout", friendly

    return "processing_error", friendly
