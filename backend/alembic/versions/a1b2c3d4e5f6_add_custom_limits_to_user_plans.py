"""add custom limits to user_plans

Revision ID: a1b2c3d4e5f6
Revises: eccaed9ca5bf
Create Date: 2025-10-23 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'a1b2c3d4e5f6'
down_revision: Union[str, None] = 'eccaed9ca5bf'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add custom limit override columns to user_plans table
    op.add_column('user_plans', sa.Column('custom_file_limit', sa.Integer(), nullable=True))
    op.add_column('user_plans', sa.Column('custom_file_size_limit_mb', sa.Integer(), nullable=True))
    op.add_column('user_plans', sa.Column('custom_storage_limit_gb', sa.Float(), nullable=True))
    op.add_column('user_plans', sa.Column('custom_rules_limit', sa.Integer(), nullable=True))
    op.add_column('user_plans', sa.Column('custom_lists_limit', sa.Integer(), nullable=True))
    op.add_column('user_plans', sa.Column('custom_ai_prompts_per_month', sa.Integer(), nullable=True))
    op.add_column('user_plans', sa.Column('custom_ai_tokens_per_month', sa.Integer(), nullable=True))
    op.add_column('user_plans', sa.Column('custom_synthetic_rows_per_month', sa.Integer(), nullable=True))


def downgrade() -> None:
    # Remove custom limit override columns from user_plans table
    op.drop_column('user_plans', 'custom_synthetic_rows_per_month')
    op.drop_column('user_plans', 'custom_ai_tokens_per_month')
    op.drop_column('user_plans', 'custom_ai_prompts_per_month')
    op.drop_column('user_plans', 'custom_lists_limit')
    op.drop_column('user_plans', 'custom_rules_limit')
    op.drop_column('user_plans', 'custom_storage_limit_gb')
    op.drop_column('user_plans', 'custom_file_size_limit_mb')
    op.drop_column('user_plans', 'custom_file_limit')

