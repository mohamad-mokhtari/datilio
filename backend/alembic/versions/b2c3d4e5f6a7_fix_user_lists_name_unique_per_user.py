"""Fix user_lists name unique constraint to be per user

Revision ID: b2c3d4e5f6a7
Revises: 0ae87a357155
Create Date: 2026-06-09

"""
from typing import Sequence, Union

from alembic import op


revision: str = "b2c3d4e5f6a7"
down_revision: Union[str, None] = "0ae87a357155"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Drop global unique on name (wrong: blocked different users from same list name)
    op.drop_index("ix_user_lists_name", table_name="user_lists")
    op.create_index("ix_user_lists_name", "user_lists", ["name"], unique=False)
    op.create_unique_constraint(
        "uq_user_lists_user_id_name",
        "user_lists",
        ["user_id", "name"],
    )


def downgrade() -> None:
    op.drop_constraint("uq_user_lists_user_id_name", "user_lists", type_="unique")
    op.drop_index("ix_user_lists_name", table_name="user_lists")
    op.create_index("ix_user_lists_name", "user_lists", ["name"], unique=True)
