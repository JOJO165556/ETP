"""add experiences and formations tables

Revision ID: 5f7a9c1d2e3b4a6c8f0d1e2a3b4c5d6e
Revises: a1b2c3d4e5f6
Create Date: 2026-09-07 10:00:00.000000
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "5f7a9c1d2e3b4a6c8f0d1e2a3b4c5d6e"
down_revision: Union[str, None] = "a1b2c3d4e5f6"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "experiences",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("profile_id", sa.Uuid(), nullable=False),
        sa.Column("entreprise", sa.String(length=255), nullable=False),
        sa.Column("poste", sa.String(length=255), nullable=False),
        sa.Column("type_contrat", sa.String(length=50), nullable=True),
        sa.Column("date_debut", sa.Date(), nullable=False),
        sa.Column("date_fin", sa.Date(), nullable=True),
        sa.Column("en_cours", sa.Boolean(), server_default='false', nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("ordre", sa.Integer(), server_default='0', nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column("modified_by", sa.String(length=255), nullable=True),
        sa.Column("is_deleted", sa.Boolean(), server_default='false', nullable=False),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(["profile_id"], ["user_profiles.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_experiences_profile_id", "experiences", ["profile_id"])

    op.create_table(
        "formations",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("profile_id", sa.Uuid(), nullable=False),
        sa.Column("etablissement", sa.String(length=255), nullable=False),
        sa.Column("diplome", sa.String(length=255), nullable=False),
        sa.Column("domaine", sa.String(length=255), nullable=True),
        sa.Column("annee", sa.Integer(), nullable=False),
        sa.Column("ordre", sa.Integer(), server_default='0', nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column("modified_by", sa.String(length=255), nullable=True),
        sa.Column("is_deleted", sa.Boolean(), server_default='false', nullable=False),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(["profile_id"], ["user_profiles.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_formations_profile_id", "formations", ["profile_id"])


def downgrade() -> None:
    op.drop_index("ix_formations_profile_id", table_name="formations")
    op.drop_table("formations")
    op.drop_index("ix_experiences_profile_id", table_name="experiences")
    op.drop_table("experiences")