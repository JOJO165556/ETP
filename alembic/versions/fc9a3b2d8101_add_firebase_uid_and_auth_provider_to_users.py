"""Add firebase_uid and auth_provider to users

Revision ID: fc9a3b2d8101
Revises: e9ea1c94e7aa
Create Date: 2026-09-05 20:10:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'fc9a3b2d8101'
down_revision: Union[str, Sequence[str], None] = 'e9ea1c94e7aa'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # Enum du fournisseur d'identite (Firebase)
    auth_provider = sa.Enum(
        'EMAIL', 'GOOGLE', 'FACEBOOK', 'PHONE',
        name='authprovider',
    )
    auth_provider.create(op.get_bind(), checkfirst=True)

    op.add_column('users', sa.Column('firebase_uid', sa.String(length=128), nullable=True))
    op.add_column('users', sa.Column('auth_provider', auth_provider, nullable=True))
    op.create_index(op.f('ix_users_firebase_uid'), 'users', ['firebase_uid'], unique=True)


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index(op.f('ix_users_firebase_uid'), table_name='users')
    op.drop_column('users', 'auth_provider')
    op.drop_column('users', 'firebase_uid')

    sa.Enum(
        'EMAIL', 'GOOGLE', 'FACEBOOK', 'PHONE',
        name='authprovider',
    ).drop(op.get_bind(), checkfirst=True)