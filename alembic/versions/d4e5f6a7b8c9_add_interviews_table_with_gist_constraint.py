"""Add interviews table with GIST exclusion constraint

Revision ID: d4e5f6a7b8c9
Revises: c3e4f5a6b7d8
Create Date: 2026-10-28 02:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision: str = 'd4e5f6a7b8c9'
down_revision: Union[str, Sequence[str], None] = 'c3e4f5a6b7d8'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # Create btree_gist extension for GIST exclusion constraint
    op.execute('CREATE EXTENSION IF NOT EXISTS btree_gist')

    # Create interviews table
    op.create_table(
        'interviews',
        sa.Column('application_id', sa.UUID(), nullable=False),
        sa.Column('interviewer_id', sa.UUID(), nullable=False),
        sa.Column('scheduled_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('duration_minutes', sa.Integer(), nullable=False, server_default='45'),
        sa.Column('status', sa.Enum('scheduled', 'completed', 'cancelled', 'no_show', name='interviewstatus'), nullable=False, server_default='scheduled'),
        sa.Column('meeting_link', sa.String(length=512), nullable=True),
        sa.Column('location', sa.String(length=255), nullable=True),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('modified_by', sa.String(length=255), nullable=True),
        sa.CheckConstraint('duration_minutes > 0', name='ck_interview_duration_positive'),
        sa.ForeignKeyConstraint(['application_id'], ['applications.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['interviewer_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_interviews_id', 'interviews', ['id'], unique=False)
    op.create_index('ix_interviews_application_id', 'interviews', ['application_id'], unique=False)
    op.create_index('ix_interviews_interviewer_id', 'interviews', ['interviewer_id'], unique=False)
    op.create_index('ix_interviews_scheduled_at', 'interviews', ['scheduled_at'], unique=False)
    op.create_index('ix_interviews_status', 'interviews', ['status'], unique=False)

    # Create immutable helper for GiST timerange calculation
    op.execute("""
        CREATE OR REPLACE FUNCTION interview_timerange(st timestamptz, duration integer)
        RETURNS tstzrange AS $$
        BEGIN
            RETURN tstzrange(st, st + make_interval(mins => duration));
        END;
        $$ LANGUAGE plpgsql IMMUTABLE;
    """)

    # Add GIST exclusion constraint to prevent overlapping interviews for the same interviewer
    op.execute("""
        ALTER TABLE interviews
        ADD CONSTRAINT no_overlapping_interviewer_schedule
        EXCLUDE USING gist (
            interviewer_id WITH =,
            interview_timerange(scheduled_at, duration_minutes) WITH &&
        ) WHERE (status = 'scheduled');
    """)


def downgrade() -> None:
    """Downgrade schema."""
    # Drop GIST exclusion constraint
    op.execute('ALTER TABLE interviews DROP CONSTRAINT IF EXISTS no_overlapping_interviewer_schedule')

    # Drop indexes
    op.drop_index('ix_interviews_status', table_name='interviews')
    op.drop_index('ix_interviews_scheduled_at', table_name='interviews')
    op.drop_index('ix_interviews_interviewer_id', table_name='interviews')
    op.drop_index('ix_interviews_application_id', table_name='interviews')
    op.drop_index('ix_interviews_id', table_name='interviews')

    # Drop table
    op.drop_table('interviews')

    # Drop btree_gist extension (optional, can keep it)
    # op.execute('DROP EXTENSION IF EXISTS btree_gist')
