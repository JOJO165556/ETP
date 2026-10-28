from sqlalchemy import text

from src.core.celery_app import celery_app
from src.core.database import get_db


@celery_app.task
def refresh_company_kpis():
    """Refresh the materialized view mv_company_recruitment_kpis concurrently."""
    import asyncio

    async def _refresh():
        async for db in get_db():
            try:
                await db.execute(
                    text("REFRESH MATERIALIZED VIEW CONCURRENTLY mv_company_recruitment_kpis")
                )
                await db.commit()
                return {"status": "success", "message": "KPIs refreshed successfully"}
            except Exception as e:
                await db.rollback()
                return {"status": "error", "message": str(e)}

    return asyncio.run(_refresh())


@celery_app.task
def refresh_company_kpis_scheduled():
    """Scheduled task to refresh KPIs every hour."""
    return refresh_company_kpis()
