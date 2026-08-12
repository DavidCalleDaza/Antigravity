"""
DonApp API — Wall Module: CRUD Operations.

Provides async database operations for posts and comments.
All functions receive an ``AsyncSession`` injected via FastAPI dependency.
"""

import secrets
import uuid
from datetime import datetime, timezone

from sqlalchemy import exists, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.modules.auth.models import User
from app.modules.billing.models import Invoice
from app.modules.products.models import Product
from app.modules.services.models import Service
from app.modules.wall.models import Comment, Post, PostCustomerMention, PostMedia
from app.modules.wall.schemas import CommentCreate, CommentUpdate, PostCreate, PostUpdate


class CustomerMentionError(ValueError):
    """Raised when a customer mention cannot be created (not owned / not found)."""


def _post_load_options() -> tuple:
    """
    Build eager-load options for post queries.

    Constructed per-call (not at import time): touching mapped attributes at
    module import triggers a global mapper configuration pass, which fails if
    some models (e.g. country_settings) have not been imported yet.
    """
    return (
        selectinload(Post.author),
        selectinload(Post.comments).selectinload(Comment.author),
        selectinload(Post.media),
        selectinload(Post.customer_mentions).selectinload(PostCustomerMention.customer),
        selectinload(Post.product),
        selectinload(Post.service),
    )


async def get_posts(
    db: AsyncSession,
    skip: int = 0,
    limit: int = 20,
) -> list[Post]:
    """
    Retrieve paginated wall posts with nested comments, authors, media,
    customer mentions and linked product/service.
    """
    stmt = (
        select(Post)
        .options(*_post_load_options())
        .order_by(Post.created_at.desc())
        .offset(skip)
        .limit(limit)
    )
    result = await db.execute(stmt)
    return list(result.scalars().all())


async def create_post(
    db: AsyncSession,
    post_in: PostCreate,
    author: User,
) -> Post:
    """
    Create a new wall post.

    Validates that at most one of product_id/service_id is set and that the
    referenced product/service exists and belongs to the author. Creates
    related ``PostMedia`` and ``PostCustomerMention`` rows when provided.
    """
    if post_in.product_id is not None:
        product = await db.get(Product, post_in.product_id)
        if product is None:
            raise ValueError(f"Product {post_in.product_id} not found.")
        if product.user_id is None or product.user_id != author.id:
            raise ValueError("No autorizado: el producto no pertenece al usuario.")
        post_in.service_id = None

    if post_in.service_id is not None:
        service = await db.get(Service, post_in.service_id)
        if service is None:
            raise ValueError(f"Service {post_in.service_id} not found.")
        if service.user_id is None or service.user_id != author.id:
            raise ValueError("No autorizado: el servicio no pertenece al usuario.")

    db_post = Post(
        author_id=author.id,
        content=post_in.content,
        type=post_in.type,
        media_url=post_in.media_url,
        media_type=post_in.media_type,
        product_id=post_in.product_id,
        service_id=post_in.service_id,
    )
    db.add(db_post)
    await db.flush()

    if post_in.media_url:
        db.add(
            PostMedia(
                post_id=db_post.id,
                media_url=post_in.media_url,
                media_type=post_in.media_type,
                position=0,
            )
        )

    for customer_id in post_in.customer_ids:
        owned = await db.execute(
            select(exists().where(
                Invoice.customer_id == customer_id,
                Invoice.user_id == author.id,
            ))
        )
        if not owned.scalar_one():
            raise CustomerMentionError(
                f"Cliente {customer_id} no pertenece al usuario o no existe."
            )
        db.add(
            PostCustomerMention(
                post_id=db_post.id,
                customer_id=customer_id,
                mentioned_by_user_id=author.id,
                status="pending",
                confirm_token=secrets.token_urlsafe(32),
            )
        )

    await db.commit()

    # Re-query with eager loads so response serialization never triggers a
    # lazy load (avoids MissingGreenlet on async sessions).
    stmt = select(Post).options(*_post_load_options()).where(Post.id == db_post.id)
    result = await db.execute(stmt)
    return result.scalar_one()


async def create_comment(
    db: AsyncSession,
    post_id: uuid.UUID,
    comment_in: CommentCreate,
    author: User,
) -> Comment:
    """
    Create a new comment on an existing wall post.

    Args:
        db: Active async database session.
        post_id: UUID of the target post.
        comment_in: Validated comment creation payload.
        author: The authenticated user creating the comment.

    Returns:
        The newly created ``Comment`` instance.

    Raises:
        ValueError: If the target post does not exist.
    """
    stmt = select(Post).where(Post.id == post_id)
    result = await db.execute(stmt)
    post = result.scalar_one_or_none()
    if post is None:
        raise ValueError(f"Post {post_id} not found.")

    db_comment = Comment(
        post_id=post_id,
        author_id=author.id,
        content=comment_in.content,
        media_url=comment_in.media_url,
        media_type=comment_in.media_type,
    )
    db.add(db_comment)
    await db.commit()
    await db.refresh(db_comment)
    return db_comment


async def get_post(db: AsyncSession, post_id: uuid.UUID) -> Post | None:
    """Retrieve a single post by ID, eager-loading related data."""
    stmt = select(Post).options(*_post_load_options()).where(Post.id == post_id)
    result = await db.execute(stmt)
    return result.scalar_one_or_none()


async def update_post(
    db: AsyncSession,
    db_post: Post,
    post_in: PostUpdate,
) -> Post:
    """Update an existing post."""
    update_data = post_in.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(db_post, field, value)
    db_post.is_edited = True
    db.add(db_post)
    await db.commit()
    await db.refresh(db_post)
    return db_post


async def delete_post(db: AsyncSession, db_post: Post) -> None:
    """Delete a post."""
    await db.delete(db_post)
    await db.commit()


async def get_comment(db: AsyncSession, comment_id: uuid.UUID) -> Comment | None:
    """Retrieve a single comment by ID."""
    stmt = select(Comment).where(Comment.id == comment_id)
    result = await db.execute(stmt)
    return result.scalar_one_or_none()


async def update_comment(
    db: AsyncSession,
    db_comment: Comment,
    comment_in: CommentUpdate,
) -> Comment:
    """Update an existing comment."""
    update_data = comment_in.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(db_comment, field, value)
    db_comment.is_edited = True
    db.add(db_comment)
    await db.commit()
    await db.refresh(db_comment)
    return db_comment


async def delete_comment(db: AsyncSession, db_comment: Comment) -> None:
    """Delete a comment."""
    await db.delete(db_comment)
    await db.commit()


# --- Media (Fase 1b) ---


async def add_post_media(
    db: AsyncSession,
    post_id: uuid.UUID,
    media_url: str,
    media_type: str | None = None,
) -> PostMedia:
    """Attach a media row to a post, appending at the end of the order."""
    stmt = select(PostMedia).where(PostMedia.post_id == post_id)
    result = await db.execute(stmt)
    existing = list(result.scalars().all())
    position = max((m.position for m in existing), default=-1) + 1
    db_media = PostMedia(
        post_id=post_id,
        media_url=media_url,
        media_type=media_type,
        position=position,
    )
    db.add(db_media)
    await db.commit()
    await db.refresh(db_media)
    return db_media


async def get_post_media(db: AsyncSession, media_id: uuid.UUID) -> PostMedia | None:
    """Retrieve a single media row by ID."""
    return await db.get(PostMedia, media_id)


async def delete_post_media(db: AsyncSession, db_media: PostMedia) -> None:
    """Delete a media row."""
    await db.delete(db_media)
    await db.commit()


# --- Customer mentions (Fase 2) ---


async def get_mention_by_token(db: AsyncSession, token: str) -> PostCustomerMention | None:
    """Retrieve a mention by its single-use confirm token, eager-loading the
    related post (with author) and customer."""
    stmt = (
        select(PostCustomerMention)
        .options(
            selectinload(PostCustomerMention.post).selectinload(Post.author),
            selectinload(PostCustomerMention.customer),
        )
        .where(PostCustomerMention.confirm_token == token)
    )
    result = await db.execute(stmt)
    return result.scalar_one_or_none()


async def respond_to_mention(
    db: AsyncSession,
    mention: PostCustomerMention,
    action: str,
) -> PostCustomerMention:
    """Record a customer response on a mention and invalidate the token."""
    mention.status = "confirmed" if action == "confirm" else "declined"
    mention.responded_at = datetime.now(timezone.utc)
    mention.confirm_token = None
    db.add(mention)
    await db.commit()
    return mention
