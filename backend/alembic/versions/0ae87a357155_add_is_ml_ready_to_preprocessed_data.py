"""add_is_ml_ready_to_preprocessed_data

Revision ID: 0ae87a357155
Revises: add_ml_models_table
Create Date: 2025-11-03 13:18:54.666605

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '0ae87a357155'
down_revision: Union[str, None] = 'add_ml_models_table'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add is_ml_ready column to preprocessed_data table
    op.add_column(
        'preprocessed_data',
        sa.Column('is_ml_ready', sa.Boolean(), nullable=False, server_default='false')
    )
    # Create index on is_ml_ready for efficient queries
    op.create_index(
        'ix_preprocessed_data_is_ml_ready',
        'preprocessed_data',
        ['is_ml_ready']
    )


def downgrade() -> None:
    # Drop index first
    op.drop_index('ix_preprocessed_data_is_ml_ready', table_name='preprocessed_data')
    # Remove is_ml_ready column
    op.drop_column('preprocessed_data', 'is_ml_ready')
