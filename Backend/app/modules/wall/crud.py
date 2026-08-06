"""
DonApp API — Wall Module: CRUD Operations.

Provides async database operations for posts and comments.
All functions receive an ``AsyncSession`` injected via FastAPI dependency.
"""

import uuid
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.auth.models import User
from app.modules.wall.models import Comment, Post
from app.modules.wall.schemas import CommentCreate, CommentUpdate, PostCreate, PostUpdate


async def get_posts(
    db: AsyncSession,
    skip: int = 0,
    limit: int = 20,
) -> list[Post]:
    """
    Retrieve paginated wall posts with nested comments and authors.

    Args:
        db: Active async database session.
        skip: Number of records to skip (offset).
        limit: Maximum number of posts to return.

    Returns:
        List of ``Post`` instances ordered by created_at descending.
    """
    stmt = (
        select(Post)
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

    Args:
        db: Active async database session.
        post_in: Validated post creation payload.
        author: The authenticated user creating the post.

    Returns:
        The newly created ``Post`` instance.
    """
    db_post = Post(
        author_id=author.id,
        content=post_in.content,
        type=post_in.type,
        media_url=post_in.media_url,
        media_type=post_in.media_type,
    )
    db.add(db_post)
    await db.commit()
    await db.refresh(db_post)
    return db_post


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
    """Retrieve a single post by ID."""
    stmt = select(Post).where(Post.id == post_id)
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
