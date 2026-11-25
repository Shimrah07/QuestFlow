import asyncio
import json
import time
from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from fastapi.concurrency import run_in_threadpool
from fastapi.responses import StreamingResponse
from sqlalchemy import select, update, delete, func
from sqlalchemy.orm import Session
from app.core.deps import get_db, get_current_user, oauth2_scheme
from app.db.session import SessionLocal
from app.models.notification import Notification
from app.models.user import User
from app.schemas.notification import NotificationOut, UnreadCount
from app.services.notification_service import NotificationService

router = APIRouter()

STREAM_POLL_SECONDS = 3
STREAM_MAX_SECONDS = 240  # the client reconnects (with a fresh token); keeps deploys and reloads from hanging
DEADLINE_CHECK_EVERY = 60


@router.get("/", response_model=list[NotificationOut])
def list_notifications(
    limit: int = Query(50, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """The signed-in user's notifications, newest first. Also adds any new deadline reminders."""
    NotificationService.deadline_notifications(db, current_user)
    return db.scalars(
        select(Notification).where(Notification.user_id == current_user.id).order_by(Notification.id.desc()).limit(limit)
    ).all()


@router.get("/unread-count", response_model=UnreadCount)
def unread_count(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    count = db.scalar(
        select(func.count(Notification.id)).where(Notification.user_id == current_user.id, Notification.is_read == False)  # noqa: E712
    )
    return {"count": count or 0}


@router.put("/read-all", response_model=UnreadCount)
def mark_all_read(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    db.execute(update(Notification).where(Notification.user_id == current_user.id).values(is_read=True))
    db.commit()
    return {"count": 0}


@router.put("/{notification_id}/read", response_model=NotificationOut)
def mark_read(notification_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    notification = db.get(Notification, notification_id)
    # Someone else's notification looks the same as a missing one.
    if not notification or notification.user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Notification not found.")
    notification.is_read = True
    db.commit()
    db.refresh(notification)
    return notification


@router.delete("/", status_code=status.HTTP_204_NO_CONTENT)
def clear_all(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    db.execute(delete(Notification).where(Notification.user_id == current_user.id))
    db.commit()
    return None


def _new_since(user_id: int, after_id: int) -> list[dict]:
    with SessionLocal() as db:
        rows = db.scalars(
            select(Notification).where(Notification.user_id == user_id, Notification.id > after_id).order_by(Notification.id).limit(25)
        ).all()
        return [NotificationOut.model_validate(n).model_dump(mode="json") for n in rows]


def _deadline_check(user_id: int) -> None:
    with SessionLocal() as db:
        user = db.get(User, user_id)
        if user and user.is_active:
            NotificationService.deadline_notifications(db, user)


def stream_user_id(token: str = Depends(oauth2_scheme)) -> int:
    """
    Authenticates the stream in its own short session that is closed straight away.

    The usual get_current_user dependency borrows the request's session, which FastAPI keeps open
    until the response ends. For a stream that lasts minutes, that would hold a database
    connection and an open transaction (and its table locks) for the whole stream.
    """
    with SessionLocal() as db:
        return get_current_user(db=db, token=token).id


@router.get("/stream")
async def stream(request: Request, after: int = Query(0, ge=0), user_id: int = Depends(stream_user_id)):
    """
    Server-sent events: pushes each new notification for the signed-in user as it is created.
    The stream ends after a few minutes and the browser reconnects, re-authenticating each time.
    Each check uses its own brief database session, so an open stream holds no connection.
    """

    async def events():
        last_id = after
        started = last_deadline_check = time.monotonic()
        yield "retry: 3000\n\n"
        while time.monotonic() - started < STREAM_MAX_SECONDS:
            if await request.is_disconnected():
                return
            if time.monotonic() - last_deadline_check >= DEADLINE_CHECK_EVERY:
                await run_in_threadpool(_deadline_check, user_id)
                last_deadline_check = time.monotonic()
            for item in await run_in_threadpool(_new_since, user_id, last_id):
                last_id = max(last_id, item["id"])
                yield f"event: notification\ndata: {json.dumps(item)}\n\n"
            yield ": ping\n\n"  # keeps proxies from closing an idle connection
            await asyncio.sleep(STREAM_POLL_SECONDS)

    return StreamingResponse(
        events(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no", "Connection": "keep-alive"},
    )
