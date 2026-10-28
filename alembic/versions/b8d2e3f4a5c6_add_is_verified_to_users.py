"""Add is_verified to users

Revision ID: b8d2e3f4a5c6
Revises: a7c1f2d3e4b5
Create Date: 2026-10-28 10:05:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'b8d2e3f4a5c6'
down_revision: Union[str, Sequence[str], None] = 'a7c1f2d3e4b5'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema.

    Les comptes existants sont consideres comme verifies (grandfathering) afin
    de ne pas provoquer une indisponibilite generale au deploiement. Seules les
    nouvelles inscriptions passent par le parcours de verification obligatoire.
    """
    op.add_column(
        'users',
        sa.Column(
            'is_verified',
            sa.Boolean(),
            server_default=sa.text('false'),
            nullable=False,
        ),
    )
    op.execute("UPDATE users SET is_verified = true")


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column('users', 'is_verified')
