"""
Pytest: synthetic field matrix (optional — can be slow).

Run:
  pytest tests/test_synthetic_fields_matrix.py -v
  pytest tests/test_synthetic_fields_matrix.py -v -k mimesis_person
"""

import pytest

from app.services.synthetic_field_audit import run_field_audit


@pytest.mark.slow
def test_all_synthetic_catalog_fields_pass():
    results = run_field_audit(num_rows=3)
    failures = [r for r in results if r.status == "fail"]
    if failures:
        lines = [f"{f.category}.{f.field}: {f.error}" for f in failures[:20]]
        extra = f"\n... and {len(failures) - 20} more" if len(failures) > 20 else ""
        pytest.fail(
            f"{len(failures)} field(s) failed:\n" + "\n".join(lines) + extra
        )


@pytest.mark.parametrize(
    "category",
    [
        "mimesis_person",
        "mimesis_address",
        "mimesis_datetime",
        "numpy_distribution",
    ],
)
def test_synthetic_category_smoke(category: str):
    results = run_field_audit(num_rows=3, categories=[category])
    failures = [r for r in results if r.status == "fail"]
    assert not failures, f"{category} failures: " + ", ".join(
        f"{r.field}" for r in failures[:10]
    )
