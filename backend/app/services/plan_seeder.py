from __future__ import annotations

import csv
import json
import uuid as uuid_module
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Dict, List, Optional

from sqlalchemy.orm import Session

from app.models.plan_model import Plan

DEFAULT_PLANS_CSV = Path(__file__).resolve().parents[2] / "startup" / "plans_and_add_on.csv"


@dataclass
class PlanSyncResult:
    added: int = 0
    updated: int = 0
    unchanged: int = 0
    deactivated: int = 0
    total_in_csv: int = 0

    @property
    def changed(self) -> bool:
        return self.added > 0 or self.updated > 0 or self.deactivated > 0


def _parse_bool(value: Optional[str], default: bool = False) -> bool:
    if value is None or str(value).strip() == "":
        return default
    return str(value).strip().lower() in {"true", "1", "yes"}


def _parse_features(raw: Optional[str]) -> Dict[str, Any]:
    if not raw:
        return {}
    try:
        return json.loads(raw.replace('""', '"'))
    except json.JSONDecodeError:
        return {}


def read_plans_from_csv(csv_path: Path) -> List[Dict[str, Any]]:
    """Read plan definitions from CSV."""
    plans: List[Dict[str, Any]] = []

    with csv_path.open("r", encoding="utf-8", newline="") as file:
        reader = csv.DictReader(file)
        for raw_row in reader:
            row = { (key or "").strip(): value for key, value in raw_row.items() }
            if not row.get("id") or not row.get("name"):
                continue

            plans.append(
                {
                    "id": uuid_module.UUID(row["id"].strip()),
                    "name": row["name"].strip(),
                    "description": row["description"].strip()
                    if row.get("description")
                    else None,
                    "price_monthly": float(row["price_monthly"])
                    if row.get("price_monthly")
                    else 0.0,
                    "price_yearly": float(row["price_yearly"])
                    if row.get("price_yearly") and row["price_yearly"].strip()
                    else 0.0,
                    "is_active": _parse_bool(row.get("is_active"), default=True),
                    "file_limit": int(row["file_limit"]) if row.get("file_limit") else 1,
                    "file_size_limit_mb": int(row["file_size_limit_mb"])
                    if row.get("file_size_limit_mb")
                    else 5,
                    "storage_limit_gb": float(row["storage_limit_gb"])
                    if row.get("storage_limit_gb")
                    else 0.005,
                    "rules_limit": int(row["rules_limit"]) if row.get("rules_limit") else 1,
                    "custom_lists_limit": int(row["custom_lists_limit"])
                    if row.get("custom_lists_limit")
                    else 1,
                    "ai_prompts_per_month": int(row["ai_prompts_per_month"])
                    if row.get("ai_prompts_per_month")
                    else 100,
                    "ai_tokens_per_month": int(row["ai_tokens_per_month"])
                    if row.get("ai_tokens_per_month")
                    else 50000,
                    "synthetic_rows_per_month": int(row["synthetic_rows_per_month"])
                    if row.get("synthetic_rows_per_month")
                    else 500,
                    "features": _parse_features(row.get("features")),
                    "is_addon": _parse_bool(row.get("is_addon"), default=False),
                    "priority_processing": _parse_bool(
                        row.get("priority_processing"), default=False
                    ),
                    "team_sharing": _parse_bool(row.get("team_sharing"), default=False),
                    "stripe_price_id_monthly": row["stripe_price_id_monthly"].strip()
                    if row.get("stripe_price_id_monthly")
                    and row["stripe_price_id_monthly"].strip()
                    else None,
                    "stripe_price_id_yearly": row["stripe_price_id_yearly"].strip()
                    if row.get("stripe_price_id_yearly")
                    and row["stripe_price_id_yearly"].strip()
                    else None,
                }
            )

    return plans


def _plan_differs(existing: Plan, plan_data: Dict[str, Any]) -> bool:
    for key, value in plan_data.items():
        if key == "id":
            continue
        if getattr(existing, key) != value:
            return True
    return False


class PlanSeeder:
    """Seed and sync pricing plans from CSV."""

    @staticmethod
    def sync_plans_from_csv(
        db: Session,
        csv_path: Optional[Path] = None,
    ) -> PlanSyncResult:
        """Sync plans with CSV: add, update, and deactivate removed plans."""
        path = csv_path or DEFAULT_PLANS_CSV
        if not path.is_file():
            raise FileNotFoundError(f"Plans CSV not found: {path}")

        plans_data = read_plans_from_csv(path)
        if not plans_data:
            raise ValueError(
                f"No plans read from {path}. "
                "Check CSV headers (id, name, ...) and that rows are not empty."
            )

        csv_ids = {plan["id"] for plan in plans_data}
        existing_by_id = {plan.id: plan for plan in db.query(Plan).all()}

        result = PlanSyncResult(total_in_csv=len(plans_data))

        for plan_data in plans_data:
            existing = existing_by_id.get(plan_data["id"])
            if existing:
                if _plan_differs(existing, plan_data):
                    for key, value in plan_data.items():
                        if key != "id":
                            setattr(existing, key, value)
                    result.updated += 1
                else:
                    result.unchanged += 1
            else:
                db.add(Plan(**plan_data))
                result.added += 1

        for plan_id, plan in existing_by_id.items():
            if plan_id not in csv_ids and plan.is_active:
                plan.is_active = False
                result.deactivated += 1

        db.commit()
        return result

    @staticmethod
    def seed_plans(db: Session) -> List[Plan]:
        """Backward-compatible entry point used by the admin API."""
        result = PlanSeeder.sync_plans_from_csv(db)
        return db.query(Plan).filter(Plan.is_active == True).order_by(Plan.price_monthly).all()

    @staticmethod
    def get_plan_by_name(db: Session, name: str) -> Plan:
        """Get a plan by name."""
        return db.query(Plan).filter(Plan.name == name, Plan.is_active == True).first()

    @staticmethod
    def get_addons(db: Session) -> List[Plan]:
        """Get all add-on plans."""
        return (
            db.query(Plan)
            .filter(Plan.is_addon == True, Plan.is_active == True)
            .all()
        )

    @staticmethod
    def get_main_plans(db: Session) -> List[Plan]:
        """Get all main plans (non-addons)."""
        return (
            db.query(Plan)
            .filter(Plan.is_addon == False, Plan.is_active == True)
            .all()
        )
