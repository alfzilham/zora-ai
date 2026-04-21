"""
ZORA AI - Chat Router
=====================
Chat endpoints for conversations, messages, and streaming responses.
"""

import json
import uuid
from typing import AsyncGenerator, Optional

from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field, field_validator
from sqlalchemy import delete
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.database import get_db
from app.middleware.auth_middleware import get_current_user
from app.models.chat import Conversation, Message
from app.models.memory import Memory
from app.models.user import User, UserProfile
from app.services.intent_detector import detect_intent
from app.services.orchestrator import build_prethink_messages, stream_response
from app.utils.rate_limit import limiter, user_or_ip_key

router = APIRouter()


def api_success(data: dict, message: str) -> dict:
    return {
        "status": "success",
        "success": True,
        "data": data,
        "message": message,
    }


def build_conversation_title(message: str, max_length: int = 60) -> str:
    """Create a short title from the first user message."""
    cleaned = " ".join((message or "").split()).strip() or "New Chat"
    if len(cleaned) <= max_length:
        return cleaned
    return f"{cleaned[: max_length - 3].rstrip()}..."


def should_persist_conversation(
    conversation: Optional[Conversation],
    incognito_override: bool = False,
) -> bool:
    """Decide whether conversation data should be written to the database."""
    if incognito_override:
        return False
    if conversation and conversation.is_incognito:
        return False
    return True


def format_sse_event(event: str, data: dict) -> str:
    """Format an SSE event payload."""
    return f"event: {event}\ndata: {json.dumps(data)}\n\n"


class NewConversationRequest(BaseModel):
    is_incognito: bool = False


class ChatSendRequest(BaseModel):
    conversation_id: Optional[str] = None
    message: str = Field(..., min_length=1)
    extended_thinking: bool = False
    incognito: bool = False

    @field_validator("message")
    @classmethod
    def validate_message(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("Message is required")
        return value


async def get_conversation_for_user(
    db: AsyncSession,
    user_id,
    conversation_id: str,
) -> Conversation | None:
    try:
        conversation_uuid = uuid.UUID(str(conversation_id))
    except ValueError:
        return None

    result = await db.execute(
        select(Conversation).where(
            Conversation.id == conversation_uuid,
            Conversation.user_id == user_id,
        )
    )
    return result.scalar_one_or_none()


async def get_user_memory(db: AsyncSession, user_id) -> dict:
    """Load personalization memory for the current user."""
    memory = {
        "user_name": None,
        "user_topics": [],
        "user_language": "id",
    }

    memory_result = await db.execute(select(Memory).where(Memory.user_id == user_id))
    for entry in memory_result.scalars().all():
        if entry.key == "user_name":
            memory["user_name"] = entry.value
        elif entry.key == "user_topics":
            try:
                memory["user_topics"] = json.loads(entry.value)
            except json.JSONDecodeError:
                memory["user_topics"] = []

    profile_result = await db.execute(select(UserProfile).where(UserProfile.user_id == user_id))
    profile = profile_result.scalar_one_or_none()
    if profile and profile.language:
        memory["user_language"] = profile.language
        if not memory["user_name"] and profile.display_name:
            memory["user_name"] = profile.display_name
        if not memory["user_topics"] and profile.topics:
            memory["user_topics"] = profile.topics

    return memory


async def load_conversation_messages(db: AsyncSession, conversation_id) -> list[Message]:
    result = await db.execute(
        select(Message)
        .where(Message.conversation_id == conversation_id)
        .order_by(Message.created_at.asc())
    )
    return result.scalars().all()


async def ensure_conversation(
    db: AsyncSession,
    user_id,
    request: ChatSendRequest,
) -> tuple[Conversation | None, str]:
    """Fetch or create a conversation for a send request."""
    if request.incognito:
        ephemeral_id = request.conversation_id or f"incognito-{uuid.uuid4()}"
        return None, ephemeral_id

    if request.conversation_id:
        conversation = await get_conversation_for_user(db, user_id, request.conversation_id)
        if conversation is None:
            raise HTTPException(status_code=404, detail="Conversation not found")
        return conversation, str(conversation.id)

    conversation = Conversation(user_id=user_id, is_incognito=False)
    db.add(conversation)
    await db.flush()
    return conversation, str(conversation.id)


@router.post("/new")
async def create_new_conversation(
    request: NewConversationRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Create a new conversation or return an ephemeral incognito id."""
    try:
        if request.is_incognito:
            return api_success(
                {"conversation_id": f"incognito-{uuid.uuid4()}", "is_incognito": True},
                "Incognito session started",
            )

        conversation = Conversation(user_id=current_user.id, is_incognito=False)
        db.add(conversation)
        await db.flush()

        return api_success(
            {"conversation_id": str(conversation.id), "is_incognito": False},
            "Conversation created successfully",
        )
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Failed to create conversation: {exc}") from exc


@router.get("/history")
async def get_history(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Return conversation history for the current user."""
    try:
        result = await db.execute(
            select(Conversation)
            .where(Conversation.user_id == current_user.id)
            .order_by(Conversation.created_at.desc())
        )
        conversations = [
            {
                **conversation.to_dict(),
                "title": conversation.title or "New Chat",
            }
            for conversation in result.scalars().all()
        ]
        return api_success({"conversations": conversations}, "Conversation history retrieved successfully")
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Failed to load history: {exc}") from exc


@router.get("/{conversation_id}/messages")
async def get_messages(
    conversation_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Return all messages for a conversation owned by the current user."""
    try:
        conversation = await get_conversation_for_user(db, current_user.id, conversation_id)
        if conversation is None:
            raise HTTPException(status_code=404, detail="Conversation not found")

        messages = [message.to_dict() for message in await load_conversation_messages(db, conversation.id)]
        return api_success(
            {
                "conversation": {
                    **conversation.to_dict(),
                    "title": conversation.title or "New Chat",
                },
                "messages": messages,
            },
            "Messages retrieved successfully",
        )
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Failed to load messages: {exc}") from exc


@router.delete("/{conversation_id}")
async def delete_conversation(
    conversation_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Delete a conversation and its messages."""
    try:
        conversation = await get_conversation_for_user(db, current_user.id, conversation_id)
        if conversation is None:
            raise HTTPException(status_code=404, detail="Conversation not found")

        await db.execute(delete(Message).where(Message.conversation_id == conversation.id))
        await db.delete(conversation)

        return api_success({"conversation_id": conversation_id}, "Conversation deleted successfully")
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Failed to delete conversation: {exc}") from exc


@router.post("/send")
@limiter.limit("30/minute", key_func=user_or_ip_key)
async def send_message(
    request: Request,
    payload: ChatSendRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Main streaming chat endpoint."""
    try:
        conversation, conversation_id = await ensure_conversation(db, current_user.id, payload)
        persist_to_db = should_persist_conversation(conversation, payload.incognito)
        user_memory = {} if payload.incognito else await get_user_memory(db, current_user.id)

        history_messages: list[dict] = []
        existing_messages: list[Message] = []
        if persist_to_db and conversation is not None:
            existing_messages = await load_conversation_messages(db, conversation.id)
            history_messages = [message.to_dict() for message in existing_messages]

        routing_decision = await detect_intent(payload.message)
        primary_model = routing_decision["primary_model"]

        chat_messages = [
            {"role": message["role"], "content": message["content"]}
            for message in history_messages
        ]
        chat_messages.append({"role": "user", "content": payload.message})

        if payload.extended_thinking or routing_decision.get("pre_think"):
            prethink_summary = await build_prethink_messages(chat_messages)
            chat_messages.insert(
                max(len(chat_messages) - 1, 0),
                {
                    "role": "system",
                    "content": f"Internal reasoning summary:\n{prethink_summary}",
                },
            )

        async def event_stream() -> AsyncGenerator[str, None]:
            assistant_text_parts: list[str] = []

            try:
                if persist_to_db and conversation is not None:
                    if conversation.title is None and not existing_messages:
                        conversation.title = build_conversation_title(payload.message)
                        await db.flush()

                    user_message = Message(
                        conversation_id=conversation.id,
                        role="user",
                        content=payload.message,
                        model_used=None,
                    )
                    db.add(user_message)
                    await db.flush()

                yield format_sse_event(
                    "metadata",
                    {
                        "conversation_id": conversation_id,
                        "model": primary_model,
                        "title": conversation.title if conversation else "Incognito Chat",
                    },
                )

                async for chunk in stream_response(
                    model_name=primary_model,
                    messages=chat_messages,
                    user_memory=user_memory,
                ):
                    assistant_text_parts.append(chunk)
                    yield format_sse_event("chunk", {"delta": chunk})

                assistant_text = "".join(assistant_text_parts).strip()

                if persist_to_db and conversation is not None:
                    assistant_message = Message(
                        conversation_id=conversation.id,
                        role="assistant",
                        content=assistant_text,
                        model_used=primary_model,
                    )
                    db.add(assistant_message)
                    await db.flush()

                yield format_sse_event(
                    "done",
                    {
                        "conversation_id": conversation_id,
                        "model": primary_model,
                        "message": assistant_text,
                    },
                )
            except Exception as exc:
                yield format_sse_event("error", {"message": str(exc)})

        return StreamingResponse(event_stream(), media_type="text/event-stream")
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Failed to send message: {exc}") from exc
