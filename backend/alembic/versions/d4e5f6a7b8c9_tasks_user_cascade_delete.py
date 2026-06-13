"""Add ON DELETE CASCADE to tasks.user_id foreign key."""

from typing import Sequence, Union

from alembic import op

revision: str = "d4e5f6a7b8c9"
down_revision: Union[str, None] = "c3d4e5f6a7b8"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.drop_constraint("tasks_user_id_fkey", "tasks", type_="foreignkey")
    op.create_foreign_key(
        "tasks_user_id_fkey",
        "tasks",
        "users",
        ["user_id"],
        ["id"],
        ondelete="CASCADE",
    )


def downgrade() -> None:
    op.drop_constraint("tasks_user_id_fkey", "tasks", type_="foreignkey")
    op.create_foreign_key(
        "tasks_user_id_fkey",
        "tasks",
        "users",
        ["user_id"],
        ["id"],
    )
