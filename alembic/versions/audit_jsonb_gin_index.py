"""ajout index gin jsonb skills et required_skills

Revision ID: audit_jsonb_gin
Revises: 02dff9694c55
Create Date: 2026-06-24

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers
revision = "audit_jsonb_gin"
down_revision = "02dff9694c55"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Index GIN sur profiles.skills pour des recherches JSONB performantes
    op.execute(
        "CREATE INDEX IF NOT EXISTS idx_profiles_skills_gin "
        "ON profiles USING GIN (skills jsonb_path_ops)"
    )
    # Index GIN sur jobs.required_skills pour des recherches JSONB performantes
    op.execute(
        "CREATE INDEX IF NOT EXISTS idx_jobs_required_skills_gin "
        "ON jobs USING GIN (required_skills jsonb_path_ops)"
    )


def downgrade() -> None:
    op.drop_index("idx_profiles_skills_gin", table_name="profiles")
    op.drop_index("idx_jobs_required_skills_gin", table_name="jobs")
