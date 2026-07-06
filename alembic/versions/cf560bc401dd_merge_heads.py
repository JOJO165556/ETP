"""merge_heads

Revision ID: cf560bc401dd
Revises: 8b589d30a079, audit_jsonb_gin
Create Date: 2026-07-05 23:21:19.018866

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'cf560bc401dd'
down_revision: Union[str, Sequence[str], None] = ('8b589d30a079', 'audit_jsonb_gin')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    pass


def downgrade() -> None:
    """Downgrade schema."""
    pass
