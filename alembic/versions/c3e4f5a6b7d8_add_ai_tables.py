"""Add AI tables (providers, job config, audit)

Revision ID: c3e4f5a6b7d8
Revises: b8d2e3f4a5c6
Create Date: 2026-10-28 11:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision: str = 'c3e4f5a6b7d8'
down_revision: Union[str, Sequence[str], None] = 'b8d2e3f4a5c6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.create_table(
        'ai_provider_configs',
        sa.Column('name', sa.String(length=64), nullable=False),
        sa.Column('provider', sa.String(length=32), nullable=False),
        sa.Column('is_active', sa.Boolean(), server_default=sa.text('true'), nullable=False),
        sa.Column('is_default', sa.Boolean(), server_default=sa.text('false'), nullable=False),
        # Nom de la variable d'environnement : aucune cle en clair en base.
        sa.Column('api_key_ref', sa.String(length=128), nullable=False),
        sa.Column('model_id', sa.String(length=256), nullable=True),
        sa.Column(
            'model_params',
            postgresql.JSONB(astext_type=sa.Text()),
            server_default=sa.text("'{}'::jsonb"),
            nullable=False,
        ),
        sa.Column('supports_extraction', sa.Boolean(), server_default=sa.text('true'), nullable=False),
        sa.Column('supports_matching', sa.Boolean(), server_default=sa.text('true'), nullable=False),
        sa.Column('supports_embeddings', sa.Boolean(), server_default=sa.text('false'), nullable=False),
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('modified_by', sa.String(length=255), nullable=True),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('name', name='uq_ai_provider_configs_name'),
    )
    op.create_index(
        'ix_ai_provider_configs_id', 'ai_provider_configs', ['id'], unique=False
    )
    op.create_index(
        'ix_ai_provider_configs_created_at', 'ai_provider_configs', ['created_at'],
        unique=False,
    )
    # Un seul fournisseur par defaut a la fois.
    op.create_index(
        'ux_ai_provider_configs_default',
        'ai_provider_configs',
        ['is_default'],
        unique=True,
        postgresql_where=sa.text('is_default'),
    )
    op.create_index(
        'ix_ai_provider_configs_provider_active',
        'ai_provider_configs',
        ['provider', 'is_active'],
        unique=False,
    )

    op.create_table(
        'ai_job_configs',
        sa.Column('company_id', sa.UUID(), nullable=True),
        sa.Column('provider_id', sa.UUID(), nullable=True),
        sa.Column('weight_skills', sa.Numeric(precision=4, scale=3), server_default=sa.text('0.600'), nullable=False),
        sa.Column('weight_experience', sa.Numeric(precision=4, scale=3), server_default=sa.text('0.250'), nullable=False),
        sa.Column('weight_education', sa.Numeric(precision=4, scale=3), server_default=sa.text('0.150'), nullable=False),
        sa.Column('threshold_screening', sa.Numeric(precision=5, scale=2), server_default=sa.text('80.00'), nullable=False),
        sa.Column('threshold_reject', sa.Numeric(precision=5, scale=2), server_default=sa.text('25.00'), nullable=False),
        sa.Column('auto_stage_update', sa.Boolean(), server_default=sa.text('true'), nullable=False),
        sa.Column('semantic_matching', sa.Boolean(), server_default=sa.text('false'), nullable=False),
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('modified_by', sa.String(length=255), nullable=True),
        sa.CheckConstraint(
            'abs(weight_skills + weight_experience + weight_education - 1.000) <= 0.001',
            name='ck_ai_job_configs_weights_sum',
        ),
        sa.CheckConstraint(
            'weight_skills >= 0 AND weight_skills <= 1',
            name='ck_ai_job_configs_weight_skills_range',
        ),
        sa.CheckConstraint(
            'weight_experience >= 0 AND weight_experience <= 1',
            name='ck_ai_job_configs_weight_experience_range',
        ),
        sa.CheckConstraint(
            'weight_education >= 0 AND weight_education <= 1',
            name='ck_ai_job_configs_weight_education_range',
        ),
        sa.CheckConstraint(
            'threshold_screening >= 0 AND threshold_screening <= 100',
            name='ck_ai_job_configs_threshold_screening_range',
        ),
        sa.CheckConstraint(
            'threshold_reject >= 0 AND threshold_reject <= 100',
            name='ck_ai_job_configs_threshold_reject_range',
        ),
        sa.CheckConstraint(
            'threshold_reject <= threshold_screening',
            name='ck_ai_job_configs_thresholds_order',
        ),
        sa.ForeignKeyConstraint(['company_id'], ['companies.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['provider_id'], ['ai_provider_configs.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_ai_job_configs_id', 'ai_job_configs', ['id'], unique=False)
    op.create_index(
        'ix_ai_job_configs_created_at', 'ai_job_configs', ['created_at'], unique=False
    )
    op.create_index(
        'ix_ai_job_configs_provider_id', 'ai_job_configs', ['provider_id'], unique=False
    )
    op.create_index(
        'ux_ai_job_configs_company',
        'ai_job_configs',
        ['company_id'],
        unique=True,
        postgresql_where=sa.text('company_id IS NOT NULL'),
    )
    # Index d'expression : une colonne NULL seule ne garantit pas l'unicite.
    op.create_index(
        'ux_ai_job_configs_global',
        'ai_job_configs',
        [sa.text('(company_id IS NULL)')],
        unique=True,
        postgresql_where=sa.text('company_id IS NULL'),
    )

    op.create_table(
        'ai_audit_logs',
        sa.Column('company_id', sa.UUID(), nullable=True),
        sa.Column('provider', sa.String(length=32), nullable=False),
        sa.Column('model_id', sa.String(length=256), nullable=True),
        sa.Column('task_type', sa.String(length=32), nullable=False),
        sa.Column('latency_ms', sa.Integer(), nullable=False),
        sa.Column('status', sa.String(length=32), nullable=False),
        sa.Column('error_message', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('id', sa.UUID(), nullable=False),
        sa.ForeignKeyConstraint(['company_id'], ['companies.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_ai_audit_logs_id', 'ai_audit_logs', ['id'], unique=False)
    op.create_index(
        'ix_ai_audit_logs_created_at', 'ai_audit_logs', ['created_at'], unique=False
    )
    op.create_index(
        'ix_ai_audit_logs_company_created',
        'ai_audit_logs',
        ['company_id', 'created_at'],
        unique=False,
    )
    op.create_index(
        'ix_ai_audit_logs_task_status',
        'ai_audit_logs',
        ['task_type', 'status'],
        unique=False,
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index('ix_ai_audit_logs_task_status', table_name='ai_audit_logs')
    op.drop_index('ix_ai_audit_logs_company_created', table_name='ai_audit_logs')
    op.drop_index('ix_ai_audit_logs_created_at', table_name='ai_audit_logs')
    op.drop_index('ix_ai_audit_logs_id', table_name='ai_audit_logs')
    op.drop_table('ai_audit_logs')

    op.drop_index('ux_ai_job_configs_global', table_name='ai_job_configs')
    op.drop_index('ux_ai_job_configs_company', table_name='ai_job_configs')
    op.drop_index('ix_ai_job_configs_provider_id', table_name='ai_job_configs')
    op.drop_index('ix_ai_job_configs_created_at', table_name='ai_job_configs')
    op.drop_index('ix_ai_job_configs_id', table_name='ai_job_configs')
    op.drop_table('ai_job_configs')

    op.drop_index('ix_ai_provider_configs_provider_active', table_name='ai_provider_configs')
    op.drop_index('ux_ai_provider_configs_default', table_name='ai_provider_configs')
    op.drop_index('ix_ai_provider_configs_created_at', table_name='ai_provider_configs')
    op.drop_index('ix_ai_provider_configs_id', table_name='ai_provider_configs')
    op.drop_table('ai_provider_configs')
