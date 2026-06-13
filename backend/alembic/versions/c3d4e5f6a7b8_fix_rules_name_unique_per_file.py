"""Fix rules name unique constraint to be per file

Revision ID: c3d4e5f6a7b8
Revises: b2c3d4e5f6a7
Create Date: 2026-06-11

"""
from typing import Sequence, Union

from alembic import op


revision: str = "c3d4e5f6a7b8"
down_revision: Union[str, None] = "b2c3d4e5f6a7"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_unique_constraint(
        "uq_rules_user_data_id_rule_name",
        "rules",
        ["user_data_id", "rule_name"],
    )


def downgrade() -> None:
    op.drop_constraint("uq_rules_user_data_id_rule_name", "rules", type_="unique")
