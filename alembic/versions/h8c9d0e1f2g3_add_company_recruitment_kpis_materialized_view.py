"""Add materialized view mv_company_recruitment_kpis with concurrent refresh

Revision ID: h8c9d0e1f2g3
Revises: g7b8c9d0e1f2
Create Date: 2026-10-28 04:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'h8c9d0e1f2g3'
down_revision: Union[str, Sequence[str], None] = 'g7b8c9d0e1f2'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # Create materialized view for company recruitment KPIs
    op.execute("""
        CREATE MATERIALIZED VIEW mv_company_recruitment_kpis AS
        SELECT
            j.company_id,
            COUNT(DISTINCT j.id) AS total_jobs,
            COUNT(DISTINCT CASE WHEN j.status::text IN ('ACTIVE', 'active') THEN j.id END) AS active_jobs,
            COUNT(DISTINCT a.id) AS total_applications,
            COUNT(DISTINCT CASE WHEN a.stage::text IN ('APPLIED', 'applied') THEN a.id END) AS stage_applied_count,
            COUNT(DISTINCT CASE WHEN a.stage::text IN ('SCREENING', 'screening') THEN a.id END) AS stage_screening_count,
            COUNT(DISTINCT CASE WHEN a.stage::text IN ('INTERVIEW', 'interview') THEN a.id END) AS stage_interview_count,
            COUNT(DISTINCT CASE WHEN a.stage::text IN ('OFFER', 'offer') THEN a.id END) AS stage_offer_count,
            COUNT(DISTINCT CASE WHEN a.stage::text IN ('HIRED', 'hired') THEN a.id END) AS stage_hired_count,
            COUNT(DISTINCT CASE WHEN a.stage::text IN ('REJECTED', 'rejected') THEN a.id END) AS stage_rejected_count,
            ROUND(AVG(a.matching_score)::numeric, 2) AS avg_match_score,
            ROUND(
                AVG(EXTRACT(EPOCH FROM (sh.created_at - a.created_at)) / 86400)
                FILTER (WHERE sh.to_stage::text IN ('HIRED', 'hired'))::numeric,
                1
            ) AS avg_time_to_hire_days,
            NOW() AS refreshed_at
        FROM jobs j
        LEFT JOIN applications a ON a.job_id = j.id
        LEFT JOIN application_stage_history sh ON sh.application_id = a.id AND sh.to_stage::text IN ('HIRED', 'hired')
        GROUP BY j.company_id
    """)

    # Create unique index for concurrent refresh
    op.execute("""
        CREATE UNIQUE INDEX uq_mv_company_kpis_company_id
        ON mv_company_recruitment_kpis (company_id)
    """)


def downgrade() -> None:
    """Downgrade schema."""
    # Drop materialized view
    op.execute('DROP MATERIALIZED VIEW IF EXISTS mv_company_recruitment_kpis')
