"""Add GITHUB to authprovider enum

Revision ID: i9d0e1f2g3h4
Revises: h8c9d0e1f2g3
Create Date: 2026-11-03 22:15:00.000000

"""
from typing import Sequence, Union

from alembic import op


# revision identifiers, used by Alembic.
revision: str = 'i9d0e1f2g3h4'
down_revision: Union[str, Sequence[str], None] = 'h8c9d0e1f2g3'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Ajouter GITHUB à l'enum PostgreSQL authprovider."""
    # En PostgreSQL, l'ajout d'une valeur à un enum existant se fait via ALTER TYPE
    op.execute("ALTER TYPE authprovider ADD VALUE IF NOT EXISTS 'GITHUB';")
    op.execute("ALTER TYPE authprovider ADD VALUE IF NOT EXISTS 'github';")


def downgrade() -> None:
    """PostgreSQL ne permet pas de supprimer directement une valeur d'enum sans recréer le type."""
    pass

