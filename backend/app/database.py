"""
ZORA AI - Database Configuration
=================================
SQLAlchemy async database setup with PostgreSQL.
"""

from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import declarative_base
from sqlalchemy.pool import NullPool

from app.config import settings


def get_async_database_url(url: str) -> str:
    """Normalize PostgreSQL URLs so SQLAlchemy async always uses asyncpg."""
    if url.startswith("postgresql+asyncpg://"):
        return url
    if url.startswith("postgresql://"):
        return url.replace("postgresql://", "postgresql+asyncpg://", 1)
    if url.startswith("postgres://"):
        return url.replace("postgres://", "postgresql+asyncpg://", 1)
    return url


# Create async engine for PostgreSQL
engine = create_async_engine(
    get_async_database_url(settings.DATABASE_URL),
    echo=settings.ENV == "development",
    poolclass=NullPool,  # Serverless-friendly
    future=True
)

# Async session factory
SessionLocal = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False
)

# Base class for models
Base = declarative_base()


async def get_db() -> AsyncSession:
    """
    Dependency injection for database sessions.
    Usage: async def endpoint(db: AsyncSession = Depends(get_db))
    """
    async with SessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()
