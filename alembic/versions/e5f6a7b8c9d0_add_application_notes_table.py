"""Add application notes table with rating constraint

Revision ID: e5f6a7b8c9d0
Revises: d4e5f6a7b8c9
Create Date: 2026-10-28 02:30:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'e5f6a7b8c9d0'
down_revision: Union[str, Sequence[str], None] = 'd4e5f6a7b8c9'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.create_table(
        'application_notes',
        sa.Column('application_id', sa.UUID(), nullable=False),
        sa.Column('author_id', sa.UUID(), nullable=False),
        sa.Column('content', sa.Text(), nullable=False),
        sa.Column('rating', sa.Integer(), nullable=True),
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('modified_by', sa.String(length=255), nullable=True),
        sa.CheckConstraint('rating BETWEEN 1 AND 5', name='ck_application_note_rating_range'),
        sa.ForeignKeyConstraint(['application_id'], ['applications.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['author_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_application_notes_id', 'application_notes', ['id'], unique=False)
    op.create_index('ix_application_notes_application_id', 'application_notes', ['application_id'], unique=False)
    op.create_index('ix_application_notes_author_id', 'application_notes', ['author_id'], unique=False)


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index('ix_application_notes_author_id', table_name='application_notes')
    op.drop_index('ix_application_notes_application_id', table_name='application_notes')
    op.drop_index('ix_application_notes_id', table_name='application_notes')
    op.drop_table('application_notes')
