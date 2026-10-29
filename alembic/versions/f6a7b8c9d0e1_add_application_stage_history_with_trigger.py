"""Add application stage history table with automatic trigger

Revision ID: f6a7b8c9d0e1
Revises: e5f6a7b8c9d0
Create Date: 2026-10-28 03:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision: str = 'f6a7b8c9d0e1'
down_revision: Union[str, Sequence[str], None] = 'e5f6a7b8c9d0'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # Create application_stage_history table
    op.create_table(
        'application_stage_history',
        sa.Column('application_id', sa.UUID(), nullable=False),
        sa.Column('from_stage', sa.Enum('applied', 'screening', 'interview', 'offer', 'hired', 'rejected', name='applicationstage'), nullable=False),
        sa.Column('to_stage', sa.Enum('applied', 'screening', 'interview', 'offer', 'hired', 'rejected', name='applicationstage'), nullable=False),
        sa.Column('changed_by_user_id', sa.String(length=36), nullable=True),
        sa.Column('reason', sa.String(length=255), nullable=True),
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['application_id'], ['applications.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_application_stage_history_id', 'application_stage_history', ['id'], unique=False)
    op.create_index('ix_application_stage_history_application_id', 'application_stage_history', ['application_id'], unique=False)
    op.create_index('ix_stage_history_app_created', 'application_stage_history', ['application_id', 'created_at'], unique=False)

    # Create trigger function to automatically log stage changes
    op.execute("""
        CREATE OR REPLACE FUNCTION log_application_stage_change()
        RETURNS TRIGGER AS $$
        BEGIN
            IF OLD.stage IS DISTINCT FROM NEW.stage THEN
                INSERT INTO application_stage_history (id, application_id, from_stage, to_stage, changed_by_user_id, reason)
                VALUES (gen_random_uuid(), NEW.id, OLD.stage, NEW.stage, NEW.modified_by, NULL);
            END IF;
            RETURN NEW;
        END;
        $$ LANGUAGE plpgsql;
    """)

    # Create trigger on applications table
    op.execute("""
        CREATE TRIGGER trigger_application_stage_history
        AFTER UPDATE OF stage ON applications
        FOR EACH ROW
        EXECUTE FUNCTION log_application_stage_change();
    """)


def downgrade() -> None:
    """Downgrade schema."""
    # Drop trigger
    op.execute('DROP TRIGGER IF EXISTS trigger_application_stage_history ON applications')

    # Drop trigger function
    op.execute('DROP FUNCTION IF EXISTS log_application_stage_change()')

    # Drop indexes
    op.drop_index('ix_stage_history_app_created', table_name='application_stage_history')
    op.drop_index('ix_application_stage_history_application_id', table_name='application_stage_history')
    op.drop_index('ix_application_stage_history_id', table_name='application_stage_history')

    # Drop table
    op.drop_table('application_stage_history')
