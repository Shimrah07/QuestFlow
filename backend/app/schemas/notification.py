from datetime import datetime, timezone
from typing import Optional
from pydantic import BaseModel, ConfigDict, field_serializer


class NotificationOut(BaseModel):
    id: int
    key: str
    type: str
    title: str
    description: Optional[str] = None
    link: Optional[str] = None
    is_read: bool
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

    @field_serializer("created_at")
    def serialize_created_at(self, value: datetime) -> str:
        # Some databases hand back naive datetimes; they are stored as UTC, so say so explicitly
        # and let the browser convert to local time.
        if value.tzinfo is None:
            value = value.replace(tzinfo=timezone.utc)
        return value.isoformat()


class UnreadCount(BaseModel):
    count: int
