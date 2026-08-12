"""
Quick empirical check: does PostResponse.model_validate(post) work in async
with lazy="selectin" relationships (author), without MissingGreenlet?
"""

import pytest
from sqlalchemy import select

from app.modules.auth.models import User
from app.modules.wall.crud import create_post
from app.modules.wall.models import Post
from app.modules.wall.schemas import PostCreate, PostResponse


async def test_serialize_created_post(db_session):
    user = User(
        email="emp@example.com",
        full_name="Emp Test",
        hashed_password="x",
        is_active=True,
    )
    db_session.add(user)
    await db_session.commit()

    post = await create_post(
        db_session,
        PostCreate(content="Hola", type="Testimonio"),
        user,
    )

    assert post is not None
    serialized = PostResponse.model_validate(post)
    assert serialized.content == "Hola"
    assert serialized.author.full_name == "Emp Test"


async def test_serialize_listed_post(db_session):
    user = User(
        email="emp2@example.com",
        full_name="Emp Two",
        hashed_password="x",
        is_active=True,
    )
    db_session.add(user)
    await db_session.commit()
    await create_post(db_session, PostCreate(content="Uno"), user)

    stmt = select(Post)
    result = await db_session.execute(stmt)
    loaded = list(result.scalars().all())

    serialized = PostResponse.model_validate(loaded[0])
    assert serialized.content == "Uno"
    assert serialized.author.full_name == "Emp Two"