import uuid
from sqlalchemy import Boolean, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base_class import Base

class Neighborhood(Base):
    """
    Represents a neighborhood or sector within a specific city.
    
    Attributes:
        id: Unique identifier (UUID).
        name: Name of the neighborhood.
        city_identifier: The name of the city this neighborhood belongs to.
        is_verified: Whether this neighborhood was officially verified (True) or added by a user (False).
    """
    __tablename__ = "neighborhoods"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
        nullable=False,
    )
    name: Mapped[str] = mapped_column(
        String(150),
        nullable=False,
    )
    city_identifier: Mapped[str] = mapped_column(
        String(100),
        index=True,
        nullable=False,
    )
    is_verified: Mapped[bool] = mapped_column(
        Boolean,
        default=True,
        server_default="true",
        nullable=False,
    )
