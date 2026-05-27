from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.core.config import settings

# Engine configuration for MS SQL Server using pyodbc
# pool_pre_ping=True: Recovers from dropped connections gracefully
# fast_executemany=True: Speeds up bulk inserts considerably when using pyodbc
connect_args = {}
if "mssql" in settings.DATABASE_URL:
    connect_args = {"fast_executemany": True}

engine = create_engine(
    settings.DATABASE_URL,
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
