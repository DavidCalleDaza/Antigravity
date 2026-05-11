"""
Servinow API — Declarative Base Class.

All ORM models must inherit from Base so that Alembic can discover
them automatically for migration auto-generation.
"""

from sqlalchemy.orm import DeclarativeBase


class Base(DeclarativeBase):
    """
    SQLAlchemy declarative base for all Servinow ORM models.

    Extend this class when defining new database tables::

        class User(Base):
            __tablename__ = "users"
            id: Mapped[int] = mapped_column(primary_key=True)
    """

    pass
