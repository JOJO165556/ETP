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
    """Ajouter GITHUB à l'enum PostgreSQL authprovider — idempotent, hors-transaction.

    PostgreSQL interdit ALTER TYPE ... ADD VALUE dans une transaction explicite.
    On obtient une connexion autocommit distincte pour cette opération uniquement.
    """
    # Connexion autocommit isolée — nécessaire pour ALTER TYPE ADD VALUE
    bind = op.get_bind()
    raw_conn = bind.engine.raw_connection()
    raw_conn.set_isolation_level(0)  # AUTOCOMMIT
    try:
        cur = raw_conn.cursor()

        # 1. L'enum authprovider existe-t-il déjà ?
        cur.execute("SELECT 1 FROM pg_type WHERE typname = 'authprovider'")
        enum_exists = cur.fetchone()

        if not enum_exists:
            # Fresh DB : créer l'enum complet avec toutes les valeurs nécessaires
            cur.execute("""
                CREATE TYPE authprovider AS ENUM (
                    'EMAIL', 'GOOGLE', 'FACEBOOK', 'GITHUB', 'PHONE',
                    'email', 'google', 'facebook', 'github', 'phone'
                )
            """)
        else:
            # Enum existant : ajouter GITHUB si absent (IF NOT EXISTS = idempotent)
            cur.execute("ALTER TYPE authprovider ADD VALUE IF NOT EXISTS 'GITHUB'")
            cur.execute("ALTER TYPE authprovider ADD VALUE IF NOT EXISTS 'github'")

        # 2. La table users existe-t-elle ? Auto-répare les colonnes auth manquantes.
        cur.execute("""
            SELECT column_name
            FROM information_schema.columns
            WHERE table_name = 'users' AND table_schema = 'public'
        """)
        cols = {row[0] for row in cur.fetchall()}

        if cols:
            if 'firebase_uid' not in cols:
                cur.execute(
                    "ALTER TABLE users ADD COLUMN IF NOT EXISTS firebase_uid VARCHAR(128)"
                )
                cur.execute(
                    "CREATE UNIQUE INDEX IF NOT EXISTS ix_users_firebase_uid ON users (firebase_uid)"
                )
            if 'auth_provider' not in cols:
                cur.execute(
                    "ALTER TABLE users ADD COLUMN IF NOT EXISTS auth_provider authprovider"
                )

        cur.close()
    finally:
        raw_conn.close()


def downgrade() -> None:
    """PostgreSQL ne permet pas de supprimer une valeur d'enum sans recréer le type."""
    pass
