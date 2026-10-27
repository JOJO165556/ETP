"""Add profile visibility columns (is_profile_public, is_searchable)

Revision ID: a1b2c3d4e5f6
Revises: fc9a3b2d8101
Create Date: 2026-09-07 14:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'a1b2c3d4e5f6'
down_revision: Union[str, Sequence[str], None] = 'fc9a3b2d8101'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column('user_profiles', sa.Column('is_profile_public', sa.Boolean(), server_default=sa.text('true'), nullable=False))
    op.add_column('user_profiles', sa.Column('is_searchable', sa.Boolean(), server_default=sa.text('true'), nullable=False))


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column('user_profiles', 'is_searchable')
    op.drop_column('user_profiles', 'is_profile_public')