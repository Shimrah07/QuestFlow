from sqlalchemy.orm import DeclarativeBase

class Base(DeclarativeBase):
    """
    SQLAlchemy 2.0 style Modern Declarative Base.
    All database models will inherit from this class.
    """
    pass
