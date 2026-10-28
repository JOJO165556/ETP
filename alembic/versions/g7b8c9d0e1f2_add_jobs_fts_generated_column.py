"""Add FTS generated column search_vector with GIN index on jobs

Revision ID: g7b8c9d0e1f2
Revises: f6a7b8c9d0e1
Create Date: 2026-10-28 03:30:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'g7b8c9d0e1f2'
down_revision: Union[str, Sequence[str], None] = 'f6a7b8c9d0e1'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # Add generated column search_vector with French FTS
    op.execute("""
        ALTER TABLE jobs
        ADD COLUMN search_vector tsvector
        GENERATED ALWAYS AS (
            to_tsvector('french', coalesce(title, '') || ' ' || coalesce(description, ''))
        ) STORED
    """)

    # Create GIN index on search_vector for fast FTS queries
    op.execute("""
        CREATE INDEX ix_jobs_search_vector_gin
        ON jobs USING GIN (search_vector)
    """)


def downgrade() -> None:
    """Downgrade schema."""
    # Drop GIN index
    op.execute('DROP INDEX IF EXISTS ix_jobs_search_vector_gin')

    # Drop generated column
    op.execute('ALTER TABLE jobs DROP COLUMN IF EXISTS search_vector')
