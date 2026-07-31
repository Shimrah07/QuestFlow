from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.core.config import settings

# Handle database dialect URL normalization (e.g., Render legacy postgres:// -> postgresql://)
db_url = settings.DATABASE_URL
if db_url.startswith("postgres://"):
    db_url = db_url.replace("postgres://", "postgresql://", 1)

# Dialect-specific engine parameters:
# - MS SQL Server (pyodbc): fast_executemany=True for high-performance bulk operations
# - PostgreSQL (psycopg2) & generic SQL: empty connect_args
connect_args = {}
if "mssql" in db_url:
    connect_args = {"fast_executemany": True}

engine = create_engine(
    db_url,
    pool_pre_ping=True,
    pool_size=10,
    max_overflow=20,
    connect_args=connect_args
)

SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine
)
