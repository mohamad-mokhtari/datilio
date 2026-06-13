"""Fix rules name unique constraint to be per file

Revision ID: c3d4e5f6a7b8
Revises: b2c3d4e5f6a7
Create Date: 2026-06-11

"""
from typing import Sequence, Union

from alembic import op
from sqlalchemy import text


revision: str = "c3d4e5f6a7b8"
down_revision: Union[str, None] = "b2c3d4e5f6a7"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Rename duplicate (user_data_id, rule_name) rows so the unique constraint can apply.
    # Keeps the oldest row unchanged; suffixes others with a short id fragment.
    op.get_bind().execute(
        text(
            """
            UPDATE rules r
            SET rule_name = r.rule_name || '_copy_' || LEFT(REPLACE(r.id::text, '-', ''), 8)
            FROM (
                SELECT id,
                       ROW_NUMBER() OVER (
                           PARTITION BY user_data_id, rule_name
                           ORDER BY created_at NULLS LAST, id
                       ) AS rn
                FROM rules
            ) ranked
            WHERE r.id = ranked.id
              AND ranked.rn > 1
            """
        )
    )

    op.create_unique_constraint(
        "uq_rules_user_data_id_rule_name",
        "rules",
        ["user_data_id", "rule_name"],
    )


def downgrade() -> None:
    op.drop_constraint("uq_rules_user_data_id_rule_name", "rules", type_="unique")
