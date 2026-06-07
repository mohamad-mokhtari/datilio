"""
Automated matrix test for synthetic data field generators.

Runs each (category, field) from synthethic_categories.ALL_DATA through
SyntheticDataService.create_synthetic_data — the same path as /generate-synthetic-data/.
"""

from __future__ import annotations

import json
from dataclasses import asdict, dataclass, field
from datetime import datetime
from typing import Any, Dict, Iterator, List, Optional, Tuple

import pandas as pd

from app.lists.synthethic_categories import ALL_DATA
from app.services.synthetic_data_service import SyntheticDataService

SKIP_PARAM_KEYS = {"**kwargs", "kwargs", "**kwds", "kwds", "*args", "args", "kwds"}


@dataclass
class FieldTestResult:
    category: str
    field: str
    status: str  # pass | fail | skip
    params_used: Dict[str, str]
    error: Optional[str] = None
    sample_values: List[Any] = field(default_factory=list)
    null_count: int = 0
    row_count: int = 0


def iter_catalog_fields() -> Iterator[Tuple[str, str, Dict[str, Any]]]:
    """Yield (category, field_name, field_metadata) from ALL_DATA."""
    for category, field_list in ALL_DATA.items():
        for field_obj in field_list:
            field_name = next(iter(field_obj.keys()))
            meta = field_obj[field_name]
            yield category, field_name, meta


def build_default_params(
    category: str,
    field_name: str,
    meta: Dict[str, Any],
    num_rows: int,
) -> Dict[str, str]:
    """Build string params compatible with process_special_params / the UI."""
    params: Dict[str, str] = {}

    if category == "numpy_distribution":
        from app.services.synthetic_data_service import SyntheticDataService

        prepared = SyntheticDataService.prepare_numpy_distribution_params(
            field_name, {}, num_rows
        )
        return {key: str(value) for key, value in prepared.items()}

    for param_def in meta.get("params", []):
        if not isinstance(param_def, dict):
            continue
        for key, type_hint in param_def.items():
            if key in SKIP_PARAM_KEYS:
                continue

            param_key = "drange" if key == "drang" and field_name == "username" else key
            hint = (type_hint or "").lower()

            if "optional" in hint or hint.startswith("mimesis."):
                continue
            if param_key == "size" and category == "numpy_distribution":
                params[param_key] = str(num_rows)
                continue
            if "bool" in hint:
                params[param_key] = "false"
            elif param_key in ("minimum", "min_year", "min_duration", "low", "left", "loc", "mean", "start"):
                params[param_key] = "1"
            elif param_key in ("maximum", "max_year", "max_duration", "high", "right", "scale", "sigma", "end", "mode"):
                params[param_key] = "100"
            elif param_key == "n":
                params[param_key] = "10"
            elif param_key == "a" and field_name == "zipf":
                params[param_key] = "2.0"
            elif param_key in ("p", "lam", "b", "df"):
                params[param_key] = "0.5" if "float" in hint else "5"
            elif param_key == "a":
                params[param_key] = "2.0"
            elif param_key in ("mask",):
                params[param_key] = "####"
            elif param_key == "domains":
                params[param_key] = "example.com"
            elif param_key in ("placeholder", "fmt"):
                params[param_key] = "test"
            elif param_key in ("quantity", "length", "entropy"):
                params[param_key] = "3"
            elif "tuple" in hint:
                params[param_key] = "(1, 100)"
            elif "int" in hint:
                params[param_key] = "5"
            elif "float" in hint:
                params[param_key] = "1.0"
            elif "str" in hint:
                params[param_key] = "test"

    return params


def _columns_info(category: str, field_name: str, params: Dict[str, str]) -> Dict[str, Any]:
    return {
        "columns": {
            "audit_column": {
                "category": category,
                "field": field_name,
                "params": params,
            }
        }
    }


def _validate_column(series: pd.Series, num_rows: int) -> Optional[str]:
    if len(series) != num_rows:
        return f"expected {num_rows} rows, got {len(series)}"
    null_count = int(series.isna().sum()) + sum(1 for v in series if v is None)
    if null_count == len(series):
        return "all values are null"
    if null_count > 0:
        return f"{null_count}/{len(series)} values are null"
    return None


def test_single_field(
    category: str,
    field_name: str,
    meta: Dict[str, Any],
    num_rows: int = 5,
) -> FieldTestResult:
    if meta.get("static"):
        return FieldTestResult(
            category=category,
            field=field_name,
            status="skip",
            params_used={},
            error="static provider method — not tested in row loop",
        )

    if category.startswith("list_"):
        return FieldTestResult(
            category=category,
            field=field_name,
            status="skip",
            params_used={},
            error="user list category requires database",
        )

    attempts = [
        ("empty", {}),
        ("defaults", build_default_params(category, field_name, meta, num_rows)),
    ]

    last_error: Optional[str] = None
    for _label, params in attempts:
        try:
            df = SyntheticDataService.create_synthetic_data(
                _columns_info(category, field_name, params),
                num_rows=num_rows,
            )
            issue = _validate_column(df["audit_column"], num_rows)
            if issue:
                last_error = issue
                continue

            samples = df["audit_column"].head(3).tolist()
            return FieldTestResult(
                category=category,
                field=field_name,
                status="pass",
                params_used=params,
                sample_values=[_json_safe(v) for v in samples],
                null_count=0,
                row_count=num_rows,
            )
        except Exception as exc:
            last_error = f"{type(exc).__name__}: {exc}"

    return FieldTestResult(
        category=category,
        field=field_name,
        status="fail",
        params_used=attempts[-1][1],
        error=last_error,
        row_count=num_rows,
    )


def _json_safe(value: Any) -> Any:
    if value is None or isinstance(value, (bool, int, float, str)):
        return value
    if isinstance(value, (list, tuple)):
        return [_json_safe(v) for v in value]
    if isinstance(value, dict):
        return {str(k): _json_safe(v) for k, v in value.items()}
    return str(value)


def run_field_audit(
    num_rows: int = 5,
    categories: Optional[List[str]] = None,
    field_filter: Optional[str] = None,
) -> List[FieldTestResult]:
    results: List[FieldTestResult] = []
    for category, field_name, meta in iter_catalog_fields():
        if categories and category not in categories:
            continue
        if field_filter and field_filter not in field_name:
            continue
        results.append(test_single_field(category, field_name, meta, num_rows=num_rows))
    return results


def summarize_results(results: List[FieldTestResult]) -> Dict[str, Any]:
    passed = [r for r in results if r.status == "pass"]
    failed = [r for r in results if r.status == "fail"]
    skipped = [r for r in results if r.status == "skip"]

    by_category: Dict[str, Dict[str, int]] = {}
    for r in results:
        bucket = by_category.setdefault(r.category, {"pass": 0, "fail": 0, "skip": 0})
        bucket[r.status] += 1

    return {
        "generated_at": datetime.utcnow().isoformat() + "Z",
        "total": len(results),
        "passed": len(passed),
        "failed": len(failed),
        "skipped": len(skipped),
        "by_category": by_category,
        "failures": [asdict(r) for r in failed],
        "results": [asdict(r) for r in results],
    }


def print_summary(report: Dict[str, Any]) -> None:
    print("=" * 72)
    print("SYNTHETIC FIELD AUDIT")
    print("=" * 72)
    print(
        f"Total: {report['total']}  |  PASS: {report['passed']}  |  "
        f"FAIL: {report['failed']}  |  SKIP: {report['skipped']}"
    )
    print("-" * 72)
    for category, counts in sorted(report["by_category"].items()):
        print(
            f"  {category}: pass={counts['pass']} fail={counts['fail']} skip={counts['skip']}"
        )
    if report["failed"]:
        print("-" * 72)
        print("Failures:")
        for item in report["failures"]:
            print(f"  - {item['category']}.{item['field']}: {item['error']}")
    print("=" * 72)


def write_report(path: str, report: Dict[str, Any]) -> None:
    with open(path, "w", encoding="utf-8") as fh:
        json.dump(report, fh, indent=2, ensure_ascii=False)
