"""Add preprocessed_data table

Revision ID: add_preprocessed_data
Revises: a1b2c3d4e5f6
Create Date: 2025-10-26

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = 'add_preprocessed_data'
down_revision = 'a1b2c3d4e5f6'
branch_labels = None
depends_on = None


def upgrade():
    # Create preprocessed_data table
    op.create_table(
        'preprocessed_data',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('original_file_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('file_name', sa.String(), nullable=False),
        sa.Column('file_path', sa.String(), nullable=False),
        sa.Column('file_size', sa.Integer(), nullable=True),
        sa.Column('preprocessing_config', postgresql.JSON, nullable=False),
        sa.Column('mode', sa.String(), nullable=False),
        sa.Column('transformations_applied', postgresql.JSON, nullable=True),
        sa.Column('warnings', postgresql.JSON, nullable=True),
        sa.Column('rows_before', sa.Integer(), nullable=True),
        sa.Column('rows_after', sa.Integer(), nullable=True),
        sa.Column('columns_before', sa.Integer(), nullable=True),
        sa.Column('columns_after', sa.Integer(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True)
    )
    
    # Create indexes
    op.create_index('ix_preprocessed_data_id', 'preprocessed_data', ['id'], unique=True)
    op.create_index('ix_preprocessed_data_user_id', 'preprocessed_data', ['user_id'])
    op.create_index('ix_preprocessed_data_original_file_id', 'preprocessed_data', ['original_file_id'])
    
    # Create foreign key constraints
    op.create_foreign_key(
        'fk_preprocessed_data_user_id',
        'preprocessed_data', 'users',
        ['user_id'], ['id'],
        ondelete='CASCADE'
    )
    
    op.create_foreign_key(
        'fk_preprocessed_data_original_file_id',
        'preprocessed_data', 'user_data',
        ['original_file_id'], ['id'],
        ondelete='CASCADE'
    )


def downgrade():
    # Drop foreign key constraints
    op.drop_constraint('fk_preprocessed_data_original_file_id', 'preprocessed_data', type_='foreignkey')
    op.drop_constraint('fk_preprocessed_data_user_id', 'preprocessed_data', type_='foreignkey')
    
    # Drop indexes
    op.drop_index('ix_preprocessed_data_original_file_id', 'preprocessed_data')
    op.drop_index('ix_preprocessed_data_user_id', 'preprocessed_data')
    op.drop_index('ix_preprocessed_data_id', 'preprocessed_data')
    
    # Drop table
    op.drop_table('preprocessed_data')

