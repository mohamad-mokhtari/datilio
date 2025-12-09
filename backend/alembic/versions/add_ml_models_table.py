"""add_ml_models_table

Revision ID: add_ml_models_table
Revises: add_preprocessed_data
Create Date: 2025-10-30 12:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = 'add_ml_models_table'
down_revision = 'add_preprocessed_data'
branch_labels = None
depends_on = None


def upgrade():
    # Create ml_models table
    op.create_table(
        'ml_models',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('preprocessed_file_id', postgresql.UUID(as_uuid=True), nullable=True),
        
        # Model Identity
        sa.Column('model_name', sa.String(), nullable=False),
        sa.Column('model_type', sa.String(), nullable=False),
        sa.Column('algorithm', sa.String(), nullable=False),
        
        # Training Configuration
        sa.Column('target_column', sa.String(), nullable=True),
        sa.Column('feature_columns', postgresql.JSON(), nullable=False),
        sa.Column('train_size', sa.Float(), nullable=False),
        sa.Column('test_size', sa.Float(), nullable=False),
        sa.Column('random_state', sa.Integer(), nullable=True),
        sa.Column('hyperparameters', postgresql.JSON(), nullable=True),
        
        # Model File
        sa.Column('model_file_path', sa.String(), nullable=False),
        sa.Column('model_file_size', sa.Integer(), nullable=True),
        
        # Training Results
        sa.Column('training_rows', sa.Integer(), nullable=True),
        sa.Column('test_rows', sa.Integer(), nullable=True),
        sa.Column('performance_metrics', postgresql.JSON(), nullable=True),
        
        # Schema Validation
        sa.Column('column_schema', postgresql.JSON(), nullable=False),
        
        # Preprocessing
        sa.Column('preprocessing_config', postgresql.JSON(), nullable=True),
        
        # Metadata
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('status', sa.String(), nullable=False, server_default='ready'),
        sa.Column('error_message', sa.Text(), nullable=True),
        sa.Column('training_duration_seconds', sa.Float(), nullable=True),
        
        # Timestamps
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.text('NOW()')),
        sa.Column('updated_at', sa.DateTime(), nullable=False, server_default=sa.text('NOW()')),
        
        # Foreign Keys
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['preprocessed_file_id'], ['preprocessed_data.id'], ondelete='SET NULL'),
    )
    
    # Create indexes
    op.create_index('ix_ml_models_id', 'ml_models', ['id'], unique=True)
    op.create_index('ix_ml_models_user_id', 'ml_models', ['user_id'])
    op.create_index('ix_ml_models_status', 'ml_models', ['status'])


def downgrade():
    # Drop indexes
    op.drop_index('ix_ml_models_status', table_name='ml_models')
    op.drop_index('ix_ml_models_user_id', table_name='ml_models')
    op.drop_index('ix_ml_models_id', table_name='ml_models')
    
    # Drop table
    op.drop_table('ml_models')

